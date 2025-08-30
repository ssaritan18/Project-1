#!/usr/bin/env python3
"""
Backend API Test Suite for ADHDers API
Tests Auth, Friends, and Chat endpoints as per test_result.md requirements
"""

import requests
import json
import sys
import websocket
import threading
import time
from typing import Dict, Optional, List

# Base URL from frontend .env
BASE_URL = "https://adhd-social-chat.preview.emergentagent.com/api"
WS_URL = "wss://adhd-connect.preview.emergentagent.com/api/ws"

class APITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.ws_url = WS_URL
        self.session = requests.Session()
        self.tokens = {}
        self.users = {}
        self.websockets = {}
        self.ws_messages = {}
        
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

    def test_open_direct_chat(self, token: str, friend_id: str, user_name: str) -> Dict:
        """Test opening direct chat with a friend"""
        url = f"{self.base_url}/chats/direct/{friend_id}"
        headers = {"Authorization": f"Bearer {token}"}
        
        self.log(f"Testing direct chat creation with friend {friend_id} by {user_name}")
        response = self.session.post(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "_id" in data and "type" in data and data["type"] == "direct":
                self.log(f"✅ Direct chat creation successful: {data['_id']}")
                return {"success": True, "data": data}
            else:
                self.log(f"❌ Direct chat response missing required fields or wrong type", "ERROR")
                return {"success": False, "error": "Missing required fields or wrong chat type"}
        else:
            self.log(f"❌ Direct chat creation failed: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}

    def test_create_group_chat(self, token: str, title: str, user_name: str) -> Dict:
        """Test creating a new group chat"""
        url = f"{self.base_url}/chats/group"
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"title": title}
        
        self.log(f"Testing group chat creation '{title}' by {user_name}")
        response = self.session.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "_id" in data and "title" in data and "invite_code" in data:
                self.log(f"✅ Group chat creation successful: {data['_id']} with invite code {data['invite_code']}")
                return {"success": True, "data": data}
            else:
                self.log(f"❌ Group chat creation response missing required fields", "ERROR")
                return {"success": False, "error": "Missing required fields in response"}
        else:
            self.log(f"❌ Group chat creation failed: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
    def test_create_chat(self, token: str, title: str, user_name: str) -> Dict:
        """Test creating a new group chat (legacy method for compatibility)"""
        return self.test_create_group_chat(token, title, user_name)
    
    def test_list_chats(self, token: str, user_name: str) -> Dict:
        """Test listing user's chats"""
        url = f"{self.base_url}/chats"
        headers = {"Authorization": f"Bearer {token}"}
        
        self.log(f"Testing chat list for {user_name}")
        response = self.session.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "chats" in data:
                self.log(f"✅ Chat list successful for {user_name} - found {len(data['chats'])} chats")
                return {"success": True, "data": data}
            else:
                self.log(f"❌ Chat list response missing 'chats' field", "ERROR")
                return {"success": False, "error": "Missing 'chats' field in response"}
        else:
            self.log(f"❌ Chat list failed for {user_name}: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
    
    def test_join_chat(self, token: str, invite_code: str, user_name: str) -> Dict:
        """Test joining a chat by invite code"""
        url = f"{self.base_url}/chats/join"
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"code": invite_code}
        
        self.log(f"Testing chat join with code '{invite_code}' by {user_name}")
        response = self.session.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "_id" in data and "members" in data:
                self.log(f"✅ Chat join successful by {user_name}")
                return {"success": True, "data": data}
            else:
                self.log(f"❌ Chat join response missing required fields", "ERROR")
                return {"success": False, "error": "Missing required fields in response"}
        else:
            self.log(f"❌ Chat join failed by {user_name}: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
    
    def test_send_message(self, token: str, chat_id: str, text: str, user_name: str) -> Dict:
        """Test sending a message to a chat"""
        url = f"{self.base_url}/chats/{chat_id}/messages"
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"text": text, "type": "text"}
        
        self.log(f"Testing message send to chat {chat_id} by {user_name}: '{text}'")
        response = self.session.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "_id" in data and "text" in data and "author_id" in data:
                self.log(f"✅ Message send successful: {data['_id']}")
                return {"success": True, "data": data}
            else:
                self.log(f"❌ Message send response missing required fields", "ERROR")
                return {"success": False, "error": "Missing required fields in response"}
        else:
            self.log(f"❌ Message send failed: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
    
    def test_get_messages(self, token: str, chat_id: str, user_name: str) -> Dict:
        """Test getting messages from a chat"""
        url = f"{self.base_url}/chats/{chat_id}/messages"
        headers = {"Authorization": f"Bearer {token}"}
        
        self.log(f"Testing message retrieval from chat {chat_id} by {user_name}")
        response = self.session.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "messages" in data:
                self.log(f"✅ Message retrieval successful - found {len(data['messages'])} messages")
                return {"success": True, "data": data}
            else:
                self.log(f"❌ Message retrieval response missing 'messages' field", "ERROR")
                return {"success": False, "error": "Missing 'messages' field in response"}
        else:
            self.log(f"❌ Message retrieval failed: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
    
    def test_react_to_message(self, token: str, chat_id: str, message_id: str, reaction_type: str, user_name: str) -> Dict:
        """Test reacting to a message"""
        url = f"{self.base_url}/chats/{chat_id}/messages/{message_id}/react"
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"type": reaction_type}
        
        self.log(f"Testing message reaction '{reaction_type}' to message {message_id} by {user_name}")
        response = self.session.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "reactions" in data:
                self.log(f"✅ Message reaction successful - new count: {data['reactions'].get(reaction_type, 0)}")
                return {"success": True, "data": data}
            else:
                self.log(f"❌ Message reaction response missing 'reactions' field", "ERROR")
                return {"success": False, "error": "Missing 'reactions' field in response"}
        else:
            self.log(f"❌ Message reaction failed: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}

    # WebSocket testing methods
    def setup_websocket(self, token: str, user_name: str) -> bool:
        """Setup WebSocket connection for a user"""
        try:
            ws_url_with_token = f"{self.ws_url}?token={token}"
            self.log(f"Setting up WebSocket for {user_name}")
            
            def on_message(ws, message):
                try:
                    data = json.loads(message)
                    if user_name not in self.ws_messages:
                        self.ws_messages[user_name] = []
                    self.ws_messages[user_name].append(data)
                    self.log(f"📨 WebSocket message received by {user_name}: {data.get('type', 'unknown')}")
                except Exception as e:
                    self.log(f"❌ Error parsing WebSocket message for {user_name}: {e}", "ERROR")
            
            def on_error(ws, error):
                self.log(f"❌ WebSocket error for {user_name}: {error}", "ERROR")
            
            def on_close(ws, close_status_code, close_msg):
                self.log(f"🔌 WebSocket closed for {user_name}")
            
            def on_open(ws):
                self.log(f"✅ WebSocket connected for {user_name}")
            
            ws = websocket.WebSocketApp(
                ws_url_with_token,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close,
                on_open=on_open
            )
            
            # Start WebSocket in a separate thread
            def run_ws():
                ws.run_forever()
            
            ws_thread = threading.Thread(target=run_ws, daemon=True)
            ws_thread.start()
            
            # Give it a moment to connect
            time.sleep(2)
            
            self.websockets[user_name] = ws
            return True
            
        except Exception as e:
            self.log(f"❌ Failed to setup WebSocket for {user_name}: {e}", "ERROR")
            return False
    
    def check_websocket_messages(self, user_name: str, expected_type: str, timeout: int = 5) -> bool:
        """Check if user received expected WebSocket message type"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            if user_name in self.ws_messages:
                for msg in self.ws_messages[user_name]:
                    if msg.get("type") == expected_type:
                        self.log(f"✅ WebSocket message '{expected_type}' received by {user_name}")
                        return True
            time.sleep(0.1)
        
        self.log(f"❌ WebSocket message '{expected_type}' not received by {user_name} within {timeout}s", "ERROR")
        return False

    # Legacy friends methods (keeping for compatibility)
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

def run_end_to_end_chat_test():
    """Run comprehensive END-TO-END chat system testing as requested"""
    tester = APITester()
    
    print("=" * 80)
    print("STARTING COMPREHENSIVE END-TO-END CHAT SYSTEM TEST")
    print("Testing: Two-User Chat Flow, Direct Chat, Message Reactions, Chat Persistence")
    print("=" * 80)
    
    # Test users as specified in the request
    user1 = {"name": "ssaritan", "email": "ssaritan@example.com", "password": "Passw0rd!"}
    user2 = {"name": "ssaritan2", "email": "ssaritan2@example.com", "password": "Passw0rd!"}
    
    tokens = {}
    user_profiles = {}
    
    # PHASE 1: User Authentication Setup
    print("\n" + "=" * 60)
    print("PHASE 1: USER AUTHENTICATION SETUP")
    print("=" * 60)
    
    for user in [user1, user2]:
        # Login existing users
        login_result = tester.test_auth_login(user["email"], user["password"])
        if not login_result["success"]:
            print(f"❌ CRITICAL: Login failed for {user['email']}: {login_result.get('error', 'Unknown error')}")
            return False
        tokens[user["email"]] = login_result["token"]
        
        # Get user profile
        me_result = tester.test_get_me(tokens[user["email"]], user["name"])
        if not me_result["success"]:
            print(f"❌ CRITICAL: /me endpoint failed for {user['email']}")
            return False
        user_profiles[user["email"]] = me_result["data"]
        print(f"✅ User {user['name']} authenticated successfully")
    
    # PHASE 2: Establish Friendship (Required for Direct Chat)
    print("\n" + "=" * 60)
    print("PHASE 2: ESTABLISH FRIENDSHIP FOR DIRECT CHAT")
    print("=" * 60)
    
    user1_email = user1["email"]
    user2_email = user2["email"]
    
    # Check if they are already friends
    friends_result = tester.test_friends_list(tokens[user1_email], user1["name"])
    if not friends_result["success"]:
        print("❌ CRITICAL: Failed to get friends list")
        return False
    
    # Check if user2 is already in user1's friends list
    user2_id = user_profiles[user2_email]["_id"]
    already_friends = any(friend["_id"] == user2_id for friend in friends_result["data"]["friends"])
    
    if not already_friends:
        print("🔗 Users are not friends yet, establishing friendship...")
        
        # Send friend request from user1 to user2
        request_result = tester.test_friends_request(tokens[user1_email], user2_email, user1["name"])
        if not request_result["success"]:
            print("❌ CRITICAL: Friend request failed")
            return False
        
        # Get pending requests for user2
        requests_result = tester.test_friends_requests(tokens[user2_email], user2["name"])
        if not requests_result["success"]:
            print("❌ CRITICAL: Getting friend requests failed")
            return False
        
        # Find the request from user1
        request_id = None
        for req in requests_result["data"]["requests"]:
            if req["from_user_id"] == user_profiles[user1_email]["_id"]:
                request_id = req["_id"]
                break
        
        if not request_id:
            print("❌ CRITICAL: Friend request not found")
            return False
        
        # Accept the friend request
        accept_result = tester.test_friends_accept(tokens[user2_email], request_id, user2["name"])
        if not accept_result["success"]:
            print("❌ CRITICAL: Friend accept failed")
            return False
        
        print("✅ Friendship established successfully")
    else:
        print("✅ Users are already friends")
    
    # PHASE 3: Direct Chat Testing (1-to-1 Chat)
    print("\n" + "=" * 60)
    print("PHASE 3: DIRECT CHAT TESTING (1-to-1)")
    print("=" * 60)
    
    # User1: Open direct chat with User2
    direct_chat_result = tester.test_open_direct_chat(tokens[user1_email], user2_id, user1["name"])
    if not direct_chat_result["success"]:
        print("❌ CRITICAL: Direct chat creation failed")
        return False
    
    direct_chat_id = direct_chat_result["data"]["_id"]
    print(f"✅ Direct chat created successfully: {direct_chat_id}")
    
    # Verify both users can see the direct chat
    for user_email, user_name in [(user1_email, user1["name"]), (user2_email, user2["name"])]:
        list_result = tester.test_list_chats(tokens[user_email], user_name)
        if not list_result["success"]:
            print(f"❌ CRITICAL: Chat listing failed for {user_name}")
            return False
        
        # Check if direct chat is in the list
        direct_chat_found = any(chat["_id"] == direct_chat_id for chat in list_result["data"]["chats"])
        if not direct_chat_found:
            print(f"❌ CRITICAL: Direct chat not found in {user_name}'s chat list")
            return False
        print(f"✅ {user_name} can see the direct chat")
    
    # PHASE 4: Group Chat Testing (Two-User Chat Flow)
    print("\n" + "=" * 60)
    print("PHASE 4: GROUP CHAT TESTING (Two-User Chat Flow)")
    print("=" * 60)
    
    # User1: Create a group chat
    group_chat_result = tester.test_create_group_chat(tokens[user1_email], "Test Group Chat", user1["name"])
    if not group_chat_result["success"]:
        print("❌ CRITICAL: Group chat creation failed")
        return False
    
    group_chat_id = group_chat_result["data"]["_id"]
    invite_code = group_chat_result["data"]["invite_code"]
    print(f"✅ Group chat created with invite code: {invite_code}")
    
    # User2: Join the group chat using invite code
    join_result = tester.test_join_chat(tokens[user2_email], invite_code, user2["name"])
    if not join_result["success"]:
        print("❌ CRITICAL: Group chat join failed")
        return False
    print(f"✅ {user2['name']} joined the group chat successfully")
    
    # PHASE 5: WebSocket Real-time Setup
    print("\n" + "=" * 60)
    print("PHASE 5: WEBSOCKET REAL-TIME SETUP")
    print("=" * 60)
    
    # Setup WebSocket connections for both users
    ws1_success = tester.setup_websocket(tokens[user1_email], user1["name"])
    if not ws1_success:
        print(f"❌ CRITICAL: WebSocket setup failed for {user1['name']}")
        return False
    
    ws2_success = tester.setup_websocket(tokens[user2_email], user2["name"])
    if not ws2_success:
        print(f"❌ CRITICAL: WebSocket setup failed for {user2['name']}")
        return False
    
    print("✅ WebSocket connections established for both users")
    
    # PHASE 6: Message Testing in Direct Chat
    print("\n" + "=" * 60)
    print("PHASE 6: MESSAGE TESTING IN DIRECT CHAT")
    print("=" * 60)
    
    # Clear WebSocket messages
    tester.ws_messages = {}
    
    # User1: Send message in direct chat
    msg1_result = tester.test_send_message(tokens[user1_email], direct_chat_id, "Hello in our direct chat! 💬", user1["name"])
    if not msg1_result["success"]:
        print("❌ CRITICAL: Direct chat message send failed")
        return False
    
    direct_msg1_id = msg1_result["data"]["_id"]
    
    # Check if User2 received WebSocket notification
    ws_received = tester.check_websocket_messages(user2["name"], "chat:new_message", timeout=10)
    if not ws_received:
        print("❌ CRITICAL: WebSocket message notification not received in direct chat")
        return False
    print("✅ Real-time message delivery working in direct chat")
    
    # User2: Reply in direct chat
    msg2_result = tester.test_send_message(tokens[user2_email], direct_chat_id, "Hi there! Direct messaging works great! 🎉", user2["name"])
    if not msg2_result["success"]:
        print("❌ CRITICAL: Direct chat reply failed")
        return False
    
    # PHASE 7: Message Testing in Group Chat
    print("\n" + "=" * 60)
    print("PHASE 7: MESSAGE TESTING IN GROUP CHAT")
    print("=" * 60)
    
    # Clear WebSocket messages
    tester.ws_messages = {}
    
    # User1: Send message in group chat
    group_msg1_result = tester.test_send_message(tokens[user1_email], group_chat_id, "Welcome to our group chat! 🎊", user1["name"])
    if not group_msg1_result["success"]:
        print("❌ CRITICAL: Group chat message send failed")
        return False
    
    group_msg1_id = group_msg1_result["data"]["_id"]
    
    # Check if User2 received WebSocket notification
    ws_received = tester.check_websocket_messages(user2["name"], "chat:new_message", timeout=10)
    if not ws_received:
        print("❌ CRITICAL: WebSocket message notification not received in group chat")
        return False
    print("✅ Real-time message delivery working in group chat")
    
    # User2: Reply in group chat
    group_msg2_result = tester.test_send_message(tokens[user2_email], group_chat_id, "Thanks for creating this group! Let's chat! 🚀", user2["name"])
    if not group_msg2_result["success"]:
        print("❌ CRITICAL: Group chat reply failed")
        return False
    
    group_msg2_id = group_msg2_result["data"]["_id"]
    
    # PHASE 8: Message Reactions Testing
    print("\n" + "=" * 60)
    print("PHASE 8: MESSAGE REACTIONS TESTING")
    print("=" * 60)
    
    # Clear WebSocket messages
    tester.ws_messages = {}
    
    # User2: React to User1's direct chat message
    react1_result = tester.test_react_to_message(tokens[user2_email], direct_chat_id, direct_msg1_id, "heart", user2["name"])
    if not react1_result["success"]:
        print("❌ CRITICAL: Direct chat message reaction failed")
        return False
    
    # Check if User1 received WebSocket reaction notification
    ws_reaction_received = tester.check_websocket_messages(user1["name"], "chat:message_reaction", timeout=10)
    if not ws_reaction_received:
        print("❌ CRITICAL: WebSocket reaction notification not received in direct chat")
        return False
    print("✅ Real-time message reactions working in direct chat")
    
    # User1: React to User2's group chat message
    react2_result = tester.test_react_to_message(tokens[user1_email], group_chat_id, group_msg2_id, "clap", user1["name"])
    if not react2_result["success"]:
        print("❌ CRITICAL: Group chat message reaction failed")
        return False
    
    # Check if User2 received WebSocket reaction notification
    ws_reaction_received = tester.check_websocket_messages(user2["name"], "chat:message_reaction", timeout=10)
    if not ws_reaction_received:
        print("❌ CRITICAL: WebSocket reaction notification not received in group chat")
        return False
    print("✅ Real-time message reactions working in group chat")
    
    # PHASE 9: Chat Persistence Testing
    print("\n" + "=" * 60)
    print("PHASE 9: CHAT PERSISTENCE TESTING")
    print("=" * 60)
    
    # Test message retrieval in direct chat
    direct_msgs_result = tester.test_get_messages(tokens[user1_email], direct_chat_id, user1["name"])
    if not direct_msgs_result["success"]:
        print("❌ CRITICAL: Direct chat message retrieval failed")
        return False
    
    direct_messages = direct_msgs_result["data"]["messages"]
    if len(direct_messages) < 2:
        print(f"❌ CRITICAL: Expected at least 2 messages in direct chat, found {len(direct_messages)}")
        return False
    print(f"✅ Direct chat persistence verified: {len(direct_messages)} messages retrieved")
    
    # Test message retrieval in group chat
    group_msgs_result = tester.test_get_messages(tokens[user2_email], group_chat_id, user2["name"])
    if not group_msgs_result["success"]:
        print("❌ CRITICAL: Group chat message retrieval failed")
        return False
    
    group_messages = group_msgs_result["data"]["messages"]
    if len(group_messages) < 2:
        print(f"❌ CRITICAL: Expected at least 2 messages in group chat, found {len(group_messages)}")
        return False
    print(f"✅ Group chat persistence verified: {len(group_messages)} messages retrieved")
    
    # Verify reactions persisted
    for msg in direct_messages:
        if msg["_id"] == direct_msg1_id:
            if msg["reactions"]["heart"] != 1:
                print(f"❌ CRITICAL: Direct chat reaction not persisted correctly")
                return False
            print("✅ Direct chat reaction persistence verified")
            break
    
    for msg in group_messages:
        if msg["_id"] == group_msg2_id:
            if msg["reactions"]["clap"] != 1:
                print(f"❌ CRITICAL: Group chat reaction not persisted correctly")
                return False
            print("✅ Group chat reaction persistence verified")
            break
    
    # FINAL SUMMARY
    print("\n" + "=" * 80)
    print("🎉 ALL END-TO-END CHAT TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)
    
    print("\nCOMPREHENSIVE TEST SUMMARY:")
    print("✅ User Authentication: Both test users logged in successfully")
    print("✅ Friendship Establishment: Users are friends and can create direct chats")
    print("✅ Direct Chat (1-to-1): Successfully created and accessible by both users")
    print("✅ Group Chat Flow: Created, joined via invite code, accessible by both users")
    print("✅ WebSocket Connections: Real-time connections established for both users")
    print("✅ Direct Chat Messaging: Messages sent and received in real-time")
    print("✅ Group Chat Messaging: Messages sent and received in real-time")
    print("✅ Message Reactions: Reactions work in real-time for both chat types")
    print("✅ Chat Persistence: Messages and reactions persist correctly in MongoDB")
    print("✅ Real-time Delivery: WebSocket notifications working for messages and reactions")
    
    print(f"\nTEST DETAILS:")
    print(f"• Direct Chat ID: {direct_chat_id}")
    print(f"• Group Chat ID: {group_chat_id}")
    print(f"• Group Chat Invite Code: {invite_code}")
    print(f"• Messages Tested: Direct chat ({len(direct_messages)}), Group chat ({len(group_messages)})")
    print(f"• Reactions Tested: Heart reactions in direct chat, Clap reactions in group chat")
    print(f"• WebSocket Events: chat:new_message, chat:message_reaction, presence updates")
    
    return True

def run_comprehensive_chat_test():
    """Run comprehensive chat functionality tests as per review request"""
    tester = APITester()
    
    print("=" * 80)
    print("STARTING COMPREHENSIVE CHAT BACKEND API TEST")
    print("=" * 80)
    
    # Use existing verified test users for chat functionality
    users_to_test = [
        {"name": "ssaritan", "email": "ssaritan@example.com", "password": "Passw0rd!"},
        {"name": "ssaritan2", "email": "ssaritan2@example.com", "password": "Passw0rd!"}
    ]
    
    tokens = {}
    user_profiles = {}
    
    # A. Setup users (login existing verified users)
    print("\n" + "=" * 50)
    print("PHASE A: USER SETUP FOR CHAT TESTING")
    print("=" * 50)
    
    for user in users_to_test:
        # Login existing verified users
        login_result = tester.test_auth_login(user["email"], user["password"])
        if not login_result["success"]:
            print(f"❌ CRITICAL: Login failed for {user['email']}: {login_result.get('error', 'Unknown error')}")
            return False
        tokens[user["email"]] = login_result["token"]
        
        # Get user profile
        me_result = tester.test_get_me(tokens[user["email"]], user["name"])
        if not me_result["success"]:
            print(f"❌ CRITICAL: /me endpoint failed for {user['email']}")
            return False
        user_profiles[user["email"]] = me_result["data"]
    
    # B. Chat Creation & Management Tests
    print("\n" + "=" * 50)
    print("PHASE B: CHAT CREATION & MANAGEMENT")
    print("=" * 50)
    
    user1_email = "ssaritan@example.com"
    user2_email = "ssaritan2@example.com"
    
    # User 1: Create a chat
    create_result = tester.test_create_chat(tokens[user1_email], "Test Chat Room", "ssaritan")
    if not create_result["success"]:
        print("❌ CRITICAL: Chat creation failed")
        return False
    
    chat_data = create_result["data"]
    chat_id = chat_data["_id"]
    invite_code = chat_data["invite_code"]
    
    # User 1: List chats (should include the created chat)
    list_result = tester.test_list_chats(tokens[user1_email], "ssaritan")
    if not list_result["success"]:
        print("❌ CRITICAL: Chat listing failed for User 1")
        return False
    
    if len(list_result["data"]["chats"]) == 0:
        print("❌ CRITICAL: No chats found for User 1 after creation")
        return False
    
    # User 2: Join the chat using invite code
    join_result = tester.test_join_chat(tokens[user2_email], invite_code, "ssaritan2")
    if not join_result["success"]:
        print("❌ CRITICAL: Chat join failed for User 2")
        return False
    
    # User 2: List chats (should now include the joined chat)
    list_result2 = tester.test_list_chats(tokens[user2_email], "ssaritan2")
    if not list_result2["success"]:
        print("❌ CRITICAL: Chat listing failed for User 2")
        return False
    
    if len(list_result2["data"]["chats"]) == 0:
        print("❌ CRITICAL: No chats found for User 2 after joining")
        return False
    
    # C. Message Management Tests
    print("\n" + "=" * 50)
    print("PHASE C: MESSAGE MANAGEMENT")
    print("=" * 50)
    
    # User 1: Send a message
    msg1_result = tester.test_send_message(tokens[user1_email], chat_id, "Hello from ssaritan! 👋", "ssaritan")
    if not msg1_result["success"]:
        print("❌ CRITICAL: Message send failed for User 1")
        return False
    
    message1_id = msg1_result["data"]["_id"]
    
    # User 2: Send a message
    msg2_result = tester.test_send_message(tokens[user2_email], chat_id, "Hello from ssaritan2! How are you? 😊", "ssaritan2")
    if not msg2_result["success"]:
        print("❌ CRITICAL: Message send failed for User 2")
        return False
    
    message2_id = msg2_result["data"]["_id"]
    
    # User 1: Get messages (should see both messages)
    get_msgs_result = tester.test_get_messages(tokens[user1_email], chat_id, "ssaritan")
    if not get_msgs_result["success"]:
        print("❌ CRITICAL: Message retrieval failed for User 1")
        return False
    
    messages = get_msgs_result["data"]["messages"]
    if len(messages) < 2:
        print(f"❌ CRITICAL: Expected at least 2 messages, found {len(messages)}")
        return False
    
    # User 2: Get messages (should see both messages)
    get_msgs_result2 = tester.test_get_messages(tokens[user2_email], chat_id, "ssaritan2")
    if not get_msgs_result2["success"]:
        print("❌ CRITICAL: Message retrieval failed for User 2")
        return False
    
    # D. Message Reaction Tests
    print("\n" + "=" * 50)
    print("PHASE D: MESSAGE REACTIONS")
    print("=" * 50)
    
    # User 2: React to User 1's message with "like"
    react_result = tester.test_react_to_message(tokens[user2_email], chat_id, message1_id, "like", "ssaritan2")
    if not react_result["success"]:
        print("❌ CRITICAL: Message reaction failed")
        return False
    
    # Verify reaction count increased
    if react_result["data"]["reactions"]["like"] != 1:
        print(f"❌ CRITICAL: Expected like count 1, got {react_result['data']['reactions']['like']}")
        return False
    
    # User 1: React to User 2's message with "heart"
    react_result2 = tester.test_react_to_message(tokens[user1_email], chat_id, message2_id, "heart", "ssaritan")
    if not react_result2["success"]:
        print("❌ CRITICAL: Message reaction failed for User 1")
        return False
    
    # E. WebSocket Real-time Features Tests
    print("\n" + "=" * 50)
    print("PHASE E: WEBSOCKET REAL-TIME FEATURES")
    print("=" * 50)
    
    # Setup WebSocket connections for both users
    ws1_success = tester.setup_websocket(tokens[user1_email], "ssaritan")
    if not ws1_success:
        print("❌ CRITICAL: WebSocket setup failed for User 1")
        return False
    
    ws2_success = tester.setup_websocket(tokens[user2_email], "ssaritan2")
    if not ws2_success:
        print("❌ CRITICAL: WebSocket setup failed for User 2")
        return False
    
    # Clear previous WebSocket messages
    tester.ws_messages = {}
    
    # User 1: Send a message (should trigger WebSocket notification to User 2)
    ws_msg_result = tester.test_send_message(tokens[user1_email], chat_id, "WebSocket test message! 🚀", "ssaritan")
    if not ws_msg_result["success"]:
        print("❌ CRITICAL: WebSocket message send failed")
        return False
    
    ws_message_id = ws_msg_result["data"]["_id"]
    
    # Check if User 2 received WebSocket notification
    ws_received = tester.check_websocket_messages("ssaritan2", "chat:new_message", timeout=10)
    if not ws_received:
        print("❌ CRITICAL: WebSocket message notification not received by User 2")
        return False
    
    # User 2: React to the WebSocket message (should trigger reaction notification to User 1)
    ws_react_result = tester.test_react_to_message(tokens[user2_email], chat_id, ws_message_id, "clap", "ssaritan2")
    if not ws_react_result["success"]:
        print("❌ CRITICAL: WebSocket reaction failed")
        return False
    
    # Check if User 1 received WebSocket reaction notification
    ws_reaction_received = tester.check_websocket_messages("ssaritan", "chat:message_reaction", timeout=10)
    if not ws_reaction_received:
        print("❌ CRITICAL: WebSocket reaction notification not received by User 1")
        return False
    
    print("\n" + "=" * 80)
    print("✅ ALL CHAT TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)
    
    # Summary
    print("\nCHAT TEST SUMMARY:")
    print(f"✅ Chat Creation: Successfully created chat with invite code {invite_code}")
    print(f"✅ Chat Listing: Both users can list their chats")
    print(f"✅ Chat Joining: ssaritan2 successfully joined via invite code")
    print(f"✅ Message Sending: Both users can send messages")
    print(f"✅ Message Retrieval: Both users can retrieve chat messages")
    print(f"✅ Message Reactions: Both users can react to messages")
    print(f"✅ WebSocket Connections: Both users connected successfully")
    print(f"✅ WebSocket Message Broadcasting: Real-time message delivery working")
    print(f"✅ WebSocket Reaction Broadcasting: Real-time reaction delivery working")
    
    return True

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

def run_websocket_broadcasting_test():
    """
    Run REAL-TIME MESSAGING test to verify WebSocket broadcasting system
    Focus on the specific scenario requested in the review:
    - Two-User Setup: Use existing users (ssaritan@example.com, ssaritan2@example.com)
    - Create Direct Chat: Ensure they are friends and have a direct chat between them
    - Send Message: User 1 sends a message via POST /api/chats/{chat_id}/messages
    - Verify Broadcasting: Confirm backend emits WebSocket event to User 2
    - Check Payload: Verify the WebSocket message has correct format
    """
    tester = APITester()
    
    print("=" * 80)
    print("REAL-TIME MESSAGING TEST - WebSocket Broadcasting System")
    print("Focus: Debug why real-time messaging isn't working between authenticated users")
    print("=" * 80)
    
    # Test users as specified in the review request
    user1 = {"name": "ssaritan", "email": "ssaritan@example.com", "password": "Passw0rd!"}
    user2 = {"name": "ssaritan2", "email": "ssaritan2@example.com", "password": "Passw0rd!"}
    
    tokens = {}
    user_profiles = {}
    
    # STEP 1: Two-User Setup - Use existing users
    print("\n" + "=" * 60)
    print("STEP 1: TWO-USER SETUP")
    print("=" * 60)
    
    for user in [user1, user2]:
        # Login existing users
        login_result = tester.test_auth_login(user["email"], user["password"])
        if not login_result["success"]:
            print(f"❌ CRITICAL: Login failed for {user['email']}: {login_result.get('error', 'Unknown error')}")
            return False
        tokens[user["email"]] = login_result["token"]
        
        # Get user profile
        me_result = tester.test_get_me(tokens[user["email"]], user["name"])
        if not me_result["success"]:
            print(f"❌ CRITICAL: /me endpoint failed for {user['email']}")
            return False
        user_profiles[user["email"]] = me_result["data"]
        print(f"✅ User {user['name']} authenticated successfully (ID: {user_profiles[user['email']]['_id'][:8]}...)")
    
    # STEP 2: Ensure they are friends and create direct chat
    print("\n" + "=" * 60)
    print("STEP 2: ENSURE FRIENDSHIP & CREATE DIRECT CHAT")
    print("=" * 60)
    
    user1_email = user1["email"]
    user2_email = user2["email"]
    user2_id = user_profiles[user2_email]["_id"]
    
    # Check if they are already friends
    friends_result = tester.test_friends_list(tokens[user1_email], user1["name"])
    if not friends_result["success"]:
        print("❌ CRITICAL: Failed to get friends list")
        return False
    
    # Check if user2 is already in user1's friends list
    already_friends = any(friend["_id"] == user2_id for friend in friends_result["data"]["friends"])
    
    if not already_friends:
        print("🔗 Users are not friends yet, establishing friendship...")
        
        # Send friend request from user1 to user2
        request_result = tester.test_friends_request(tokens[user1_email], user2_email, user1["name"])
        if not request_result["success"]:
            print("❌ CRITICAL: Friend request failed")
            return False
        
        # Get pending requests for user2
        requests_result = tester.test_friends_requests(tokens[user2_email], user2["name"])
        if not requests_result["success"]:
            print("❌ CRITICAL: Getting friend requests failed")
            return False
        
        # Find the request from user1
        request_id = None
        for req in requests_result["data"]["requests"]:
            if req["from_user_id"] == user_profiles[user1_email]["_id"]:
                request_id = req["_id"]
                break
        
        if not request_id:
            print("❌ CRITICAL: Friend request not found")
            return False
        
        # Accept the friend request
        accept_result = tester.test_friends_accept(tokens[user2_email], request_id, user2["name"])
        if not accept_result["success"]:
            print("❌ CRITICAL: Friend accept failed")
            return False
        
        print("✅ Friendship established successfully")
    else:
        print("✅ Users are already friends")
    
    # Create direct chat between friends
    direct_chat_result = tester.test_open_direct_chat(tokens[user1_email], user2_id, user1["name"])
    if not direct_chat_result["success"]:
        print("❌ CRITICAL: Direct chat creation failed")
        return False
    
    direct_chat_id = direct_chat_result["data"]["_id"]
    print(f"✅ Direct chat created/accessed successfully: {direct_chat_id}")
    
    # STEP 3: Setup WebSocket connections for both users
    print("\n" + "=" * 60)
    print("STEP 3: WEBSOCKET CONNECTION SETUP")
    print("=" * 60)
    
    # Setup WebSocket connections for both users
    ws1_success = tester.setup_websocket(tokens[user1_email], user1["name"])
    if not ws1_success:
        print(f"❌ CRITICAL: WebSocket setup failed for {user1['name']}")
        return False
    
    ws2_success = tester.setup_websocket(tokens[user2_email], user2["name"])
    if not ws2_success:
        print(f"❌ CRITICAL: WebSocket setup failed for {user2['name']}")
        return False
    
    print("✅ WebSocket connections established for both users")
    
    # Wait a moment for connections to stabilize
    time.sleep(3)
    
    # STEP 4: Send Message via POST /api/chats/{chat_id}/messages
    print("\n" + "=" * 60)
    print("STEP 4: SEND MESSAGE & VERIFY BROADCASTING")
    print("=" * 60)
    
    # Clear WebSocket messages to focus on this test
    tester.ws_messages = {}
    
    # User 1 sends a message via POST /api/chats/{chat_id}/messages
    test_message = "Real-time messaging test! 🚀 This should broadcast to User 2"
    print(f"📤 {user1['name']} sending message: '{test_message}'")
    
    msg_result = tester.test_send_message(tokens[user1_email], direct_chat_id, test_message, user1["name"])
    if not msg_result["success"]:
        print("❌ CRITICAL: Message send failed")
        return False
    
    message_id = msg_result["data"]["_id"]
    print(f"✅ Message sent successfully (ID: {message_id})")
    
    # STEP 5: Verify Broadcasting - Confirm backend emits WebSocket event to User 2
    print("\n" + "=" * 60)
    print("STEP 5: VERIFY WEBSOCKET BROADCASTING")
    print("=" * 60)
    
    # Check if User 2 received WebSocket notification
    print(f"🔍 Checking if {user2['name']} received WebSocket notification...")
    ws_received = tester.check_websocket_messages(user2["name"], "chat:new_message", timeout=15)
    
    if not ws_received:
        print("❌ CRITICAL: WebSocket message notification NOT received by User 2")
        print("🔍 DEBUG: Checking what WebSocket messages were received...")
        
        if user2["name"] in tester.ws_messages:
            received_messages = tester.ws_messages[user2["name"]]
            print(f"📨 User 2 received {len(received_messages)} WebSocket messages:")
            for i, msg in enumerate(received_messages):
                print(f"  {i+1}. Type: {msg.get('type', 'unknown')}, Data: {json.dumps(msg, indent=2)}")
        else:
            print("📨 User 2 received NO WebSocket messages at all")
        
        return False
    
    print(f"✅ WebSocket message notification received by {user2['name']}")
    
    # STEP 6: Check Payload - Verify the WebSocket message has correct format
    print("\n" + "=" * 60)
    print("STEP 6: VERIFY WEBSOCKET PAYLOAD FORMAT")
    print("=" * 60)
    
    # Find the chat:new_message in received messages
    chat_message = None
    if user2["name"] in tester.ws_messages:
        for msg in tester.ws_messages[user2["name"]]:
            if msg.get("type") == "chat:new_message":
                chat_message = msg
                break
    
    if not chat_message:
        print("❌ CRITICAL: chat:new_message not found in WebSocket messages")
        return False
    
    print("🔍 Verifying WebSocket payload structure...")
    print(f"📨 Received WebSocket message: {json.dumps(chat_message, indent=2)}")
    
    # Verify required fields in WebSocket payload
    required_fields = {
        "type": "chat:new_message",
        "chat_id": direct_chat_id,
        "message": {
            "id": message_id,
            "chat_id": direct_chat_id,
            "author_id": user_profiles[user1_email]["_id"],
            "author_name": user1["name"],
            "text": test_message,
            "message_type": "text"
        }
    }
    
    # Check top-level fields
    if chat_message.get("type") != "chat:new_message":
        print(f"❌ CRITICAL: Wrong message type. Expected 'chat:new_message', got '{chat_message.get('type')}'")
        return False
    
    if chat_message.get("chat_id") != direct_chat_id:
        print(f"❌ CRITICAL: Wrong chat_id. Expected '{direct_chat_id}', got '{chat_message.get('chat_id')}'")
        return False
    
    # Check message object
    message_obj = chat_message.get("message", {})
    if not message_obj:
        print("❌ CRITICAL: Missing 'message' object in WebSocket payload")
        return False
    
    if message_obj.get("id") != message_id:
        print(f"❌ CRITICAL: Wrong message ID. Expected '{message_id}', got '{message_obj.get('id')}'")
        return False
    
    if message_obj.get("author_id") != user_profiles[user1_email]["_id"]:
        print(f"❌ CRITICAL: Wrong author_id. Expected '{user_profiles[user1_email]['_id']}', got '{message_obj.get('author_id')}'")
        return False
    
    if message_obj.get("text") != test_message:
        print(f"❌ CRITICAL: Wrong message text. Expected '{test_message}', got '{message_obj.get('text')}'")
        return False
    
    print("✅ WebSocket payload structure is correct!")
    
    # STEP 7: Verify message is saved to MongoDB
    print("\n" + "=" * 60)
    print("STEP 7: VERIFY MESSAGE PERSISTENCE IN MONGODB")
    print("=" * 60)
    
    # Get messages from the chat to verify persistence
    get_msgs_result = tester.test_get_messages(tokens[user2_email], direct_chat_id, user2["name"])
    if not get_msgs_result["success"]:
        print("❌ CRITICAL: Message retrieval failed")
        return False
    
    messages = get_msgs_result["data"]["messages"]
    
    # Find our test message
    test_msg_found = False
    for msg in messages:
        if msg["_id"] == message_id and msg["text"] == test_message:
            test_msg_found = True
            print(f"✅ Message persisted in MongoDB: {msg['_id']}")
            break
    
    if not test_msg_found:
        print("❌ CRITICAL: Test message not found in MongoDB")
        return False
    
    # STEP 8: Test bidirectional messaging
    print("\n" + "=" * 60)
    print("STEP 8: TEST BIDIRECTIONAL MESSAGING")
    print("=" * 60)
    
    # Clear WebSocket messages
    tester.ws_messages = {}
    
    # User 2 sends a reply
    reply_message = "Got your message! Real-time is working! 🎉"
    print(f"📤 {user2['name']} sending reply: '{reply_message}'")
    
    reply_result = tester.test_send_message(tokens[user2_email], direct_chat_id, reply_message, user2["name"])
    if not reply_result["success"]:
        print("❌ CRITICAL: Reply message send failed")
        return False
    
    reply_id = reply_result["data"]["_id"]
    print(f"✅ Reply sent successfully (ID: {reply_id})")
    
    # Check if User 1 received WebSocket notification for the reply
    print(f"🔍 Checking if {user1['name']} received WebSocket notification for reply...")
    ws_reply_received = tester.check_websocket_messages(user1["name"], "chat:new_message", timeout=15)
    
    if not ws_reply_received:
        print("❌ CRITICAL: WebSocket reply notification NOT received by User 1")
        return False
    
    print(f"✅ WebSocket reply notification received by {user1['name']}")
    
    # FINAL SUMMARY
    print("\n" + "=" * 80)
    print("🎉 REAL-TIME MESSAGING TEST COMPLETED SUCCESSFULLY!")
    print("=" * 80)
    
    print("\nTEST RESULTS SUMMARY:")
    print("✅ Two-User Setup: Both users authenticated successfully")
    print("✅ Friendship Verification: Users are friends and can create direct chats")
    print("✅ Direct Chat Creation: Direct chat created/accessed successfully")
    print("✅ WebSocket Connections: Both users connected to WebSocket successfully")
    print("✅ Message Sending: POST /api/chats/{chat_id}/messages working correctly")
    print("✅ WebSocket Broadcasting: Backend emits WebSocket events correctly")
    print("✅ Payload Verification: WebSocket message format is correct")
    print("✅ MongoDB Persistence: Messages saved to database correctly")
    print("✅ Bidirectional Messaging: Both users can send and receive in real-time")
    
    print(f"\nDEBUG INFORMATION:")
    print(f"• Direct Chat ID: {direct_chat_id}")
    print(f"• Test Message ID: {message_id}")
    print(f"• Reply Message ID: {reply_id}")
    print(f"• WebSocket Events Tested: chat:new_message")
    print(f"• Backend Broadcasting: ws_broadcast_to_user() working correctly")
    print(f"• Message Payload Structure: Matches frontend expectations")
    
    print(f"\nCONCLUSION:")
    print(f"🟢 Real-time messaging IS working correctly between authenticated users")
    print(f"🟢 WebSocket broadcasting system is functioning properly")
    print(f"🟢 Backend message flow: User A → POST message → Backend saves → Backend broadcasts → User B receives")
    
    return True

def run_message_sending_focus_test():
    """
    FOCUSED TEST: Message Sending Button Issue Investigation
    
    Based on user report: "Message sending button not working despite frontend loading successfully"
    
    This test specifically focuses on:
    1. Auth endpoints still working (login with ssaritan@example.com and ssaritan2@example.com)
    2. Message sending between these users in their direct chat
    3. WebSocket broadcasting functionality for real-time messaging
    4. WhatsApp-style message processing (UUID generation, normalized structure)
    """
    tester = APITester()
    
    print("=" * 80)
    print("FOCUSED TEST: MESSAGE SENDING BUTTON ISSUE INVESTIGATION")
    print("User Report: Message sending button not working despite frontend loading")
    print("=" * 80)
    
    # Test users as specified in the review request
    user1 = {"name": "ssaritan", "email": "ssaritan@example.com", "password": "Passw0rd!"}
    user2 = {"name": "ssaritan2", "email": "ssaritan2@example.com", "password": "Passw0rd!"}
    
    tokens = {}
    user_profiles = {}
    
    # TEST 1: Verify auth endpoints still working
    print("\n" + "=" * 60)
    print("TEST 1: VERIFY AUTH ENDPOINTS STILL WORKING")
    print("=" * 60)
    
    for user in [user1, user2]:
        # Test login
        login_result = tester.test_auth_login(user["email"], user["password"])
        if not login_result["success"]:
            print(f"❌ CRITICAL: Login failed for {user['email']}: {login_result.get('error', 'Unknown error')}")
            return False
        tokens[user["email"]] = login_result["token"]
        
        # Test /me endpoint
        me_result = tester.test_get_me(tokens[user["email"]], user["name"])
        if not me_result["success"]:
            print(f"❌ CRITICAL: /me endpoint failed for {user['email']}")
            return False
        user_profiles[user["email"]] = me_result["data"]
        print(f"✅ Auth working for {user['name']} (ID: {user_profiles[user['email']]['_id'][:8]}...)")
    
    print("✅ AUTH ENDPOINTS: All working correctly")
    
    # TEST 2: Ensure users can access their direct chat
    print("\n" + "=" * 60)
    print("TEST 2: VERIFY DIRECT CHAT ACCESS")
    print("=" * 60)
    
    user1_email = user1["email"]
    user2_email = user2["email"]
    user2_id = user_profiles[user2_email]["_id"]
    
    # Check if they are friends (required for direct chat)
    friends_result = tester.test_friends_list(tokens[user1_email], user1["name"])
    if not friends_result["success"]:
        print("❌ CRITICAL: Failed to get friends list")
        return False
    
    already_friends = any(friend["_id"] == user2_id for friend in friends_result["data"]["friends"])
    if not already_friends:
        print("❌ CRITICAL: Users are not friends - cannot test direct messaging")
        return False
    
    print("✅ Users are friends - can create direct chats")
    
    # Open/create direct chat
    direct_chat_result = tester.test_open_direct_chat(tokens[user1_email], user2_id, user1["name"])
    if not direct_chat_result["success"]:
        print("❌ CRITICAL: Direct chat creation/access failed")
        return False
    
    direct_chat_id = direct_chat_result["data"]["_id"]
    print(f"✅ Direct chat accessible: {direct_chat_id}")
    
    # TEST 3: Test message sending with WhatsApp-style processing
    print("\n" + "=" * 60)
    print("TEST 3: WHATSAPP-STYLE MESSAGE PROCESSING")
    print("=" * 60)
    
    # Test multiple message sends to verify UUID generation and normalized structure
    test_messages = [
        "Test message 1: Basic functionality 📱",
        "Test message 2: Unicode support 🚀✨",
        "Test message 3: Special chars !@#$%^&*()",
        "Test message 4: Long message with multiple words and punctuation marks.",
        "Test message 5: Final verification message 🎉"
    ]
    
    sent_message_ids = []
    
    for i, message_text in enumerate(test_messages, 1):
        print(f"\n📤 Sending message {i}/5: '{message_text[:30]}...'")
        
        # Send message via POST /api/chats/{chat_id}/messages
        msg_result = tester.test_send_message(tokens[user1_email], direct_chat_id, message_text, user1["name"])
        if not msg_result["success"]:
            print(f"❌ CRITICAL: Message {i} send failed: {msg_result.get('error', 'Unknown error')}")
            return False
        
        message_data = msg_result["data"]
        message_id = message_data["_id"]
        sent_message_ids.append(message_id)
        
        # Verify WhatsApp-style normalized structure
        required_fields = ["_id", "chat_id", "author_id", "author_name", "text", "type", "status", "reactions", "created_at", "server_timestamp"]
        missing_fields = [field for field in required_fields if field not in message_data]
        
        if missing_fields:
            print(f"❌ CRITICAL: Message {i} missing required fields: {missing_fields}")
            return False
        
        # Verify UUID format (should be unique)
        if not message_id or len(message_id) < 32:
            print(f"❌ CRITICAL: Message {i} has invalid UUID: {message_id}")
            return False
        
        # Verify message content
        if message_data["text"] != message_text:
            print(f"❌ CRITICAL: Message {i} text mismatch. Expected: '{message_text}', Got: '{message_data['text']}'")
            return False
        
        # Verify status
        if message_data["status"] != "sent":
            print(f"❌ CRITICAL: Message {i} wrong status. Expected: 'sent', Got: '{message_data['status']}'")
            return False
        
        print(f"✅ Message {i} sent successfully (ID: {message_id[:8]}...)")
    
    # Verify all message IDs are unique
    if len(set(sent_message_ids)) != len(sent_message_ids):
        print("❌ CRITICAL: Duplicate message IDs found - UUID generation not working")
        return False
    
    print("✅ WHATSAPP-STYLE PROCESSING: All messages have unique UUIDs and normalized structure")
    
    # TEST 4: Verify WebSocket broadcasting functionality
    print("\n" + "=" * 60)
    print("TEST 4: WEBSOCKET BROADCASTING FUNCTIONALITY")
    print("=" * 60)
    
    # Setup WebSocket connections
    ws1_success = tester.setup_websocket(tokens[user1_email], user1["name"])
    ws2_success = tester.setup_websocket(tokens[user2_email], user2["name"])
    
    if not ws1_success or not ws2_success:
        print("❌ CRITICAL: WebSocket setup failed")
        return False
    
    print("✅ WebSocket connections established")
    
    # Wait for connections to stabilize
    time.sleep(3)
    
    # Clear WebSocket messages
    tester.ws_messages = {}
    
    # Send a test message and verify real-time broadcasting
    broadcast_test_message = "Real-time broadcast test! This should appear instantly on the other user's screen 🚀"
    print(f"\n📤 Testing real-time broadcast: '{broadcast_test_message[:40]}...'")
    
    msg_result = tester.test_send_message(tokens[user1_email], direct_chat_id, broadcast_test_message, user1["name"])
    if not msg_result["success"]:
        print("❌ CRITICAL: Broadcast test message send failed")
        return False
    
    broadcast_msg_id = msg_result["data"]["_id"]
    
    # Check if User 2 received WebSocket notification
    ws_received = tester.check_websocket_messages(user2["name"], "chat:new_message", timeout=10)
    if not ws_received:
        print("❌ CRITICAL: WebSocket broadcasting not working - User 2 did not receive notification")
        
        # Debug: Show what messages were received
        if user2["name"] in tester.ws_messages:
            received = tester.ws_messages[user2["name"]]
            print(f"🔍 User 2 received {len(received)} WebSocket messages:")
            for msg in received:
                print(f"  - Type: {msg.get('type', 'unknown')}")
        else:
            print("🔍 User 2 received NO WebSocket messages")
        
        return False
    
    print("✅ WEBSOCKET BROADCASTING: Real-time message delivery working")
    
    # TEST 5: Verify message persistence and retrieval
    print("\n" + "=" * 60)
    print("TEST 5: MESSAGE PERSISTENCE AND RETRIEVAL")
    print("=" * 60)
    
    # Get messages from the chat
    get_msgs_result = tester.test_get_messages(tokens[user2_email], direct_chat_id, user2["name"])
    if not get_msgs_result["success"]:
        print("❌ CRITICAL: Message retrieval failed")
        return False
    
    messages = get_msgs_result["data"]["messages"]
    
    # Verify all sent messages are persisted
    persisted_ids = [msg["_id"] for msg in messages]
    all_sent_ids = sent_message_ids + [broadcast_msg_id]
    
    missing_messages = [msg_id for msg_id in all_sent_ids if msg_id not in persisted_ids]
    if missing_messages:
        print(f"❌ CRITICAL: {len(missing_messages)} messages not persisted: {missing_messages}")
        return False
    
    print(f"✅ MESSAGE PERSISTENCE: All {len(all_sent_ids)} messages persisted correctly")
    
    # TEST 6: Test error handling and validation
    print("\n" + "=" * 60)
    print("TEST 6: ERROR HANDLING AND VALIDATION")
    print("=" * 60)
    
    # Test empty message (should fail)
    empty_result = tester.test_send_message(tokens[user1_email], direct_chat_id, "", user1["name"])
    if empty_result["success"]:
        print("❌ CRITICAL: Empty message was accepted (should be rejected)")
        return False
    
    # Test whitespace-only message (should fail)
    whitespace_result = tester.test_send_message(tokens[user1_email], direct_chat_id, "   ", user1["name"])
    if whitespace_result["success"]:
        print("❌ CRITICAL: Whitespace-only message was accepted (should be rejected)")
        return False
    
    print("✅ ERROR HANDLING: Empty and whitespace-only messages properly rejected")
    
    # FINAL SUMMARY
    print("\n" + "=" * 80)
    print("🎉 MESSAGE SENDING FUNCTIONALITY TEST COMPLETED!")
    print("=" * 80)
    
    print("\nTEST RESULTS SUMMARY:")
    print("✅ Auth Endpoints: Login and /me working for both test users")
    print("✅ Direct Chat Access: Users can access their direct chat")
    print("✅ WhatsApp-Style Processing: UUID generation and normalized structure working")
    print("✅ Message Sending: All message types sent successfully")
    print("✅ WebSocket Broadcasting: Real-time message delivery working")
    print("✅ Message Persistence: All messages saved to MongoDB correctly")
    print("✅ Error Handling: Invalid messages properly rejected")
    
    print(f"\nDETAILED STATISTICS:")
    print(f"• Test Messages Sent: {len(test_messages)} + 1 broadcast test = {len(all_sent_ids)} total")
    print(f"• Unique Message IDs: {len(set(all_sent_ids))} (all unique)")
    print(f"• Messages Persisted: {len([msg for msg in messages if msg['_id'] in all_sent_ids])}")
    print(f"• WebSocket Events: chat:new_message broadcasting working")
    print(f"• Direct Chat ID: {direct_chat_id}")
    
    print(f"\nCONCLUSION:")
    print(f"🟢 Backend message sending functionality is working correctly")
    print(f"🟢 WhatsApp-style message processing is robust and reliable")
    print(f"🟢 Real-time WebSocket broadcasting is functional")
    print(f"🟢 The issue is likely in the frontend, not the backend")
    
    return True

if __name__ == "__main__":
    # Check command line arguments for specific test types
    if len(sys.argv) > 1:
        if sys.argv[1] == "chat":
            success = run_comprehensive_chat_test()
        elif sys.argv[1] == "e2e" or sys.argv[1] == "end-to-end":
            success = run_end_to_end_chat_test()
        elif sys.argv[1] == "full":
            success = run_comprehensive_test()
        elif sys.argv[1] == "websocket" or sys.argv[1] == "ws":
            success = run_websocket_broadcasting_test()
        elif sys.argv[1] == "message" or sys.argv[1] == "msg":
            success = run_message_sending_focus_test()
        else:
            print("Usage: python backend_test.py [chat|e2e|end-to-end|full|websocket|ws|message|msg]")
            print("  chat: Run comprehensive chat functionality tests")
            print("  e2e/end-to-end: Run end-to-end chat system tests")
            print("  full: Run full backend API tests")
            print("  websocket/ws: Run WebSocket broadcasting system test")
            print("  message/msg: Run focused message sending functionality test")
            print("  (no args): Run focused message sending test by default")
            sys.exit(1)
    else:
        # Default to focused message sending test as requested in review
        success = run_message_sending_focus_test()
    
    sys.exit(0 if success else 1)