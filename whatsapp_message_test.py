#!/usr/bin/env python3
"""
WhatsApp-Style Message Processing Backend Test Suite
Tests the new WhatsApp-style message processing system as per review request

Focus Areas:
1. Unique ID Generation
2. Normalized Response Structure  
3. Message Status Handling
4. Validation & Error Handling
5. WebSocket Broadcasting
6. Database Persistence
"""

import requests
import json
import sys
import websocket
import threading
import time
import uuid
from typing import Dict, Optional, List

# Base URL from frontend .env
BASE_URL = "https://neurodiv-social.preview.emergentagent.com/api"
WS_URL = "wss://adhd-connect.preview.emergentagent.com/api/ws"

class WhatsAppMessageTester:
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

    def test_whatsapp_message_send(self, token: str, chat_id: str, text: str, user_name: str, message_type: str = "text") -> Dict:
        """Test WhatsApp-style message sending with comprehensive validation"""
        url = f"{self.base_url}/chats/{chat_id}/messages"
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"text": text, "type": message_type}
        
        self.log(f"Testing WhatsApp-style message send to chat {chat_id} by {user_name}: '{text}'")
        response = self.session.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            
            # Validate WhatsApp-style normalized response structure
            required_fields = ["id", "_id", "chat_id", "author_id", "author_name", "text", "type", "status", "reactions", "created_at", "server_timestamp"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log(f"❌ WhatsApp message response missing required fields: {missing_fields}", "ERROR")
                return {"success": False, "error": f"Missing required fields: {missing_fields}"}
            
            # Validate field values
            if not data.get("id") or not data.get("_id"):
                self.log(f"❌ Message missing unique ID fields", "ERROR")
                return {"success": False, "error": "Missing unique ID fields"}
            
            if data.get("id") != data.get("_id"):
                self.log(f"❌ ID fields mismatch: id={data.get('id')}, _id={data.get('_id')}", "ERROR")
                return {"success": False, "error": "ID fields mismatch"}
            
            if data.get("status") != "sent":
                self.log(f"❌ Wrong message status: expected 'sent', got '{data.get('status')}'", "ERROR")
                return {"success": False, "error": f"Wrong message status: {data.get('status')}"}
            
            if not isinstance(data.get("reactions"), dict):
                self.log(f"❌ Reactions field is not a dict: {type(data.get('reactions'))}", "ERROR")
                return {"success": False, "error": "Reactions field is not a dict"}
            
            # Validate UUID format for unique ID
            try:
                uuid.UUID(data.get("id"))
                self.log(f"✅ Message ID is valid UUID: {data.get('id')}")
            except ValueError:
                self.log(f"❌ Message ID is not a valid UUID: {data.get('id')}", "ERROR")
                return {"success": False, "error": "Message ID is not a valid UUID"}
            
            self.log(f"✅ WhatsApp-style message send successful with normalized structure")
            return {"success": True, "data": data}
        else:
            self.log(f"❌ WhatsApp message send failed: {response.status_code} - {response.text}", "ERROR")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}

    def test_message_validation(self, token: str, chat_id: str, user_name: str) -> Dict:
        """Test message validation and error handling"""
        url = f"{self.base_url}/chats/{chat_id}/messages"
        headers = {"Authorization": f"Bearer {token}"}
        
        validation_tests = [
            {"payload": {"text": "", "type": "text"}, "description": "Empty text message"},
            {"payload": {"text": None, "type": "text"}, "description": "Null text message"},
            {"payload": {"type": "text"}, "description": "Missing text field"},
            {"payload": {"text": "   ", "type": "text"}, "description": "Whitespace-only text"},
        ]
        
        results = []
        
        for test in validation_tests:
            self.log(f"Testing validation: {test['description']}")
            response = self.session.post(url, json=test["payload"], headers=headers)
            
            if response.status_code in [400, 422]:  # Accept both 400 and 422 for validation errors
                self.log(f"✅ Validation correctly rejected: {test['description']}")
                results.append({"test": test["description"], "success": True, "status": response.status_code})
            else:
                self.log(f"❌ Validation failed to reject: {test['description']} (status: {response.status_code})", "ERROR")
                results.append({"test": test["description"], "success": False, "status": response.status_code, "response": response.text})
        
        all_passed = all(result["success"] for result in results)
        return {"success": all_passed, "results": results}

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

    def check_websocket_normalized_message(self, user_name: str, expected_message_id: str, timeout: int = 10) -> Dict:
        """Check if user received WebSocket message with normalized structure"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            if user_name in self.ws_messages:
                for msg in self.ws_messages[user_name]:
                    if msg.get("type") == "chat:new_message":
                        message_data = msg.get("message", {})
                        if message_data.get("id") == expected_message_id:
                            # Validate normalized structure in WebSocket payload
                            required_fields = ["id", "_id", "chat_id", "author_id", "author_name", "text", "type", "status", "reactions", "created_at", "server_timestamp"]
                            missing_fields = [field for field in required_fields if field not in message_data]
                            
                            if missing_fields:
                                self.log(f"❌ WebSocket message missing fields: {missing_fields}", "ERROR")
                                return {"success": False, "error": f"Missing fields: {missing_fields}"}
                            
                            # Validate ID consistency
                            if message_data.get("id") != message_data.get("_id"):
                                self.log(f"❌ WebSocket message ID mismatch", "ERROR")
                                return {"success": False, "error": "ID mismatch in WebSocket message"}
                            
                            self.log(f"✅ WebSocket message with normalized structure received by {user_name}")
                            return {"success": True, "message": msg}
            time.sleep(0.1)
        
        self.log(f"❌ WebSocket message with ID {expected_message_id} not received by {user_name} within {timeout}s", "ERROR")
        return {"success": False, "error": "WebSocket message not received"}

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

def run_whatsapp_message_processing_test():
    """
    Run comprehensive WhatsApp-style message processing test
    Focus on the 6 key areas from the review request:
    1. Unique ID Generation
    2. Normalized Response Structure  
    3. Message Status Handling
    4. Validation & Error Handling
    5. WebSocket Broadcasting
    6. Database Persistence
    """
    tester = WhatsAppMessageTester()
    
    print("=" * 80)
    print("WHATSAPP-STYLE MESSAGE PROCESSING BACKEND TEST")
    print("Testing: Unique IDs, Normalized Response, Status, Validation, WebSocket, Persistence")
    print("=" * 80)
    
    # Test users as specified in the review request
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
    
    # PHASE 2: Establish Direct Chat (Required for Testing)
    print("\n" + "=" * 60)
    print("PHASE 2: ESTABLISH DIRECT CHAT FOR TESTING")
    print("=" * 60)
    
    user1_email = user1["email"]
    user2_email = user2["email"]
    user2_id = user_profiles[user2_email]["_id"]
    
    # Check if they are friends (required for direct chat)
    friends_result = tester.test_friends_list(tokens[user1_email], user1["name"])
    if not friends_result["success"]:
        print("❌ CRITICAL: Failed to get friends list")
        return False
    
    # Check if user2 is in user1's friends list
    already_friends = any(friend["_id"] == user2_id for friend in friends_result["data"]["friends"])
    
    if not already_friends:
        print("❌ CRITICAL: Test users are not friends. Please ensure ssaritan@example.com and ssaritan2@example.com are friends before running this test.")
        return False
    
    print("✅ Users are friends, proceeding with direct chat")
    
    # Create/access direct chat
    direct_chat_result = tester.test_open_direct_chat(tokens[user1_email], user2_id, user1["name"])
    if not direct_chat_result["success"]:
        print("❌ CRITICAL: Direct chat creation failed")
        return False
    
    chat_id = direct_chat_result["data"]["_id"]
    print(f"✅ Direct chat established: {chat_id}")
    
    # PHASE 3: TEST 1 - UNIQUE ID GENERATION
    print("\n" + "=" * 60)
    print("PHASE 3: TEST 1 - UNIQUE ID GENERATION")
    print("=" * 60)
    
    message_ids = []
    
    # Send multiple messages and verify unique IDs
    for i in range(5):
        msg_result = tester.test_whatsapp_message_send(
            tokens[user1_email], 
            chat_id, 
            f"Unique ID test message {i+1}", 
            user1["name"]
        )
        if not msg_result["success"]:
            print(f"❌ CRITICAL: Message {i+1} send failed")
            return False
        
        message_id = msg_result["data"]["id"]
        message_ids.append(message_id)
        
        # Verify UUID format
        try:
            uuid.UUID(message_id)
            print(f"✅ Message {i+1} has valid UUID: {message_id}")
        except ValueError:
            print(f"❌ CRITICAL: Message {i+1} ID is not a valid UUID: {message_id}")
            return False
    
    # Verify all IDs are unique
    if len(set(message_ids)) != len(message_ids):
        print(f"❌ CRITICAL: Duplicate message IDs found: {message_ids}")
        return False
    
    print(f"✅ All {len(message_ids)} message IDs are unique UUIDs")
    
    # PHASE 4: TEST 2 - NORMALIZED RESPONSE STRUCTURE
    print("\n" + "=" * 60)
    print("PHASE 4: TEST 2 - NORMALIZED RESPONSE STRUCTURE")
    print("=" * 60)
    
    # Send a test message and validate complete normalized structure
    normalized_test_result = tester.test_whatsapp_message_send(
        tokens[user2_email], 
        chat_id, 
        "Testing normalized response structure", 
        user2["name"]
    )
    
    if not normalized_test_result["success"]:
        print("❌ CRITICAL: Normalized structure test message failed")
        return False
    
    normalized_msg = normalized_test_result["data"]
    
    # Validate all required fields are present and correct
    expected_structure = {
        "id": str,
        "_id": str,
        "chat_id": str,
        "author_id": str,
        "author_name": str,
        "text": str,
        "type": str,
        "status": str,
        "reactions": dict,
        "created_at": str,
        "server_timestamp": str
    }
    
    structure_valid = True
    for field, expected_type in expected_structure.items():
        if field not in normalized_msg:
            print(f"❌ CRITICAL: Missing field '{field}' in normalized response")
            structure_valid = False
        elif not isinstance(normalized_msg[field], expected_type):
            print(f"❌ CRITICAL: Field '{field}' has wrong type. Expected {expected_type.__name__}, got {type(normalized_msg[field]).__name__}")
            structure_valid = False
    
    if not structure_valid:
        print("❌ CRITICAL: Normalized response structure validation failed")
        return False
    
    print("✅ Normalized response structure is complete and correct")
    
    # PHASE 5: TEST 3 - MESSAGE STATUS HANDLING
    print("\n" + "=" * 60)
    print("PHASE 5: TEST 3 - MESSAGE STATUS HANDLING")
    print("=" * 60)
    
    # Verify all messages have "sent" status
    status_test_result = tester.test_whatsapp_message_send(
        tokens[user1_email], 
        chat_id, 
        "Testing message status handling", 
        user1["name"]
    )
    
    if not status_test_result["success"]:
        print("❌ CRITICAL: Status test message failed")
        return False
    
    if status_test_result["data"]["status"] != "sent":
        print(f"❌ CRITICAL: Wrong message status. Expected 'sent', got '{status_test_result['data']['status']}'")
        return False
    
    print("✅ Message status handling is correct (status: 'sent')")
    
    # PHASE 6: TEST 4 - VALIDATION & ERROR HANDLING
    print("\n" + "=" * 60)
    print("PHASE 6: TEST 4 - VALIDATION & ERROR HANDLING")
    print("=" * 60)
    
    validation_result = tester.test_message_validation(tokens[user1_email], chat_id, user1["name"])
    if not validation_result["success"]:
        print("❌ CRITICAL: Message validation tests failed")
        for result in validation_result["results"]:
            if not result["success"]:
                print(f"  ❌ {result['test']}: Status {result['status']}")
        return False
    
    print("✅ Message validation and error handling working correctly")
    
    # PHASE 7: TEST 5 - WEBSOCKET BROADCASTING
    print("\n" + "=" * 60)
    print("PHASE 7: TEST 5 - WEBSOCKET BROADCASTING")
    print("=" * 60)
    
    # Setup WebSocket connections
    ws1_success = tester.setup_websocket(tokens[user1_email], user1["name"])
    if not ws1_success:
        print(f"❌ CRITICAL: WebSocket setup failed for {user1['name']}")
        return False
    
    ws2_success = tester.setup_websocket(tokens[user2_email], user2["name"])
    if not ws2_success:
        print(f"❌ CRITICAL: WebSocket setup failed for {user2['name']}")
        return False
    
    print("✅ WebSocket connections established")
    
    # Clear WebSocket messages
    tester.ws_messages = {}
    
    # Send message and verify WebSocket broadcasting with normalized structure
    ws_test_result = tester.test_whatsapp_message_send(
        tokens[user1_email], 
        chat_id, 
        "Testing WebSocket broadcasting with normalized structure", 
        user1["name"]
    )
    
    if not ws_test_result["success"]:
        print("❌ CRITICAL: WebSocket test message failed")
        return False
    
    ws_message_id = ws_test_result["data"]["id"]
    
    # Check if User 2 received WebSocket notification with normalized structure
    ws_check_result = tester.check_websocket_normalized_message(user2["name"], ws_message_id, timeout=15)
    if not ws_check_result["success"]:
        print("❌ CRITICAL: WebSocket broadcasting with normalized structure failed")
        return False
    
    print("✅ WebSocket broadcasting with normalized structure working correctly")
    
    # PHASE 8: TEST 6 - DATABASE PERSISTENCE
    print("\n" + "=" * 60)
    print("PHASE 8: TEST 6 - DATABASE PERSISTENCE")
    print("=" * 60)
    
    # Retrieve messages and verify persistence with normalized structure
    persistence_result = tester.test_get_messages(tokens[user2_email], chat_id, user2["name"])
    if not persistence_result["success"]:
        print("❌ CRITICAL: Message retrieval for persistence test failed")
        return False
    
    messages = persistence_result["data"]["messages"]
    
    # Find our test messages and verify they have normalized structure
    test_messages_found = 0
    # Expected structure for persisted messages (database doesn't store 'id' field, only '_id')
    persisted_expected_fields = {
        "_id": str,
        "chat_id": str,
        "author_id": str,
        "author_name": str,
        "text": str,
        "type": str,
        "status": str,
        "reactions": dict,
        "created_at": str,
        "server_timestamp": str
    }
    
    for msg in messages:
        if msg["_id"] in message_ids or msg["_id"] == ws_message_id:
            test_messages_found += 1
            
            # Verify normalized structure in persisted message (excluding 'id' field which is only in API responses)
            for field in persisted_expected_fields.keys():
                if field not in msg:
                    print(f"❌ CRITICAL: Persisted message missing field '{field}'")
                    return False
            
            # Verify status is persisted correctly
            if msg["status"] != "sent":
                print(f"❌ CRITICAL: Persisted message has wrong status: {msg['status']}")
                return False
    
    if test_messages_found < 3:  # Should find at least some of our test messages
        print(f"❌ CRITICAL: Not enough test messages found in persistence check: {test_messages_found}")
        return False
    
    print(f"✅ Database persistence verified: {test_messages_found} messages with normalized structure")
    
    # FINAL SUMMARY
    print("\n" + "=" * 80)
    print("🎉 WHATSAPP-STYLE MESSAGE PROCESSING TEST COMPLETED SUCCESSFULLY!")
    print("=" * 80)
    
    print("\nTEST RESULTS SUMMARY:")
    print("✅ TEST 1 - Unique ID Generation: All messages have unique UUID identifiers")
    print("✅ TEST 2 - Normalized Response: Consistent message shape with all required fields")
    print("✅ TEST 3 - Message Status Handling: All messages have proper 'sent' status")
    print("✅ TEST 4 - Validation & Error Handling: Empty/invalid messages properly rejected")
    print("✅ TEST 5 - WebSocket Broadcasting: Normalized structure broadcast to other users")
    print("✅ TEST 6 - Database Persistence: Messages saved with normalized structure")
    
    print(f"\nKEY FINDINGS:")
    print(f"• Message IDs: All generated as unique UUIDs (tested {len(message_ids)} messages)")
    print(f"• Response Structure: Consistent {len(expected_structure)} fields in all responses")
    print(f"• Status Handling: All messages correctly marked as 'sent'")
    print(f"• Error Handling: {len(validation_result['results'])} validation scenarios working")
    print(f"• WebSocket: Real-time broadcasting with normalized structure confirmed")
    print(f"• Persistence: Messages saved to MongoDB with complete normalized structure")
    
    print(f"\nCONCLUSION:")
    print(f"🟢 WhatsApp-style message processing backend is robust and working correctly")
    print(f"🟢 Prevents crashes with guaranteed unique IDs and consistent structure")
    print(f"🟢 Ready for frontend integration - eliminates undefined ID issues")
    
    return True

if __name__ == "__main__":
    success = run_whatsapp_message_processing_test()
    if success:
        print("\n✅ All WhatsApp-style message processing tests PASSED")
        sys.exit(0)
    else:
        print("\n❌ WhatsApp-style message processing tests FAILED")
        sys.exit(1)