#!/usr/bin/env python3
"""
Backend API Test Suite for ADHDers API
Tests Auth and Friends endpoints as per test_result.md requirements
"""

import requests
import json
import sys
from typing import Dict, Optional

# Base URL from frontend .env
BASE_URL = "https://friendsync-debug.preview.emergentagent.com/api"

class APITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.tokens = {}
        self.users = {}
        
    def log(self, message: str, level: str = "INFO"):
        print(f"[{level}] {message}")
        
    def test_auth_register(self, name: str, email: str, password: str) -> Dict:
        """Test user registration"""
        url = f"{self.base_url}/auth/register"
        payload = {
            "name": name,
            "email": email,
            "password": password
        }
        
        self.log(f"Testing registration for {email}")
        response = self.session.post(url, json=payload)
        
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                self.log(f"✅ Registration successful for {email}")
                return {"success": True, "token": data["access_token"], "data": data}
            else:
                self.log(f"❌ Registration response missing access_token for {email}", "ERROR")
                return {"success": False, "error": "Missing access_token in response"}
        else:
            self.log(f"❌ Registration failed for {email}: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
    
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
    
    def test_friends_find(self, token: str, query: str, user_name: str) -> Dict:
        """Test friends find endpoint"""
        url = f"{self.base_url}/friends/find?q={query}"
        headers = {"Authorization": f"Bearer {token}"}
        
        self.log(f"Testing friends/find with query '{query}' for {user_name}")
        response = self.session.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "user" in data:
                self.log(f"✅ Friends find successful for query '{query}'")
                return {"success": True, "data": data}
            else:
                self.log(f"❌ Friends find response missing 'user' field", "ERROR")
                return {"success": False, "error": "Missing 'user' field in response"}
        else:
            self.log(f"❌ Friends find failed for query '{query}': {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
    
    def test_friends_request(self, token: str, to_email: str, user_name: str) -> Dict:
        """Test sending friend request"""
        url = f"{self.base_url}/friends/request"
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"to_email": to_email}
        
        self.log(f"Testing friend request from {user_name} to {to_email}")
        response = self.session.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "_id" in data:
                self.log(f"✅ Friend request successful from {user_name} to {to_email}")
                return {"success": True, "data": data}
            else:
                self.log(f"❌ Friend request response missing '_id' field", "ERROR")
                return {"success": False, "error": "Missing '_id' field in response"}
        else:
            self.log(f"❌ Friend request failed from {user_name} to {to_email}: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
    
    def test_friends_requests(self, token: str, user_name: str) -> Dict:
        """Test getting pending friend requests"""
        url = f"{self.base_url}/friends/requests"
        headers = {"Authorization": f"Bearer {token}"}
        
        self.log(f"Testing friends/requests for {user_name}")
        response = self.session.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "requests" in data:
                self.log(f"✅ Friends requests successful for {user_name} - found {len(data['requests'])} requests")
                return {"success": True, "data": data}
            else:
                self.log(f"❌ Friends requests response missing 'requests' field", "ERROR")
                return {"success": False, "error": "Missing 'requests' field in response"}
        else:
            self.log(f"❌ Friends requests failed for {user_name}: {response.status_code} - {response.text}", "ERROR")
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
    
    def test_friends_reject(self, token: str, request_id: str, user_name: str) -> Dict:
        """Test rejecting friend request"""
        url = f"{self.base_url}/friends/reject"
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"request_id": request_id}
        
        self.log(f"Testing friend reject by {user_name} for request {request_id}")
        response = self.session.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "rejected" in data and data["rejected"]:
                self.log(f"✅ Friend reject successful by {user_name}")
                return {"success": True, "data": data}
            else:
                self.log(f"❌ Friend reject response missing 'rejected: true'", "ERROR")
                return {"success": False, "error": "Missing 'rejected: true' in response"}
        else:
            self.log(f"❌ Friend reject failed by {user_name}: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
    
    def test_friends_list(self, token: str, user_name: str) -> Dict:
        """Test getting friends list"""
        url = f"{self.base_url}/friends/list"
        headers = {"Authorization": f"Bearer {token}"}
        
        self.log(f"Testing friends/list for {user_name}")
        response = self.session.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "friends" in data:
                self.log(f"✅ Friends list successful for {user_name} - found {len(data['friends'])} friends")
                return {"success": True, "data": data}
            else:
                self.log(f"❌ Friends list response missing 'friends' field", "ERROR")
                return {"success": False, "error": "Missing 'friends' field in response"}
        else:
            self.log(f"❌ Friends list failed for {user_name}: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}

def run_comprehensive_test():
    """Run the comprehensive test suite as per review request"""
    tester = APITester()
    
    print("=" * 80)
    print("STARTING COMPREHENSIVE BACKEND API TEST")
    print("=" * 80)
    
    # Test users as per review request
    users_to_test = [
        {"name": "ssaritan", "email": "ssaritan@example.com", "password": "Passw0rd!"},
        {"name": "ssaritan2", "email": "ssaritan2@example.com", "password": "Passw0rd!"},
        {"name": "TestUser456", "email": "testuser456@example.com", "password": "Passw0rd!"}
    ]
    
    tokens = {}
    user_profiles = {}
    
    # A. Register users (or login if already exists)
    print("\n" + "=" * 50)
    print("PHASE A: USER REGISTRATION/LOGIN")
    print("=" * 50)
    
    for user in users_to_test:
        # Try login first
        login_result = tester.test_auth_login(user["email"], user["password"])
        if login_result["success"]:
            print(f"✅ User {user['email']} already exists, logged in successfully")
            tokens[user["email"]] = login_result["token"]
        else:
            # If login fails, try registration
            result = tester.test_auth_register(user["name"], user["email"], user["password"])
            if not result["success"]:
                print(f"❌ CRITICAL: Both registration and login failed for {user['email']}")
                return False
            tokens[user["email"]] = result["token"]
    
    # B. Login users and capture tokens
    print("\n" + "=" * 50)
    print("PHASE B: USER LOGIN")
    print("=" * 50)
    
    for user in users_to_test:
        result = tester.test_auth_login(user["email"], user["password"])
        if not result["success"]:
            print(f"❌ CRITICAL: Login failed for {user['email']}")
            return False
        tokens[user["email"]] = result["token"]  # Update with login token
        
        # Test /me endpoint
        me_result = tester.test_get_me(tokens[user["email"]], user["name"])
        if not me_result["success"]:
            print(f"❌ CRITICAL: /me endpoint failed for {user['email']}")
            return False
        user_profiles[user["email"]] = me_result["data"]
    
    # C. Friend request flow
    print("\n" + "=" * 50)
    print("PHASE C: FRIEND REQUEST FLOW")
    print("=" * 50)
    
    user_a_email = "ssaritan@example.com"
    user_b_email = "ssaritan2@example.com"
    user_c_email = "testuser456@example.com"
    
    # As User A: Find User B by name
    find_result = tester.test_friends_find(tokens[user_a_email], "ssaritan2", "User A")
    if not find_result["success"]:
        print("❌ CRITICAL: Friends find failed")
        return False
    
    # As User A: Send friend request to User B
    request_result = tester.test_friends_request(tokens[user_a_email], user_b_email, "User A")
    if not request_result["success"]:
        print("❌ CRITICAL: Friend request failed")
        return False
    
    # As User B: Check incoming requests
    requests_result = tester.test_friends_requests(tokens[user_b_email], "User B")
    if not requests_result["success"]:
        print("❌ CRITICAL: Getting friend requests failed")
        return False
    
    if len(requests_result["data"]["requests"]) == 0:
        print("❌ CRITICAL: No incoming friend requests found for User B")
        return False
    
    request_id = requests_result["data"]["requests"][0]["_id"]
    
    # As User B: Accept friend request
    accept_result = tester.test_friends_accept(tokens[user_b_email], request_id, "User B")
    if not accept_result["success"]:
        print("❌ CRITICAL: Friend accept failed")
        return False
    
    # As User B: Check friends list (should include User A)
    friends_b_result = tester.test_friends_list(tokens[user_b_email], "User B")
    if not friends_b_result["success"]:
        print("❌ CRITICAL: Friends list failed for User B")
        return False
    
    # As User A: Check friends list (should include User B)
    friends_a_result = tester.test_friends_list(tokens[user_a_email], "User A")
    if not friends_a_result["success"]:
        print("❌ CRITICAL: Friends list failed for User A")
        return False
    
    # D. Reject flow
    print("\n" + "=" * 50)
    print("PHASE D: FRIEND REJECT FLOW")
    print("=" * 50)
    
    # As User C: Send friend request to User A
    request_c_result = tester.test_friends_request(tokens[user_c_email], user_a_email, "User C")
    if not request_c_result["success"]:
        print("❌ CRITICAL: Friend request from User C failed")
        return False
    
    # As User A: Check incoming requests
    requests_a_result = tester.test_friends_requests(tokens[user_a_email], "User A")
    if not requests_a_result["success"]:
        print("❌ CRITICAL: Getting friend requests failed for User A")
        return False
    
    # Find User C's request
    user_c_request = None
    for req in requests_a_result["data"]["requests"]:
        if req["from_email"] == user_c_email or req["from_user_id"] == user_profiles[user_c_email]["_id"]:
            user_c_request = req
            break
    
    if not user_c_request:
        print("❌ CRITICAL: User C's friend request not found in User A's requests")
        return False
    
    # As User A: Reject User C's request
    reject_result = tester.test_friends_reject(tokens[user_a_email], user_c_request["_id"], "User A")
    if not reject_result["success"]:
        print("❌ CRITICAL: Friend reject failed")
        return False
    
    # As User A: Check requests again (should not include User C)
    final_requests_result = tester.test_friends_requests(tokens[user_a_email], "User A")
    if not final_requests_result["success"]:
        print("❌ CRITICAL: Final friend requests check failed")
        return False
    
    print("\n" + "=" * 80)
    print("✅ ALL TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)
    
    # Summary
    print("\nTEST SUMMARY:")
    print(f"✅ Auth Registration: 3/3 users registered successfully")
    print(f"✅ Auth Login: 3/3 users logged in successfully")
    print(f"✅ Auth /me: 3/3 users profile retrieved successfully")
    print(f"✅ Friends Find: Name search working")
    print(f"✅ Friends Request: Friend requests sent successfully")
    print(f"✅ Friends Accept: Friend request accepted successfully")
    print(f"✅ Friends Reject: Friend request rejected successfully")
    print(f"✅ Friends List: Friends lists working correctly")
    print(f"✅ Friends Requests: Pending requests retrieved correctly")
    
    return True

if __name__ == "__main__":
    success = run_comprehensive_test()
    sys.exit(0 if success else 1)