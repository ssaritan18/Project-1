#!/usr/bin/env python3
"""
Direct Chat Upload Test Suite
Tests direct chat creation and media upload functionality specifically
"""

import requests
import json
import sys
import base64
import os
import time
from typing import Dict, Optional, List

# Base URL from frontend .env
BASE_URL = "https://focus-social.preview.emergentagent.com/api"

class DirectChatUploadTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        
    def log(self, message: str, level: str = "INFO"):
        print(f"[{level}] {message}")
        
    def test_auth_login(self, email: str, password: str) -> Dict:
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

    def test_create_direct_chat_various_formats(self, token: str, friend_id: str, user_name: str) -> Dict:
        """Test creating direct chat with various ID formats"""
        self.log(f"Testing direct chat creation with friend {friend_id} by {user_name}")
        
        # Try different direct chat formats
        formats_to_try = [
            f"direct_{friend_id}",
            f"direct_{friend_id[:8]}",
            f"direct_{friend_id[:12]}",
            f"chat_{user_name.lower()}_{friend_id[:8]}"
        ]
        
        for chat_format in formats_to_try:
            self.log(f"Trying direct chat format: {chat_format}")
            
            # First try to access existing chat
            url = f"{self.base_url}/chats/{chat_format}"
            headers = {"Authorization": f"Bearer {token}"}
            
            response = self.session.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Direct chat found: {chat_format}")
                return {"success": True, "data": data, "format": chat_format}
            elif response.status_code == 404:
                self.log(f"Direct chat {chat_format} doesn't exist, trying to create...")
                
                # Try to create direct chat via POST
                create_url = f"{self.base_url}/chats/direct/{friend_id}"
                create_response = self.session.post(create_url, headers=headers)
                
                if create_response.status_code == 200:
                    data = create_response.json()
                    self.log(f"✅ Direct chat created: {data.get('_id', 'unknown')}")
                    return {"success": True, "data": data, "format": data.get('_id', chat_format)}
                else:
                    self.log(f"Failed to create direct chat: {create_response.status_code}")
            else:
                self.log(f"Error accessing {chat_format}: {response.status_code}")
        
        return {"success": False, "error": "Could not create or access direct chat in any format"}

    def test_list_chats(self, token: str, user_name: str) -> Dict:
        """Test listing user's chats to find direct chats"""
        url = f"{self.base_url}/chats"
        headers = {"Authorization": f"Bearer {token}"}
        
        self.log(f"Testing chat list for {user_name}")
        response = self.session.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "chats" in data:
                chats = data["chats"]
                direct_chats = [chat for chat in chats if chat.get("type") == "direct" or "direct_" in chat.get("_id", "")]
                self.log(f"✅ Chat list successful - found {len(chats)} total chats, {len(direct_chats)} direct chats")
                return {"success": True, "data": data, "direct_chats": direct_chats}
            else:
                self.log(f"❌ Chat list response missing 'chats' field", "ERROR")
                return {"success": False, "error": "Missing 'chats' field in response"}
        else:
            self.log(f"❌ Chat list failed for {user_name}: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}

    def generate_test_image_base64(self) -> str:
        """Generate a small test image in base64 format"""
        # Minimal JPEG (1x1 pixel)
        jpeg_data = base64.b64decode("/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A")
        return base64.b64encode(jpeg_data).decode('utf-8')

    def test_chat_media_upload(self, token: str, chat_id: str, file_data: str, filename: str, user_name: str) -> Dict:
        """Test uploading media to chat"""
        url = f"{self.base_url}/chats/{chat_id}/upload"
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create multipart form data
        files = {
            'file': (filename, base64.b64decode(file_data), 'image/jpeg')
        }
        
        self.log(f"Testing media upload to chat {chat_id} by {user_name}: {filename}")
        response = self.session.post(url, files=files, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "success" in data and data["success"] and "media_url" in data:
                self.log(f"✅ Media upload successful: {data['media_url']}")
                return {"success": True, "data": data}
            else:
                self.log(f"❌ Media upload response missing required fields", "ERROR")
                return {"success": False, "error": "Missing required fields in response"}
        else:
            self.log(f"❌ Media upload failed: {response.status_code} - {response.text}", "ERROR")
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

    def test_get_uploaded_media(self, media_url: str, user_name: str) -> Dict:
        """Test retrieving uploaded media file"""
        # Extract filename from media_url
        if media_url.startswith('/'):
            full_url = f"{self.base_url.replace('/api', '')}{media_url}"
        else:
            full_url = media_url
        
        self.log(f"Testing media file retrieval: {full_url} by {user_name}")
        response = self.session.get(full_url)
        
        if response.status_code == 200:
            content_type = response.headers.get('content-type', '')
            content_length = len(response.content)
            self.log(f"✅ Media file retrieval successful - Content-Type: {content_type}, Size: {content_length} bytes")
            return {"success": True, "content_type": content_type, "size": content_length}
        else:
            self.log(f"❌ Media file retrieval failed: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}

def run_direct_chat_upload_test():
    """
    🎯 DIRECT CHAT UPLOAD TEST - SPECIFIC REQUEST
    
    OBJECTIVE: Test direct chat creation and media upload functionality
    
    TEST REQUIREMENTS:
    1. Test direct chat creation with format direct_xyz123
    2. Test media upload to direct chats
    3. Verify file storage and serving for direct chats
    4. Test various direct chat ID formats
    """
    tester = DirectChatUploadTester()
    
    print("=" * 80)
    print("🎯 DIRECT CHAT UPLOAD TEST - SPECIFIC REQUEST")
    print("=" * 80)
    
    # Test users (using default test users)
    user1 = {"name": "ssaritan", "email": "ssaritan@example.com", "password": "Passw0rd!"}
    user2 = {"name": "ssaritan2", "email": "ssaritan2@example.com", "password": "Passw0rd!"}
    
    tokens = {}
    user_ids = {}
    
    # PHASE 1: Authentication Setup
    print("\n" + "=" * 60)
    print("PHASE 1: AUTHENTICATION SETUP")
    print("=" * 60)
    
    for user in [user1, user2]:
        login_result = tester.test_auth_login(user["email"], user["password"])
        if not login_result["success"]:
            print(f"❌ CRITICAL: Login failed for {user['email']}: {login_result.get('error', 'Unknown error')}")
            return False
        
        tokens[user["email"]] = login_result["token"]
        
        # Get user ID
        me_result = tester.test_get_me(tokens[user["email"]], user["name"])
        if not me_result["success"]:
            print(f"❌ CRITICAL: Failed to get user ID for {user['name']}")
            return False
        
        user_ids[user["email"]] = me_result["data"]["_id"]
        print(f"✅ User {user['name']} authenticated successfully - ID: {user_ids[user['email']]}")
    
    # PHASE 2: Friend Request Handling
    print("\n" + "=" * 60)
    print("PHASE 2: FRIEND REQUEST HANDLING")
    print("=" * 60)
    
    user1_email = user1["email"]
    user2_email = user2["email"]
    
    # Check for pending friend requests for user2 (ssaritan2)
    requests_result = tester.test_friends_requests(tokens[user2_email], user2["name"])
    if requests_result["success"]:
        requests = requests_result["data"]["requests"]
        print(f"📋 Found {len(requests)} pending friend requests for {user2['name']}")
        
        # Accept the first request (should be from user1)
        if requests:
            request_id = requests[0]["_id"]
            accept_result = tester.test_friends_accept(tokens[user2_email], request_id, user2["name"])
            if accept_result["success"]:
                print(f"✅ Friend request accepted successfully")
            else:
                print(f"❌ Failed to accept friend request: {accept_result.get('error', 'Unknown error')}")
        else:
            print("⚠️ No pending friend requests found")
    else:
        print(f"❌ Failed to get friend requests: {requests_result.get('error', 'Unknown error')}")
    
    # PHASE 3: List Existing Chats
    print("\n" + "=" * 60)
    print("PHASE 3: LIST EXISTING CHATS")
    print("=" * 60)
    
    chat_list_result = tester.test_list_chats(tokens[user1_email], user1["name"])
    if chat_list_result["success"]:
        direct_chats = chat_list_result["direct_chats"]
        print(f"📋 Found {len(direct_chats)} existing direct chats:")
        for chat in direct_chats:
            print(f"  - {chat.get('_id', 'unknown')} (type: {chat.get('type', 'unknown')})")
    
    # PHASE 4: Direct Chat Creation Testing
    print("\n" + "=" * 60)
    print("PHASE 4: DIRECT CHAT CREATION TESTING")
    print("=" * 60)
    
    # Test creating direct chat with user2
    direct_chat_result = tester.test_create_direct_chat_various_formats(
        tokens[user1_email], 
        user_ids[user2_email], 
        user1["name"]
    )
    
    if not direct_chat_result["success"]:
        print(f"❌ CRITICAL: Failed to create direct chat: {direct_chat_result.get('error', 'Unknown error')}")
        return False
    
    direct_chat_id = direct_chat_result["data"]["_id"]
    chat_format = direct_chat_result.get("format", "unknown")
    print(f"✅ Direct chat created/accessed: {direct_chat_id} (format: {chat_format})")
    
    # PHASE 5: Direct Chat Media Upload Testing
    print("\n" + "=" * 60)
    print("PHASE 5: DIRECT CHAT MEDIA UPLOAD TESTING")
    print("=" * 60)
    
    # Generate test image
    test_image_data = tester.generate_test_image_base64()
    
    # Test upload to direct chat
    upload_result = tester.test_chat_media_upload(
        tokens[user1_email], 
        direct_chat_id, 
        test_image_data, 
        "direct_chat_test.jpg", 
        user1["name"]
    )
    
    if not upload_result["success"]:
        print(f"❌ CRITICAL: Direct chat media upload failed: {upload_result.get('error', 'Unknown error')}")
        return False
    
    media_url = upload_result["data"]["media_url"]
    print(f"✅ Direct chat media upload successful: {media_url}")
    
    # PHASE 6: File Serving Verification
    print("\n" + "=" * 60)
    print("PHASE 6: FILE SERVING VERIFICATION")
    print("=" * 60)
    
    serve_result = tester.test_get_uploaded_media(media_url, user1["name"])
    if not serve_result["success"]:
        print(f"❌ CRITICAL: File serving failed: {serve_result.get('error', 'Unknown error')}")
        return False
    
    print(f"✅ File serving successful - Content-Type: {serve_result['content_type']}, Size: {serve_result['size']} bytes")
    
    # PHASE 7: Test Upload from Second User
    print("\n" + "=" * 60)
    print("PHASE 7: TEST UPLOAD FROM SECOND USER")
    print("=" * 60)
    
    # Test upload from user2 to the same direct chat
    upload_result2 = tester.test_chat_media_upload(
        tokens[user2_email], 
        direct_chat_id, 
        test_image_data, 
        "direct_chat_test2.jpg", 
        user2["name"]
    )
    
    if upload_result2["success"]:
        media_url2 = upload_result2["data"]["media_url"]
        print(f"✅ Second user upload successful: {media_url2}")
        
        # Verify file serving
        serve_result2 = tester.test_get_uploaded_media(media_url2, user2["name"])
        if serve_result2["success"]:
            print(f"✅ Second file serving successful - Content-Type: {serve_result2['content_type']}, Size: {serve_result2['size']} bytes")
        else:
            print(f"⚠️ Second file serving failed: {serve_result2.get('error', 'Unknown error')}")
    else:
        print(f"⚠️ Second user upload failed: {upload_result2.get('error', 'Unknown error')}")
    
    # PHASE 7: Results Summary
    print("\n" + "=" * 60)
    print("PHASE 7: DIRECT CHAT UPLOAD TEST RESULTS")
    print("=" * 60)
    
    print(f"📊 DIRECT CHAT FUNCTIONALITY TEST RESULTS:")
    print(f"  ✅ Authentication: Both users authenticated successfully")
    print(f"  ✅ Direct Chat Creation: {direct_chat_id} (format: {chat_format})")
    print(f"  ✅ Media Upload: {media_url}")
    print(f"  ✅ File Serving: Content-Type: {serve_result['content_type']}, Size: {serve_result['size']} bytes")
    
    if upload_result2["success"]:
        print(f"  ✅ Second User Upload: {media_url2}")
    else:
        print(f"  ⚠️ Second User Upload: Failed")
    
    print(f"\n🎉 DIRECT CHAT UPLOAD FUNCTIONALITY: WORKING CORRECTLY")
    print(f"   Direct chats can be created and media can be uploaded successfully")
    return True

if __name__ == "__main__":
    success = run_direct_chat_upload_test()
    sys.exit(0 if success else 1)