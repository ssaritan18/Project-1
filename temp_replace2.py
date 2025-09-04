#!/usr/bin/env python3

# Read the file
with open('frontend/app/(tabs)/chat/[id].tsx', 'r') as f:
    content = f.read()

# Define the old string to replace
old_str = '''          {isOwn && (
            <Text style={styles.ownMessageTime}>{timestamp}</Text>
          )}'''

# Define the new string
new_str = '''          {isOwn && (
            <View style={styles.ownMessageTimeContainer}>
              <Text style={styles.ownMessageTime}>{timestamp}</Text>
              {getStatusIcon()}
            </View>
          )}'''

# Perform the replacement
if old_str in content:
    new_content = content.replace(old_str, new_str)
    
    # Write the updated content back to the file
    with open('frontend/app/(tabs)/chat/[id].tsx', 'w') as f:
        f.write(new_content)
    
    print("Replacement successful!")
else:
    print("Old string not found in file")
    print("Looking for:")
    print(repr(old_str))