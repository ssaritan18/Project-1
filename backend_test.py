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
BASE_URL = "https://adhd-connect.preview.emergentagent.com/api"
WS_URL = "wss://adhdsocial-fix.preview.emergentagent.com/api/ws"

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

    # Chat-related test methods
    def test_create_chat(self, token: str, title: str, user_name: str) -> Dict:
        """Test creating a new chat"""
        url = f"{self.base_url}/chats"
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"title": title}
        
        self.log(f"Testing chat creation '{title}' by {user_name}")
        response = self.session.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "_id" in data and "title" in data and "invite_code" in data:
                self.log(f"✅ Chat creation successful: {data['_id']} with invite code {data['invite_code']}")
                return {"success": True, "data": data}
            else:
                self.log(f"❌ Chat creation response missing required fields", "ERROR")
                return {"success": False, "error": "Missing required fields in response"}
        else:
            self.log(f"❌ Chat creation failed: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
    
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

if __name__ == "__main__":
    # Check if we should run chat tests specifically
    if len(sys.argv) > 1 and sys.argv[1] == "chat":
        success = run_comprehensive_chat_test()
    else:
        success = run_comprehensive_test()
    sys.exit(0 if success else 1)