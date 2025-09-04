#!/usr/bin/env python3

# Read the file
with open('frontend/app/(tabs)/chat/[id].tsx', 'r') as f:
    content = f.read()

# Define the old string to replace
old_str = '''  ownMessageTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
  },'''

# Define the new string
new_str = '''  ownMessageTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
  },
  ownMessageTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  doubleTick: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  secondTick: {
    marginLeft: -8, // Overlap the ticks slightly
  },'''

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