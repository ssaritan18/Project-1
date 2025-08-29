#!/usr/bin/env python3
"""
Focused Friends List Test for ssaritan@example.com
Testing the specific issue mentioned in the review request
"""

import requests
import json
import sys

# Base URL from frontend .env
BASE_URL = "https://adhdsocial-fix.preview.emergentagent.com/api"

def test_friends_list_for_ssaritan():
    """Test friends list specifically for ssaritan@example.com as requested"""
    
    print("=" * 80)
    print("FOCUSED FRIENDS LIST TEST FOR ssaritan@example.com")
    print("=" * 80)
    
    # Test user credentials (corrected from PIN 1234 to actual password)
    email = "ssaritan@example.com"
    password = "Passw0rd!"  # Actual password from backend, not PIN 1234
    
    session = requests.Session()
    
    # Step 1: Login as ssaritan@example.com
    print(f"\n1. Logging in as {email}...")
    login_url = f"{BASE_URL}/auth/login"
    login_payload = {
        "email": email,
        "password": password
    }
    
    login_response = session.post(login_url, json=login_payload)
    
    if login_response.status_code != 200:
        print(f"❌ LOGIN FAILED: {login_response.status_code} - {login_response.text}")
        return False
    
    login_data = login_response.json()
    if "access_token" not in login_data:
        print(f"❌ LOGIN FAILED: No access_token in response")
        return False
    
    token = login_data["access_token"]
    print(f"✅ Login successful for {email}")
    
    # Step 2: Get user profile
    print(f"\n2. Getting user profile...")
    me_url = f"{BASE_URL}/me"
    headers = {"Authorization": f"Bearer {token}"}
    
    me_response = session.get(me_url, headers=headers)
    
    if me_response.status_code != 200:
        print(f"❌ PROFILE FAILED: {me_response.status_code} - {me_response.text}")
        return False
    
    profile_data = me_response.json()
    print(f"✅ Profile retrieved for {profile_data.get('name', 'Unknown')} ({profile_data.get('email', 'Unknown')})")
    print(f"   User ID: {profile_data.get('_id', 'Unknown')}")
    
    # Step 3: Test /api/friends/list endpoint
    print(f"\n3. Testing /api/friends/list endpoint...")
    friends_url = f"{BASE_URL}/friends/list"
    
    friends_response = session.get(friends_url, headers=headers)
    
    if friends_response.status_code != 200:
        print(f"❌ FRIENDS LIST FAILED: {friends_response.status_code} - {friends_response.text}")
        return False
    
    friends_data = friends_response.json()
    
    # Verify response structure
    if "friends" not in friends_data:
        print(f"❌ FRIENDS LIST FAILED: Missing 'friends' field in response")
        print(f"   Response: {friends_data}")
        return False
    
    friends_list = friends_data["friends"]
    print(f"✅ Friends list endpoint working correctly")
    print(f"   Number of friends: {len(friends_list)}")
    
    # Display detailed friends data
    if len(friends_list) > 0:
        print(f"\n   Friends details:")
        for i, friend in enumerate(friends_list, 1):
            print(f"   {i}. Name: {friend.get('name', 'Unknown')}")
            print(f"      Email: {friend.get('email', 'Unknown')}")
            print(f"      ID: {friend.get('_id', 'Unknown')}")
    else:
        print(f"   No friends found in the list")
    
    # Step 4: Verify data structure for mobile app compatibility
    print(f"\n4. Verifying data structure for mobile app...")
    
    # Check if each friend has required fields
    required_fields = ['_id', 'name', 'email']
    all_valid = True
    
    for i, friend in enumerate(friends_list):
        for field in required_fields:
            if field not in friend:
                print(f"❌ Friend {i+1} missing required field: {field}")
                all_valid = False
            elif friend[field] is None or friend[field] == "":
                print(f"❌ Friend {i+1} has empty/null value for field: {field}")
                all_valid = False
    
    if all_valid:
        print(f"✅ All friends have required fields (_id, name, email)")
    
    # Step 5: Test JSON serialization (mobile app compatibility)
    print(f"\n5. Testing JSON serialization...")
    try:
        json_str = json.dumps(friends_data, indent=2)
        print(f"✅ Friends data is properly JSON serializable")
        print(f"   JSON size: {len(json_str)} characters")
    except Exception as e:
        print(f"❌ JSON serialization failed: {e}")
        all_valid = False
    
    print(f"\n" + "=" * 80)
    if all_valid:
        print(f"✅ FRIENDS LIST TEST PASSED - Backend is working correctly")
        print(f"   - Login successful for {email}")
        print(f"   - /api/friends/list returns proper data structure")
        print(f"   - {len(friends_list)} friends found with all required fields")
        print(f"   - Data is JSON serializable for mobile app")
    else:
        print(f"❌ FRIENDS LIST TEST FAILED - Issues found with backend data")
    
    print(f"=" * 80)
    
    return all_valid

if __name__ == "__main__":
    success = test_friends_list_for_ssaritan()
    sys.exit(0 if success else 1)