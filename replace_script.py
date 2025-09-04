#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/(tabs)/friends.tsx', 'r') as f:
    content = f.read()

# Define the old and new strings
old_str = '''  const startChat = async (friendId: string, friendName: string) => {
    try {
      const chatId = await openDirectChat(friendId);
      Alert.alert("Chat Ready!", `Starting chat with ${friendName}`);
    } catch (error) {
      Alert.alert("❌ Error", `Failed to open chat: ${error.message}`);
    }
  };'''

new_str = '''  const startChat = async (friendId: string, friendName: string) => {
    try {
      console.log(`💬 Starting chat with ${friendName} (${friendId})`);
      const chatId = await openDirectChat(friendId);
      console.log(`✅ Chat opened with ID: ${chatId}`);
      
      // Navigate to chat screen
      router.push(`/(tabs)/chat/${chatId}`);
      
      // Optional: Show success feedback
      console.log(`🚀 Navigating to chat: /(tabs)/chat/${chatId}`);
    } catch (error) {
      console.error(`❌ Failed to open chat with ${friendName}:`, error);
      Alert.alert("❌ Error", `Failed to open chat with ${friendName}: ${error.message}`);
    }
  };'''

# Perform the replacement
if old_str in content:
    new_content = content.replace(old_str, new_str)
    
    # Write the updated content back to the file
    with open('/app/frontend/app/(tabs)/friends.tsx', 'w') as f:
        f.write(new_content)
    
    print("✅ Successfully replaced the startChat function")
else:
    print("❌ Old string not found in the file")
    print("Searching for similar patterns...")
    
    # Let's search for the function signature
    pattern = r'const startChat = async \(friendId: string, friendName: string\) => \{'
    matches = re.findall(pattern, content)
    if matches:
        print(f"Found {len(matches)} matches for function signature")
    else:
        print("Function signature not found")