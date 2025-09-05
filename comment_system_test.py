#!/usr/bin/env python3
"""
Comment System Backend Testing - Specific Review Request
Tests comment system after fixes to understand why comments are loading from backend but not showing in UI
"""

import requests
import json
import sys
import time
from typing import Dict, Optional, List

# Backend URL from review request
BASE_URL = "https://neurodiv-hub.preview.emergentagent.com/api"

class CommentSystemTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.tokens = {}
        self.users = {}
        self.posts = {}
        self.comments = {}
        
    def log(self, message: str, level: str = "INFO"):
        print(f"[{level}] {message}")
        
    def cleanup_user_by_email(self, email: str) -> bool:
        """Clean up existing user by email for testing"""
        import asyncio
        import os
        from motor.motor_asyncio import AsyncIOMotorClient
        
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
        import asyncio
        import os
        import uuid
        from motor.motor_asyncio import AsyncIOMotorClient
        from passlib.context import CryptContext
        from datetime import datetime, timezone
        
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

    def test_auth_login(self, email: str, password: str) -> Dict:
        """Test user login"""
        url = f"{self.base_url}/auth/login"
        payload = {
            "email": email,
            "password": password
        }
        
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

    def test_create_post(self, token: str, text: str, visibility: str = "friends", user_name: str = "") -> Dict:
        """Test creating a community post for comment testing"""
        url = f"{self.base_url}/posts"
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "text": text,
            "visibility": visibility,
            "tags": ["test", "comment-testing"],
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

    def test_create_comment_new_api(self, token: str, post_id: str, content: str, user_name: str = "") -> Dict:
        """Test creating comment using /api/comments endpoint with authentication"""
        url = f"{self.base_url}/comments"
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "post_id": post_id,
            "content": content,
            "likes": 0,
            "user_liked": False
        }
        
        self.log(f"Testing comment creation by {user_name}: '{content[:30]}...'")
        response = self.session.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            self.log(f"✅ Comment creation successful - Response: {json.dumps(data, indent=2)}")
            return {"success": True, "data": data}
        else:
            self.log(f"❌ Comment creation failed: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}

    def test_get_comments_new_api(self, post_id: str, user_name: str = "") -> Dict:
        """Test getting comments using /api/comments/{post_id} endpoint"""
        url = f"{self.base_url}/comments/{post_id}"
        
        self.log(f"Testing comment retrieval for post {post_id} by {user_name}")
        response = self.session.get(url)
        
        if response.status_code == 200:
            data = response.json()
            self.log(f"✅ Comment retrieval successful - Response: {json.dumps(data, indent=2)}")
            return {"success": True, "data": data}
        else:
            self.log(f"❌ Comment retrieval failed: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}

    def analyze_comment_format_mismatch(self, backend_comment: Dict) -> Dict:
        """Analyze comment format mismatch between backend and frontend expectations"""
        self.log("🔍 ANALYZING COMMENT FORMAT MISMATCH")
        
        # Expected frontend format from review request
        expected_frontend_format = {
            "id": "string",
            "author": "string", 
            "content": "string",
            "timeAgo": "string",
            "likes": 0,
            "userLiked": False
        }
        
        # Backend format from review request
        expected_backend_format = {
            "id": "string",
            "author_name": "string",
            "content": "string", 
            "created_at": "ISO date",
            "likes": 0,
            "user_liked": False
        }
        
        self.log("📋 Expected Frontend Format:")
        for key, value_type in expected_frontend_format.items():
            self.log(f"  - {key}: {value_type}")
        
        self.log("📋 Expected Backend Format:")
        for key, value_type in expected_backend_format.items():
            self.log(f"  - {key}: {value_type}")
        
        self.log("📋 Actual Backend Response:")
        for key, value in backend_comment.items():
            self.log(f"  - {key}: {value} ({type(value).__name__})")
        
        # Check for format mismatches
        mismatches = []
        
        # Check if backend has author_name but frontend expects author
        if "author_name" in backend_comment and "author" not in backend_comment:
            mismatches.append("Backend uses 'author_name' but frontend expects 'author'")
        
        # Check if backend has created_at but frontend expects timeAgo
        if "created_at" in backend_comment and "timeAgo" not in backend_comment:
            mismatches.append("Backend uses 'created_at' but frontend expects 'timeAgo'")
        
        # Check if backend has user_liked but frontend expects userLiked
        if "user_liked" in backend_comment and "userLiked" not in backend_comment:
            mismatches.append("Backend uses 'user_liked' but frontend expects 'userLiked'")
        
        if mismatches:
            self.log("❌ FORMAT MISMATCHES DETECTED:")
            for mismatch in mismatches:
                self.log(f"  - {mismatch}")
        else:
            self.log("✅ No obvious format mismatches detected")
        
        return {
            "mismatches": mismatches,
            "backend_format": backend_comment,
            "expected_frontend": expected_frontend_format,
            "expected_backend": expected_backend_format
        }

    def test_comment_authentication_scenarios(self, post_id: str) -> Dict:
        """Test comment authentication scenarios"""
        self.log("🔐 TESTING COMMENT AUTHENTICATION SCENARIOS")
        
        results = {}
        
        # Test 1: No authentication
        self.log("Test 1: Comment creation without authentication (should fail)")
        url = f"{self.base_url}/comments"
        payload = {
            "post_id": post_id,
            "content": "Test comment without auth",
            "likes": 0,
            "user_liked": False
        }
        
        response = self.session.post(url, json=payload)
        if response.status_code == 401:
            self.log("✅ Comment creation properly rejected without authentication (401)")
            results["no_auth"] = {"success": True, "status": 401}
        else:
            self.log(f"❌ Expected 401, got {response.status_code}", "ERROR")
            results["no_auth"] = {"success": False, "status": response.status_code}
        
        # Test 2: Invalid token
        self.log("Test 2: Comment creation with invalid token (should fail)")
        headers = {"Authorization": "Bearer invalid_token_here"}
        response = self.session.post(url, json=payload, headers=headers)
        if response.status_code == 401:
            self.log("✅ Comment creation properly rejected with invalid token (401)")
            results["invalid_token"] = {"success": True, "status": 401}
        else:
            self.log(f"❌ Expected 401, got {response.status_code}", "ERROR")
            results["invalid_token"] = {"success": False, "status": response.status_code}
        
        return results

    def test_backend_url_verification(self) -> Dict:
        """Test backend URL verification as specified in review request"""
        self.log("🌐 TESTING BACKEND URL VERIFICATION")
        
        expected_url = "https://neurodiv-hub.preview.emergentagent.com"
        actual_base_url = self.base_url.replace("/api", "")
        
        self.log(f"Expected URL: {expected_url}")
        self.log(f"Actual URL: {actual_base_url}")
        
        if actual_base_url == expected_url:
            self.log("✅ Backend URL matches expected URL from review request")
            return {"success": True, "url_match": True, "url": actual_base_url}
        else:
            self.log("❌ Backend URL does not match expected URL", "ERROR")
            return {"success": False, "url_match": False, "expected": expected_url, "actual": actual_base_url}

def run_comment_system_comprehensive_test():
    """
    🎯 COMMENT SYSTEM COMPREHENSIVE TEST - SPECIFIC REVIEW REQUEST
    
    OBJECTIVE: Test comment system after fixes to understand why comments are loading from backend but not showing in UI
    
    CURRENT ISSUE: Console shows backend comment loading is working:
    - "Loaded 4 comments for post 1 from backend"
    - "Comment saved and added to UI" 
    - "New comment count for post 2: 4"
    BUT UI still shows "No comments yet. Be the first to share your thoughts!"
    
    TESTING NEEDED:
    1. Verify comment data structure - Check if comments retrieved match expected frontend format
    2. Test comment creation flow - Create a new comment and verify response format
    3. Check existing comments - GET /api/comments/1, /api/comments/2, /api/comments/3
    4. Verify backend URL - Should be using https://neurodiv-hub.preview.emergentagent.com
    5. Check auth token - Verify JWT token is working properly
    """
    tester = CommentSystemTester()
    
    print("=" * 80)
    print("🎯 COMMENT SYSTEM COMPREHENSIVE TEST - SPECIFIC REVIEW REQUEST")
    print("=" * 80)
    
    # Test users
    user1 = {"name": "CommentTester1", "email": "commenttester1@example.com", "password": "Passw0rd!"}
    user2 = {"name": "CommentTester2", "email": "commenttester2@example.com", "password": "Passw0rd!"}
    
    tokens = {}
    
    # PHASE 1: Backend URL Verification
    print("\n" + "=" * 60)
    print("PHASE 1: BACKEND URL VERIFICATION")
    print("=" * 60)
    
    url_result = tester.test_backend_url_verification()
    if not url_result["success"]:
        print("❌ CRITICAL: Backend URL verification failed")
        return False
    
    # PHASE 2: Authentication Setup
    print("\n" + "=" * 60)
    print("PHASE 2: AUTHENTICATION SETUP")
    print("=" * 60)
    
    for user in [user1, user2]:
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
        tester.users[user["email"]] = user
        print(f"✅ User {user['name']} authenticated successfully")
    
    # PHASE 3: Test Posts Creation for Comment Testing
    print("\n" + "=" * 60)
    print("PHASE 3: TEST POSTS CREATION")
    print("=" * 60)
    
    # Create test posts with IDs 1, 2, 3 as mentioned in review request
    test_posts = [
        {"text": "Test Post 1 for comment testing - This is the first post", "id": "1"},
        {"text": "Test Post 2 for comment testing - This is the second post", "id": "2"},
        {"text": "Test Post 3 for comment testing - This is the third post", "id": "3"}
    ]
    
    user1_email = user1["email"]
    user1_token = tokens[user1_email]
    
    for i, post_data in enumerate(test_posts):
        post_result = tester.test_create_post(user1_token, post_data["text"], "public", user1["name"])
        if post_result["success"]:
            post_id = post_result["data"]["_id"]
            tester.posts[post_data["id"]] = post_id
            print(f"✅ Test post {post_data['id']} created with ID: {post_id}")
        else:
            print(f"❌ CRITICAL: Failed to create test post {post_data['id']}")
            return False
    
    # PHASE 4: Comment Authentication Testing
    print("\n" + "=" * 60)
    print("PHASE 4: COMMENT AUTHENTICATION TESTING")
    print("=" * 60)
    
    auth_results = tester.test_comment_authentication_scenarios(tester.posts["1"])
    if not auth_results["no_auth"]["success"] or not auth_results["invalid_token"]["success"]:
        print("❌ CRITICAL: Comment authentication scenarios failed")
        return False
    
    print("✅ Comment authentication working correctly")
    
    # PHASE 5: Comment Creation Flow Testing
    print("\n" + "=" * 60)
    print("PHASE 5: COMMENT CREATION FLOW TESTING")
    print("=" * 60)
    
    # Create comments on each test post
    test_comments = [
        {"post_id": "1", "content": "This is a test comment on post 1", "user": user1},
        {"post_id": "1", "content": "This is another comment on post 1", "user": user2},
        {"post_id": "2", "content": "Comment on post 2 by user 1", "user": user1},
        {"post_id": "2", "content": "Comment on post 2 by user 2", "user": user2},
        {"post_id": "3", "content": "Single comment on post 3", "user": user1}
    ]
    
    created_comments = []
    
    for comment_data in test_comments:
        post_id = tester.posts[comment_data["post_id"]]
        user = comment_data["user"]
        token = tokens[user["email"]]
        
        comment_result = tester.test_create_comment_new_api(
            token, 
            post_id, 
            comment_data["content"], 
            user["name"]
        )
        
        if comment_result["success"]:
            created_comments.append({
                "post_id": comment_data["post_id"],
                "comment_data": comment_result["data"],
                "user": user
            })
            print(f"✅ Comment created on post {comment_data['post_id']} by {user['name']}")
        else:
            print(f"❌ CRITICAL: Failed to create comment on post {comment_data['post_id']}")
            return False
    
    # PHASE 6: Comment Retrieval and Format Analysis
    print("\n" + "=" * 60)
    print("PHASE 6: COMMENT RETRIEVAL AND FORMAT ANALYSIS")
    print("=" * 60)
    
    # Test GET /api/comments/1, /api/comments/2, /api/comments/3 as requested
    for post_num in ["1", "2", "3"]:
        post_id = tester.posts[post_num]
        
        print(f"\n🔍 Testing GET /api/comments/{post_num} (actual ID: {post_id})")
        
        comments_result = tester.test_get_comments_new_api(post_id, "system")
        if not comments_result["success"]:
            print(f"❌ CRITICAL: Failed to retrieve comments for post {post_num}")
            return False
        
        comments_data = comments_result["data"]
        
        # Analyze comment format if comments exist
        if "comments" in comments_data and len(comments_data["comments"]) > 0:
            first_comment = comments_data["comments"][0]
            print(f"\n📊 ANALYZING COMMENT FORMAT FOR POST {post_num}")
            format_analysis = tester.analyze_comment_format_mismatch(first_comment)
            
            if format_analysis["mismatches"]:
                print("❌ FORMAT MISMATCHES DETECTED - THIS IS LIKELY THE ROOT CAUSE!")
                for mismatch in format_analysis["mismatches"]:
                    print(f"  🚨 {mismatch}")
            else:
                print("✅ No format mismatches detected in comment structure")
        else:
            print(f"⚠️ No comments found for post {post_num}")
    
    # PHASE 7: Comprehensive Format Analysis Summary
    print("\n" + "=" * 60)
    print("PHASE 7: COMPREHENSIVE FORMAT ANALYSIS SUMMARY")
    print("=" * 60)
    
    # Get a sample comment for detailed analysis
    sample_post_id = tester.posts["1"]
    sample_comments_result = tester.test_get_comments_new_api(sample_post_id, "system")
    
    if sample_comments_result["success"] and "comments" in sample_comments_result["data"]:
        comments = sample_comments_result["data"]["comments"]
        if len(comments) > 0:
            sample_comment = comments[0]
            
            print("🔍 DETAILED FORMAT ANALYSIS:")
            print("=" * 40)
            
            # Expected frontend format
            expected_frontend = {
                "id": "string",
                "author": "string", 
                "content": "string",
                "timeAgo": "string",
                "likes": 0,
                "userLiked": False
            }
            
            # Actual backend format
            actual_backend = sample_comment
            
            print("📋 EXPECTED FRONTEND FORMAT:")
            for key, value_type in expected_frontend.items():
                print(f"  {key}: {value_type}")
            
            print("\n📋 ACTUAL BACKEND FORMAT:")
            for key, value in actual_backend.items():
                print(f"  {key}: {value} ({type(value).__name__})")
            
            print("\n🔍 FIELD MAPPING ANALYSIS:")
            
            # Check each expected frontend field
            mapping_issues = []
            
            if "id" in actual_backend:
                print("  ✅ id: Present in backend")
            else:
                print("  ❌ id: Missing in backend")
                mapping_issues.append("Missing 'id' field")
            
            if "author" in actual_backend:
                print("  ✅ author: Present in backend")
            elif "author_name" in actual_backend:
                print("  🚨 author: Backend uses 'author_name' instead of 'author'")
                mapping_issues.append("Backend uses 'author_name' but frontend expects 'author'")
            else:
                print("  ❌ author: Missing in backend")
                mapping_issues.append("Missing author field")
            
            if "content" in actual_backend:
                print("  ✅ content: Present in backend")
            else:
                print("  ❌ content: Missing in backend")
                mapping_issues.append("Missing 'content' field")
            
            if "timeAgo" in actual_backend:
                print("  ✅ timeAgo: Present in backend")
            elif "created_at" in actual_backend:
                print("  🚨 timeAgo: Backend uses 'created_at' instead of 'timeAgo'")
                mapping_issues.append("Backend uses 'created_at' but frontend expects 'timeAgo'")
            else:
                print("  ❌ timeAgo: Missing in backend")
                mapping_issues.append("Missing timeAgo field")
            
            if "likes" in actual_backend:
                print("  ✅ likes: Present in backend")
            else:
                print("  ❌ likes: Missing in backend")
                mapping_issues.append("Missing 'likes' field")
            
            if "userLiked" in actual_backend:
                print("  ✅ userLiked: Present in backend")
            elif "user_liked" in actual_backend:
                print("  🚨 userLiked: Backend uses 'user_liked' instead of 'userLiked'")
                mapping_issues.append("Backend uses 'user_liked' but frontend expects 'userLiked'")
            else:
                print("  ❌ userLiked: Missing in backend")
                mapping_issues.append("Missing userLiked field")
            
            print("\n" + "=" * 60)
            print("🎯 ROOT CAUSE ANALYSIS RESULTS")
            print("=" * 60)
            
            if mapping_issues:
                print("❌ CRITICAL FORMAT MISMATCHES DETECTED!")
                print("🚨 THIS IS LIKELY WHY COMMENTS ARE NOT SHOWING IN UI!")
                print("\nISSUES FOUND:")
                for i, issue in enumerate(mapping_issues, 1):
                    print(f"  {i}. {issue}")
                
                print("\n💡 RECOMMENDED FIXES:")
                if "Backend uses 'author_name' but frontend expects 'author'" in mapping_issues:
                    print("  1. Backend should return 'author' field instead of 'author_name'")
                    print("     OR Frontend should map 'author_name' to 'author'")
                
                if "Backend uses 'created_at' but frontend expects 'timeAgo'" in mapping_issues:
                    print("  2. Backend should calculate and return 'timeAgo' field")
                    print("     OR Frontend should convert 'created_at' to 'timeAgo'")
                
                if "Backend uses 'user_liked' but frontend expects 'userLiked'" in mapping_issues:
                    print("  3. Backend should return 'userLiked' field instead of 'user_liked'")
                    print("     OR Frontend should map 'user_liked' to 'userLiked'")
                
                return False
            else:
                print("✅ No format mismatches detected")
                print("🤔 The issue might be elsewhere in the frontend rendering logic")
                return True
        else:
            print("❌ No comments available for format analysis")
            return False
    else:
        print("❌ Failed to retrieve comments for format analysis")
        return False

if __name__ == "__main__":
    print("🚀 Starting Comment System Comprehensive Test...")
    success = run_comment_system_comprehensive_test()
    
    if success:
        print("\n" + "=" * 80)
        print("✅ COMMENT SYSTEM TEST COMPLETED SUCCESSFULLY")
        print("=" * 80)
        sys.exit(0)
    else:
        print("\n" + "=" * 80)
        print("❌ COMMENT SYSTEM TEST FAILED - ISSUES DETECTED")
        print("=" * 80)
        sys.exit(1)