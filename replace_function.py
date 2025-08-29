#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/(tabs)/chat/[id].tsx', 'r') as f:
    content = f.read()

# Define the old function
old_function = '''  const onSend = async () => { 
    if (!id || !text.trim()) return; 
    try {
      await sendText(id, text.trim()); 
      setText(""); 
    } catch (error) {
      console.error("Failed to send message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };'''

# Define the new function
new_function = '''  const onSend = async () => { 
    console.log("🔥 SEND BUTTON CLICKED! Text:", text, "Chat ID:", id);
    
    if (!id || !text.trim()) {
      console.log("❌ Cannot send - missing ID or text");
      return;
    }
    
    try {
      console.log("🚀 Calling sendText function...");
      await sendText(id, text.trim()); 
      console.log("✅ sendText completed successfully");
      setText(""); 
      console.log("✅ Text input cleared");
    } catch (error) {
      console.error("❌ Send error:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };'''

# Replace the function
if old_function in content:
    new_content = content.replace(old_function, new_function)
    
    # Write back to file
    with open('/app/frontend/app/(tabs)/chat/[id].tsx', 'w') as f:
        f.write(new_content)
    
    print("✅ Function replaced successfully!")
else:
    print("❌ Old function not found in file")
    print("Looking for:")
    print(repr(old_function))