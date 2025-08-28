#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/(tabs)/profile.tsx', 'r') as f:
    content = f.read()

# Define the old and new strings
old_str = '''      <TouchableOpacity style={[styles.signOutBtn, { backgroundColor: palette.primary }]} onPress={async () => {
        await signOut();
        router.replace("/(auth)/welcome");
      }}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>'''

new_str = '''      <TouchableOpacity style={[styles.signOutBtn, { backgroundColor: palette.primary }]} onPress={async () => {
        console.log("🚪 Sign Out button clicked!");
        Alert.alert("Debug", "Sign Out button works!");
        await signOut();
        router.replace("/(auth)/welcome");
      }}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>'''

# Perform the replacement
if old_str in content:
    new_content = content.replace(old_str, new_str)
    
    # Write back to file
    with open('/app/frontend/app/(tabs)/profile.tsx', 'w') as f:
        f.write(new_content)
    
    print("✅ Replacement successful!")
else:
    print("❌ Old string not found in file")
    print("Searching for similar patterns...")
    
    # Let's check what's actually there
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'TouchableOpacity' in line and 'signOutBtn' in line:
            print(f"Found TouchableOpacity at line {i+1}: {line}")
            # Print surrounding context
            start = max(0, i-2)
            end = min(len(lines), i+8)
            print("Context:")
            for j in range(start, end):
                marker = ">>> " if j == i else "    "
                print(f"{marker}{j+1}: {lines[j]}")