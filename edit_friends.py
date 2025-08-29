#!/usr/bin/env python3

# Read the file
with open('frontend/app/(tabs)/friends.tsx', 'r') as f:
    lines = f.readlines()

# Find the line with the closing </TouchableOpacity> for the debug button
# We need to find the specific one that comes after the "?" text
target_line = None
for i, line in enumerate(lines):
    if '</TouchableOpacity>' in line and i > 0:
        # Check if the previous lines contain the debug button pattern
        prev_lines = ''.join(lines[max(0, i-10):i+1])
        if 'Debug Info' in prev_lines and 'fontSize: 10' in prev_lines and '?' in prev_lines:
            target_line = i
            break

if target_line is not None:
    # Insert the new button after the debug button
    new_button = '''            <TouchableOpacity 
              style={{ backgroundColor: '#A3C9FF', padding: 6, borderRadius: 6, marginLeft: 8 }}
              onPress={() => {
                console.log("📱 Manual refresh button pressed");
                refresh();
              }}
            >
              <Text style={{ color: '#0c0c0c', fontSize: 10, fontWeight: 'bold' }}>🔄</Text>
            </TouchableOpacity>
'''
    
    # Insert the new button after the target line
    lines.insert(target_line + 1, new_button)
    
    # Write back to file
    with open('frontend/app/(tabs)/friends.tsx', 'w') as f:
        f.writelines(lines)
    
    print(f"Successfully added refresh button after line {target_line}")
else:
    print("Could not find the target debug button location")