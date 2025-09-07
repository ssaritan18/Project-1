#!/usr/bin/env python3
"""
Comment System Integration Test - Specific Request
"""

import requests
import json
import sys
import os
import uuid
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone

# Base URL from frontend .env
BASE_URL = "https://play-compliant.preview.emergentagent.com/api"

class CommentTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        
    def log(self, message: str, level: str = "INFO"):
        print(f"[{level}] {message}")
        
    def cleanup_user_by_email(self, email: str) -> bool:
        """Clean up existing user by email for testing"""
        async def cleanup():
            try:
                client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
                db = client.test_database
                await db.users.delete_many({"email": email.lower()})
                client.close()
                return True
            except Exception as e:
                self.log(f"❌ Error cleaning up user: {e}", "ERROR")
                return False
        
        return asyncio.run(cleanup())

    def create_verified_user_directly(self, name: str, email: str, password: str) -> bool:
        """Create a verified user directly in the database for testing"""
        async def create_user():
            try:
                client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
                db = client.test_database
                pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
                
                uid = str(uuid.uuid4())
                doc = {
                    "_id": uid,
                    "email": email.lower(),
                    "name": name,
                    "password_hash": pwd_context.hash(password),
                    "palette": {"primary": "#A3C9FF", "secondary": "#FFCFE1", "accent": "#B8F1D9"},
                    "friends": [],
                    "email_verified": True,  # Skip verification for testing
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
                await db.users.insert_one(doc)
                client.close()
                return True
            except Exception as e:
                self.log(f"❌ Error creating user directly: {e}", "ERROR")
                return False
        
        return asyncio.run(create_user())

    def test_auth_login(self, email: str, password: str) -> dict:
        """Test user login"""
        url = f"{self.base_url}/auth/login"
        payload = {"email": email, "password": password}
        
        self.log(f"Testing login for {email}")
        response = self.session.post(url, json=payload)
        
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                self.log(f"✅ Login successful for {email}")
                return {"success": True, "token": data["access_token"], "data": data}
            else:
                self.log(f"❌ Login response missing access_token for {email}", "ERROR")
                return {"success": False, "error": "Missing access_token in response"}
        else:
            self.log(f"❌ Login failed for {email}: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
    
    def test_get_me(self, token: str, user_name: str) -> dict:
        """Test /me endpoint with JWT token"""
        url = f"{self.base_url}/me"
        headers = {"Authorization": f"Bearer {token}"}
        
        self.log(f"Testing /me endpoint for {user_name}")
        response = self.session.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "_id" in data and "name" in data and "email" in data:
                self.log(f"✅ /me endpoint successful for {user_name}")
                return {"success": True, "data": data}
            else:
                self.log(f"❌ /me response missing required fields for {user_name}", "ERROR")
                return {"success": False, "error": "Missing required fields in response"}
        else:
            self.log(f"❌ /me failed for {user_name}: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}

    def test_create_post(self, token: str, text: str, visibility: str = "public", user_name: str = "") -> dict:
        """Test creating a community post"""
        url = f"{self.base_url}/posts"
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "text": text,
            "visibility": visibility,
            "tags": ["test", "community"],
            "attachments": []
        }
        
        self.log(f"Testing post creation by {user_name}: '{text[:50]}...' (visibility: {visibility})")
        response = self.session.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "_id" in data and "text" in data and "visibility" in data:
                self.log(f"✅ Post creation successful: {data['_id']}")
                return {"success": True, "data": data}
            else:
                self.log(f"❌ Post creation response missing required fields", "ERROR")
                return {"success": False, "error": "Missing required fields in response"}
        else:
            self.log(f"❌ Post creation failed: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}

    def test_create_comment_new_api(self, token: str, post_id: str, content: str, user_name: str = "") -> dict:
        """Test creating comment using new /api/comments endpoint with authentication"""
        url = f"{self.base_url}/comments"
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "post_id": post_id,
            "content": content,
            "likes": 0,
            "user_liked": False
        }
        
        self.log(f"Testing comment creation (NEW API) by {user_name}: '{content[:30]}...'")
        response = self.session.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "success" in data and data["success"] and "comment" in data:
                comment = data["comment"]
                if "id" in comment and "post_id" in comment and "content" in comment:
                    self.log(f"✅ Comment creation (NEW API) successful: {comment['id']}")
                    return {"success": True, "data": data}
                else:
                    self.log(f"❌ Comment creation response missing required comment fields", "ERROR")
                    return {"success": False, "error": "Missing required comment fields in response"}
            else:
                self.log(f"❌ Comment creation response missing success/comment fields", "ERROR")
                return {"success": False, "error": "Missing success/comment fields in response"}
        else:
            self.log(f"❌ Comment creation failed: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}

    def test_get_comments_new_api(self, post_id: str, user_name: str = "") -> dict:
        """Test getting comments using new /api/comments/{post_id} endpoint"""
        url = f"{self.base_url}/comments/{post_id}"
        
        self.log(f"Testing comment retrieval (NEW API) for post {post_id} by {user_name}")
        response = self.session.get(url)
        
        if response.status_code == 200:
            data = response.json()
            if "success" in data and data["success"] and "comments" in data:
                comments = data["comments"]
                self.log(f"✅ Comment retrieval (NEW API) successful - found {len(comments)} comments")
                return {"success": True, "data": data}
            else:
                self.log(f"❌ Comment retrieval response missing success/comments fields", "ERROR")
                return {"success": False, "error": "Missing success/comments fields in response"}
        else:
            self.log(f"❌ Comment retrieval failed: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}

    def test_comment_authentication_failure(self, post_id: str, content: str) -> dict:
        """Test comment creation without authentication (should fail)"""
        url = f"{self.base_url}/comments"
        payload = {
            "post_id": post_id,
            "content": content,
            "likes": 0,
            "user_liked": False
        }
        
        self.log(f"Testing comment creation without authentication (should fail)")
        response = self.session.post(url, json=payload)
        
        if response.status_code == 401:
            self.log(f"✅ Comment creation properly rejected without authentication (401)")
            return {"success": True, "data": {"status_code": 401, "message": "Authentication required"}}
        else:
            self.log(f"❌ Comment creation should have failed with 401, got {response.status_code}", "ERROR")
            return {"success": False, "error": f"Expected 401, got {response.status_code}: {response.text}"}

    def test_comment_invalid_token(self, post_id: str, content: str) -> dict:
        """Test comment creation with invalid token (should fail)"""
        url = f"{self.base_url}/comments"
        headers = {"Authorization": "Bearer invalid_token_here"}
        payload = {
            "post_id": post_id,
            "content": content,
            "likes": 0,
            "user_liked": False
        }
        
        self.log(f"Testing comment creation with invalid token (should fail)")
        response = self.session.post(url, json=payload, headers=headers)
        
        if response.status_code == 401:
            self.log(f"✅ Comment creation properly rejected with invalid token (401)")
            return {"success": True, "data": {"status_code": 401, "message": "Invalid token"}}
        else:
            self.log(f"❌ Comment creation should have failed with 401, got {response.status_code}", "ERROR")
            return {"success": False, "error": f"Expected 401, got {response.status_code}: {response.text}"}

def run_comment_system_integration_test():
    """
    🎯 COMMENT SYSTEM INTEGRATION TEST - SPECIFIC REQUEST
    
    OBJECTIVE: Test the complete comment system integration after frontend changes
    
    TESTING SCOPE:
    1. **Comment Creation API** - Test POST /api/comments with proper authentication
    2. **Comment Retrieval API** - Test GET /api/comments/{post_id} for retrieving comments  
    3. **Authentication Flow** - Verify JWT token validation works correctly
    4. **Data Persistence** - Confirm comments are saved to MongoDB and can be retrieved
    5. **Error Handling** - Test authentication failures and invalid requests
    """
    tester = CommentTester()
    
    print("=" * 80)
    print("🎯 COMMENT SYSTEM INTEGRATION TEST - SPECIFIC REQUEST")
    print("=" * 80)
    
    # Test users for comment system testing
    test_users = [
        {"name": "CommentTester1", "email": "commenttester1@example.com", "password": "Passw0rd!"},
        {"name": "CommentTester2", "email": "commenttester2@example.com", "password": "Passw0rd!"}
    ]
    
    tokens = {}
    user_ids = {}
    
    # PHASE 1: Authentication Setup for Comment Testing
    print("\n" + "=" * 60)
    print("PHASE 1: AUTHENTICATION SETUP FOR COMMENT TESTING")
    print("=" * 60)
    
    for user in test_users:
        # Try to login first, if it fails, create the user directly in database
        login_result = tester.test_auth_login(user["email"], user["password"])
        if not login_result["success"]:
            print(f"⚠️ User {user['email']} doesn't exist, creating verified user directly...")
            # Clean up any existing user with same email first
            tester.cleanup_user_by_email(user["email"])
            # Create user directly in database (bypassing email verification for testing)
            success = tester.create_verified_user_directly(user["name"], user["email"], user["password"])
            if not success:
                print(f"❌ CRITICAL: Failed to create user {user['email']}")
                return False
            print(f"✅ User {user['name']} created successfully")
            
            # Now login
            login_result = tester.test_auth_login(user["email"], user["password"])
            if not login_result["success"]:
                print(f"❌ CRITICAL: Login failed after user creation for {user['email']}: {login_result.get('error', 'Unknown error')}")
                return False
        
        tokens[user["email"]] = login_result["token"]
        print(f"✅ User {user['name']} authenticated successfully")
        
        # Test /me endpoint to get user ID
        me_result = tester.test_get_me(tokens[user["email"]], user["name"])
        if not me_result["success"]:
            print(f"❌ CRITICAL: /me endpoint failed for {user['name']}")
            return False
        
        user_ids[user["email"]] = me_result["data"]["_id"]
        print(f"✅ User ID retrieved for {user['name']}: {user_ids[user['email']]}")
    
    print("✅ PHASE 1 COMPLETED: Authentication setup successful for comment testing")
    
    # PHASE 2: Create Test Posts for Comment Testing
    print("\n" + "=" * 60)
    print("PHASE 2: CREATE TEST POSTS FOR COMMENT TESTING")
    print("=" * 60)
    
    user1_email = test_users[0]["email"]
    user2_email = test_users[1]["email"]
    
    # Create test posts
    test_posts = []
    for i in range(1, 4):  # Create 3 test posts
        post_result = tester.test_create_post(
            tokens[user1_email], 
            f"Test post {i} for comment system integration testing", 
            "public", 
            test_users[0]["name"]
        )
        if not post_result["success"]:
            print(f"❌ CRITICAL: Failed to create test post {i}")
            return False
        
        post_id = post_result["data"]["_id"]
        test_posts.append(post_id)
        print(f"✅ Test post {i} created with ID: {post_id}")
    
    print(f"✅ PHASE 2 COMPLETED: Created {len(test_posts)} test posts for comment testing")
    
    # PHASE 3: Comment Creation API Testing (POST /api/comments)
    print("\n" + "=" * 60)
    print("PHASE 3: COMMENT CREATION API TESTING (POST /api/comments)")
    print("=" * 60)
    
    created_comments = []
    
    # Test comment creation with proper authentication
    for i, post_id in enumerate(test_posts, 1):
        comment_content = f"This is test comment {i} for post {post_id} - testing authentication and data persistence"
        
        print(f"🔍 Testing comment creation for post {post_id}")
        comment_result = tester.test_create_comment_new_api(
            tokens[user1_email], 
            post_id, 
            comment_content, 
            test_users[0]["name"]
        )
        
        if not comment_result["success"]:
            print(f"❌ CRITICAL: Comment creation failed for post {post_id}")
            print(f"Error: {comment_result.get('error', 'Unknown error')}")
            return False
        
        comment_data = comment_result["data"]["comment"]
        created_comments.append(comment_data)
        
        # Verify comment structure matches frontend expectations
        required_fields = ["id", "post_id", "author_id", "author_name", "content", "likes", "user_liked", "created_at"]
        for field in required_fields:
            if field not in comment_data:
                print(f"❌ CRITICAL: Comment missing required field '{field}'")
                return False
        
        print(f"✅ Comment created successfully: {comment_data['id']}")
        print(f"  📝 Content: {comment_data['content'][:50]}...")
        print(f"  👤 Author: {comment_data['author_name']} (ID: {comment_data['author_id']})")
        print(f"  📅 Created: {comment_data['created_at']}")
    
    print("✅ PHASE 3 COMPLETED: Comment creation API working correctly with authentication")
    
    # PHASE 4: Comment Retrieval API Testing (GET /api/comments/{post_id})
    print("\n" + "=" * 60)
    print("PHASE 4: COMMENT RETRIEVAL API TESTING (GET /api/comments/{post_id})")
    print("=" * 60)
    
    # Test comment retrieval for posts with comments
    for i, post_id in enumerate(test_posts, 1):
        print(f"🔍 Testing comment retrieval for post {post_id}")
        
        retrieval_result = tester.test_get_comments_new_api(post_id, f"test_user_{i}")
        
        if not retrieval_result["success"]:
            print(f"❌ CRITICAL: Comment retrieval failed for post {post_id}")
            print(f"Error: {retrieval_result.get('error', 'Unknown error')}")
            return False
        
        comments = retrieval_result["data"]["comments"]
        
        # Verify comments were retrieved correctly
        if len(comments) != 1:  # Each post should have 1 comment
            print(f"❌ CRITICAL: Expected 1 comment for post {post_id}, got {len(comments)}")
            return False
        
        print(f"✅ Retrieved {len(comments)} comments for post {post_id}")
        
        # Verify comment structure in retrieval
        for comment in comments:
            required_fields = ["id", "post_id", "author_id", "author_name", "content", "created_at"]
            for field in required_fields:
                if field not in comment:
                    print(f"❌ CRITICAL: Retrieved comment missing field '{field}'")
                    return False
            
            print(f"  📝 Comment ID: {comment['id']} by {comment['author_name']}")
    
    print("✅ PHASE 4 COMPLETED: Comment retrieval API working correctly")
    
    # PHASE 5: Authentication Flow Testing
    print("\n" + "=" * 60)
    print("PHASE 5: AUTHENTICATION FLOW TESTING")
    print("=" * 60)
    
    # Test comment creation without authentication (should fail)
    print("🔍 Testing comment creation without authentication (should fail)")
    no_auth_result = tester.test_comment_authentication_failure(
        test_posts[0], 
        "This comment should fail due to missing authentication"
    )
    
    if not no_auth_result["success"]:
        print("❌ CRITICAL: Authentication failure test failed")
        print(f"Error: {no_auth_result.get('error', 'Unknown error')}")
        return False
    
    print("✅ Comment creation properly rejected without authentication")
    
    # Test comment creation with invalid token (should fail)
    print("🔍 Testing comment creation with invalid token (should fail)")
    invalid_token_result = tester.test_comment_invalid_token(
        test_posts[0], 
        "This comment should fail due to invalid token"
    )
    
    if not invalid_token_result["success"]:
        print("❌ CRITICAL: Invalid token test failed")
        print(f"Error: {invalid_token_result.get('error', 'Unknown error')}")
        return False
    
    print("✅ Comment creation properly rejected with invalid token")
    
    print("✅ PHASE 5 COMPLETED: Authentication flow working correctly")
    
    # FINAL SUMMARY
    print("\n" + "=" * 80)
    print("🎉 COMMENT SYSTEM INTEGRATION TEST COMPLETED SUCCESSFULLY")
    print("=" * 80)
    
    print("✅ ALL 5 TEST PHASES PASSED:")
    print("  1. ✅ Authentication Setup - JWT tokens obtained and validated")
    print("  2. ✅ Test Posts Creation - Created posts for comment testing")
    print("  3. ✅ Comment Creation API - POST /api/comments working with authentication")
    print("  4. ✅ Comment Retrieval API - GET /api/comments/{post_id} working correctly")
    print("  5. ✅ Authentication Flow - JWT validation, auth failures handled properly")
    
    print(f"\n📊 COMMENT SYSTEM STATISTICS:")
    print(f"  👥 Users tested: {len(test_users)}")
    print(f"  📝 Posts created: {len(test_posts)}")
    print(f"  💬 Comments created: {len(created_comments)}")
    print(f"  🔐 Authentication tests: 2/2 passed")
    print(f"  📥 Comment retrieval tests: {len(test_posts)}/{len(test_posts)} passed")
    
    print("\n🔧 COMMENT SYSTEM IS PRODUCTION-READY")
    print("🚀 Complete comment system integration verified working correctly")
    print("✅ Authentication requirement restored and working")
    print("✅ JWT token validation working correctly")
    print("✅ Data structure matches frontend expectations")
    print("✅ MongoDB persistence confirmed working")
    print("✅ Error handling for authentication failures working")
    
    return True

if __name__ == "__main__":
    success = run_comment_system_integration_test()
    sys.exit(0 if success else 1)