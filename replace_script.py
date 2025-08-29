#!/usr/bin/env python3

import sys

# Read the file
with open('/app/frontend/app/(tabs)/friends.tsx', 'r') as f:
    content = f.read()

# Define the old and new strings
old_str = '          <Text style={styles.section}>My Friends</Text>'

new_str = '''          <Text style={styles.section}>My Friends</Text>
          
          {/* Mobile Debug Alert - Temporary */}
          <TouchableOpacity 
            style={{ backgroundColor: '#ff6b6b', padding: 8, marginBottom: 8, borderRadius: 4 }}
            onPress={() => {
              const debugInfo = `Friends Count: ${friends.length}\\nFriends Data: ${JSON.stringify(friends).slice(0, 200)}`;
              alert(debugInfo);
            }}
          >
            <Text style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>📱 Mobile Debug</Text>
          </TouchableOpacity>'''

# Perform the replacement
if old_str in content:
    new_content = content.replace(old_str, new_str)
    
    # Write back to the file
    with open('/app/frontend/app/(tabs)/friends.tsx', 'w') as f:
        f.write(new_content)
    
    print("Replacement successful!")
else:
    print("Old string not found in file")
    print("Looking for:", repr(old_str))