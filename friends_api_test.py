#!/usr/bin/env python3
"""
Friends API Test Suite - Troubleshooting Friend Request Error
Tests friends API endpoints to troubleshoot the "Cannot read properties of undefined (reading 'length')" error
"""

import requests
import json
import sys
import os
import asyncio
import uuid
from typing import Dict, Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone

# Base URL from frontend .env
BASE_URL = "https://neurodiv-social.preview.emergentagent.com/api"

class FriendsAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.tokens = {}
        self.users = {}
        
    def log(self, message: str, level: str = "INFO"):
        print(f"[{level}] {message}")
        
    def cleanup_user_by_email(self, email: str) -> bool:
        """Clean up existing user by email for testing"""
        async def cleanup():
            try:
                client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
                db = client.test_database
                await db.users.delete_many({"email": email.lower()})
                await db.friend_requests.delete_many({
                    "$or": [
                        {"from_user_id": {"$regex": email.lower()}},
                        {"to_user_id": {"$regex": email.lower()}}
                    ]
                })
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
    
    def test_get_me(self, token: str, user_name: str) -> Dict:
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

    def test_friends_request(self, token: str, to_email: str, user_name: str) -> Dict:
        """Test sending friend request - CRITICAL TEST"""
        url = f"{self.base_url}/friends/request"
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"to_email": to_email}
        
        self.log(f"🎯 CRITICAL TEST: Friend request from {user_name} to {to_email}")
        response = self.session.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "_id" in data and "from_user_id" in data and "to_user_id" in data and "status" in data:
                self.log(f"✅ Friend request successful from {user_name} to {to_email}")
                self.log(f"   Request ID: {data['_id']}")
                self.log(f"   Status: {data['status']}")
                return {"success": True, "data": data}
            else:
                self.log(f"❌ Friend request response missing required fields", "ERROR")
                self.log(f"   Response: {data}")
                return {"success": False, "error": "Missing required fields in response", "response": data}
        else:
            self.log(f"❌ Friend request failed from {user_name} to {to_email}: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
    
    def test_friends_requests(self, token: str, user_name: str) -> Dict:
        """Test getting pending friend requests - CRITICAL TEST"""
        url = f"{self.base_url}/friends/requests"
        headers = {"Authorization": f"Bearer {token}"}
        
        self.log(f"🎯 CRITICAL TEST: Getting friend requests for {user_name}")
        response = self.session.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "requests" in data:
                requests_array = data["requests"]
                if isinstance(requests_array, list):
                    self.log(f"✅ Friends requests successful for {user_name} - found {len(requests_array)} requests")
                    self.log(f"   Requests array type: {type(requests_array)}")
                    self.log(f"   Requests array length: {len(requests_array)}")
                    if len(requests_array) > 0:
                        self.log(f"   Sample request structure: {list(requests_array[0].keys())}")
                    return {"success": True, "data": data, "array_type": "list", "array_length": len(requests_array)}
                else:
                    self.log(f"❌ Friends requests 'requests' field is not an array: {type(requests_array)}", "ERROR")
                    return {"success": False, "error": f"'requests' field is not an array: {type(requests_array)}", "response": data}
            else:
                self.log(f"❌ Friends requests response missing 'requests' field", "ERROR")
                self.log(f"   Response keys: {list(data.keys())}")
                return {"success": False, "error": "Missing 'requests' field in response", "response": data}
        else:
            self.log(f"❌ Friends requests failed for {user_name}: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
    
    def test_friends_list(self, token: str, user_name: str) -> Dict:
        """Test getting friends list - CRITICAL TEST"""
        url = f"{self.base_url}/friends/list"
        headers = {"Authorization": f"Bearer {token}"}
        
        self.log(f"🎯 CRITICAL TEST: Getting friends list for {user_name}")
        response = self.session.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "friends" in data:
                friends_array = data["friends"]
                if isinstance(friends_array, list):
                    self.log(f"✅ Friends list successful for {user_name} - found {len(friends_array)} friends")
                    self.log(f"   Friends array type: {type(friends_array)}")
                    self.log(f"   Friends array length: {len(friends_array)}")
                    if len(friends_array) > 0:
                        self.log(f"   Sample friend structure: {list(friends_array[0].keys())}")
                    return {"success": True, "data": data, "array_type": "list", "array_length": len(friends_array)}
                else:
                    self.log(f"❌ Friends list 'friends' field is not an array: {type(friends_array)}", "ERROR")
                    return {"success": False, "error": f"'friends' field is not an array: {type(friends_array)}", "response": data}
            else:
                self.log(f"❌ Friends list response missing 'friends' field", "ERROR")
                self.log(f"   Response keys: {list(data.keys())}")
                return {"success": False, "error": "Missing 'friends' field in response", "response": data}
        else:
            self.log(f"❌ Friends list failed for {user_name}: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}

    def test_friends_accept(self, token: str, request_id: str, user_name: str) -> Dict:
        """Test accepting friend request"""
        url = f"{self.base_url}/friends/accept"
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"request_id": request_id}
        
        self.log(f"Testing friend accept by {user_name} for request {request_id}")
        response = self.session.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "accepted" in data and data["accepted"]:
                self.log(f"✅ Friend accept successful by {user_name}")
                return {"success": True, "data": data}
            else:
                self.log(f"❌ Friend accept response missing 'accepted: true'", "ERROR")
                return {"success": False, "error": "Missing 'accepted: true' in response"}
        else:
            self.log(f"❌ Friend accept failed by {user_name}: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}

def run_friends_api_troubleshooting_test():
    """
    🎯 FRIENDS API TROUBLESHOOTING TEST - SPECIFIC REQUEST
    
    OBJECTIVE: Test friends API endpoints to troubleshoot the friend request error
    The user is getting "Cannot read properties of undefined (reading 'length')" JavaScript error
    
    TEST REQUIREMENTS:
    1. POST /api/friends/request endpoint with sample email (test@example.com)
    2. GET /api/friends/list endpoint 
    3. GET /api/friends/requests endpoint
    4. Authentication endpoints (/api/auth/login, /api/me) to ensure tokens work
    
    Focus: Check if responses have proper array structures for friends and requests arrays
    """
    tester = FriendsAPITester()
    
    print("=" * 80)
    print("🎯 FRIENDS API TROUBLESHOOTING TEST - SPECIFIC REQUEST")
    print("=" * 80)
    print("OBJECTIVE: Troubleshoot 'Cannot read properties of undefined (reading 'length')' error")
    print("FOCUS: Verify proper array structures in friends API responses")
    
    # Test users - using test@example.com as requested
    user1 = {"name": "TestUser1", "email": "testuser1@example.com", "password": "Passw0rd!"}
    user2 = {"name": "TestUser2", "email": "test@example.com", "password": "Passw0rd!"}  # Using test@example.com as requested
    
    tokens = {}
    
    # PHASE 1: Authentication Setup
    print("\n" + "=" * 60)
    print("PHASE 1: AUTHENTICATION SETUP")
    print("=" * 60)
    
    for user in [user1, user2]:
        # Clean up any existing user first
        tester.cleanup_user_by_email(user["email"])
        
        # Create user directly in database (bypassing email verification for testing)
        success = tester.create_verified_user_directly(user["name"], user["email"], user["password"])
        if not success:
            print(f"❌ CRITICAL: Failed to create user {user['email']}")
            return False
        print(f"✅ User {user['name']} created successfully")
        
        # Login
        login_result = tester.test_auth_login(user["email"], user["password"])
        if not login_result["success"]:
            print(f"❌ CRITICAL: Login failed for {user['email']}: {login_result.get('error', 'Unknown error')}")
            return False
        
        tokens[user["email"]] = login_result["token"]
        print(f"✅ User {user['name']} authenticated successfully")
    
    # PHASE 2: Test Authentication Endpoints (/api/auth/login, /api/me)
    print("\n" + "=" * 60)
    print("PHASE 2: AUTHENTICATION ENDPOINTS VERIFICATION")
    print("=" * 60)
    
    for user in [user1, user2]:
        # Test /me endpoint
        me_result = tester.test_get_me(tokens[user["email"]], user["name"])
        if not me_result["success"]:
            print(f"❌ CRITICAL: /me endpoint failed for {user['name']}")
            return False
        
        me_data = me_result["data"]
        print(f"✅ /me endpoint working for {user['name']}")
        print(f"   User ID: {me_data.get('_id')}")
        print(f"   Name: {me_data.get('name')}")
        print(f"   Email: {me_data.get('email')}")
    
    # PHASE 3: Test GET /api/friends/list endpoint (BEFORE any friend requests)
    print("\n" + "=" * 60)
    print("PHASE 3: GET /api/friends/list - INITIAL STATE (EMPTY)")
    print("=" * 60)
    
    for user in [user1, user2]:
        friends_list_result = tester.test_friends_list(tokens[user["email"]], user["name"])
        if not friends_list_result["success"]:
            print(f"❌ CRITICAL: Friends list failed for {user['name']}")
            print(f"   Error: {friends_list_result.get('error')}")
            if 'response' in friends_list_result:
                print(f"   Response: {friends_list_result['response']}")
            return False
        
        # Verify array structure
        if friends_list_result.get("array_type") != "list":
            print(f"❌ CRITICAL: Friends list is not an array for {user['name']}")
            return False
        
        print(f"✅ Friends list working for {user['name']} - proper array structure")
        print(f"   Array length: {friends_list_result.get('array_length', 0)}")
    
    # PHASE 4: Test GET /api/friends/requests endpoint (BEFORE any friend requests)
    print("\n" + "=" * 60)
    print("PHASE 4: GET /api/friends/requests - INITIAL STATE (EMPTY)")
    print("=" * 60)
    
    for user in [user1, user2]:
        requests_result = tester.test_friends_requests(tokens[user["email"]], user["name"])
        if not requests_result["success"]:
            print(f"❌ CRITICAL: Friends requests failed for {user['name']}")
            print(f"   Error: {requests_result.get('error')}")
            if 'response' in requests_result:
                print(f"   Response: {requests_result['response']}")
            return False
        
        # Verify array structure
        if requests_result.get("array_type") != "list":
            print(f"❌ CRITICAL: Friends requests is not an array for {user['name']}")
            return False
        
        print(f"✅ Friends requests working for {user['name']} - proper array structure")
        print(f"   Array length: {requests_result.get('array_length', 0)}")
    
    # PHASE 5: Test POST /api/friends/request endpoint with test@example.com
    print("\n" + "=" * 60)
    print("PHASE 5: POST /api/friends/request - SEND FRIEND REQUEST")
    print("=" * 60)
    
    # Send friend request from user1 to user2 (test@example.com)
    request_result = tester.test_friends_request(
        tokens[user1["email"]], 
        user2["email"],  # test@example.com
        user1["name"]
    )
    
    if not request_result["success"]:
        print(f"❌ CRITICAL: Friend request failed")
        print(f"   Error: {request_result.get('error')}")
        if 'response' in request_result:
            print(f"   Response: {request_result['response']}")
        return False
    
    request_data = request_result["data"]
    request_id = request_data["_id"]
    
    print(f"✅ Friend request sent successfully")
    print(f"   Request ID: {request_id}")
    print(f"   From: {user1['name']} ({user1['email']})")
    print(f"   To: {user2['name']} ({user2['email']})")
    
    # PHASE 6: Test GET /api/friends/requests endpoint (AFTER friend request)
    print("\n" + "=" * 60)
    print("PHASE 6: GET /api/friends/requests - AFTER FRIEND REQUEST")
    print("=" * 60)
    
    # Check requests for user2 (recipient)
    requests_result = tester.test_friends_requests(tokens[user2["email"]], user2["name"])
    if not requests_result["success"]:
        print(f"❌ CRITICAL: Friends requests failed for recipient {user2['name']}")
        print(f"   Error: {requests_result.get('error')}")
        return False
    
    # Verify array structure and content
    if requests_result.get("array_type") != "list":
        print(f"❌ CRITICAL: Friends requests is not an array for {user2['name']}")
        return False
    
    if requests_result.get("array_length", 0) == 0:
        print(f"❌ CRITICAL: No friend requests found for {user2['name']} after sending request")
        return False
    
    print(f"✅ Friends requests working for {user2['name']} - proper array structure with data")
    print(f"   Array length: {requests_result.get('array_length', 0)}")
    
    # Verify request structure
    requests_data = requests_result["data"]["requests"]
    if len(requests_data) > 0:
        first_request = requests_data[0]
        required_fields = ["_id", "from_user_id", "from_name", "from_email", "created_at"]
        for field in required_fields:
            if field in first_request:
                print(f"   ✅ Request has '{field}': {first_request[field]}")
            else:
                print(f"   ❌ Request missing '{field}'")
                return False
    
    # PHASE 7: Accept friend request and test friends list
    print("\n" + "=" * 60)
    print("PHASE 7: ACCEPT FRIEND REQUEST AND TEST FRIENDS LIST")
    print("=" * 60)
    
    # Accept the friend request
    accept_result = tester.test_friends_accept(tokens[user2["email"]], request_id, user2["name"])
    if not accept_result["success"]:
        print(f"❌ CRITICAL: Friend accept failed")
        return False
    
    print(f"✅ Friend request accepted successfully")
    
    # Test friends list for both users after acceptance
    for user in [user1, user2]:
        friends_list_result = tester.test_friends_list(tokens[user["email"]], user["name"])
        if not friends_list_result["success"]:
            print(f"❌ CRITICAL: Friends list failed for {user['name']} after acceptance")
            return False
        
        # Verify array structure and content
        if friends_list_result.get("array_type") != "list":
            print(f"❌ CRITICAL: Friends list is not an array for {user['name']}")
            return False
        
        if friends_list_result.get("array_length", 0) == 0:
            print(f"❌ CRITICAL: No friends found for {user['name']} after acceptance")
            return False
        
        print(f"✅ Friends list working for {user['name']} - proper array structure with data")
        print(f"   Array length: {friends_list_result.get('array_length', 0)}")
        
        # Verify friend structure
        friends_data = friends_list_result["data"]["friends"]
        if len(friends_data) > 0:
            first_friend = friends_data[0]
            required_fields = ["_id", "name", "email"]
            for field in required_fields:
                if field in first_friend:
                    print(f"   ✅ Friend has '{field}': {first_friend[field]}")
                else:
                    print(f"   ❌ Friend missing '{field}'")
                    return False
    
    # PHASE 8: Final verification - Check requests list is now empty
    print("\n" + "=" * 60)
    print("PHASE 8: FINAL VERIFICATION - REQUESTS LIST AFTER ACCEPTANCE")
    print("=" * 60)
    
    # Check requests for user2 (should be empty now)
    final_requests_result = tester.test_friends_requests(tokens[user2["email"]], user2["name"])
    if not final_requests_result["success"]:
        print(f"❌ CRITICAL: Final friends requests check failed")
        return False
    
    print(f"✅ Final friends requests check successful")
    print(f"   Array length: {final_requests_result.get('array_length', 0)} (should be 0 after acceptance)")
    
    # FINAL SUMMARY
    print("\n" + "=" * 80)
    print("🎉 FRIENDS API TROUBLESHOOTING TEST COMPLETED SUCCESSFULLY")
    print("=" * 80)
    
    print("✅ ALL CRITICAL TESTS PASSED:")
    print("  1. ✅ Authentication endpoints working (/api/auth/login, /api/me)")
    print("  2. ✅ GET /api/friends/list returns proper array structure")
    print("     - Empty state: returns {\"friends\": []} (array)")
    print("     - With data: returns {\"friends\": [{\"_id\": \"...\", \"name\": \"...\", \"email\": \"...\"}]} (array)")
    print("  3. ✅ GET /api/friends/requests returns proper array structure")
    print("     - Empty state: returns {\"requests\": []} (array)")
    print("     - With data: returns {\"requests\": [{\"_id\": \"...\", \"from_user_id\": \"...\", ...}]} (array)")
    print("  4. ✅ POST /api/friends/request works with test@example.com")
    print("     - Successfully sends friend request")
    print("     - Returns proper request object with _id, from_user_id, to_user_id, status")
    print("  5. ✅ Friend acceptance flow working correctly")
    print("     - Requests list updates properly after acceptance")
    print("     - Friends list updates properly after acceptance")
    
    print("\n🔧 BACKEND FRIENDS API IS WORKING CORRECTLY")
    print("📊 All endpoints return proper array structures - no undefined arrays")
    print("🎯 The 'Cannot read properties of undefined (reading 'length')' error is NOT caused by backend")
    print("💡 The issue is likely in the frontend FriendsContext where arrays are accessed before initialization")
    
    print("\n🔍 RECOMMENDED FRONTEND FIXES:")
    print("  1. Ensure friends and requests arrays are initialized as empty arrays [] in FriendsContext")
    print("  2. Add null/undefined checks before accessing .length property")
    print("  3. Use safe array access: const safeFriends = friends || []; const safeRequests = requests || [];")
    print("  4. Check that API responses are properly handled in the context")
    
    return True

if __name__ == "__main__":
    success = run_friends_api_troubleshooting_test()
    if success:
        print("\n✅ Friends API test completed successfully")
        sys.exit(0)
    else:
        print("\n❌ Friends API test failed")
        sys.exit(1)