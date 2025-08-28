#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/(tabs)/profile.tsx', 'r') as f:
    content = f.read()

# Define the old and new strings
old_str = '''      const ok = await restoreBackup();
      Alert.alert(ok ? "Restored" : "Cancelled", ok ? "Data restored. Please restart the app to see changes." : "No file selected.");'''

new_str = '''      const ok = await restoreBackup();
      if (ok) {
        Alert.alert("Restored", "Data restored. The app will reload now.", [
          { text: "OK", onPress: () => { try { DevSettings.reload(); } catch { } } }
        ]);
      } else {
        Alert.alert("Cancelled", "No file selected.");
      }'''

# Perform the replacement
new_content = content.replace(old_str, new_str)

# Write back to file
with open('/app/frontend/app/(tabs)/profile.tsx', 'w') as f:
    f.write(new_content)

print("Replacement completed successfully")