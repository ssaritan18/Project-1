#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/(tabs)/community.tsx', 'r') as f:
    content = f.read()

# Define the old text to replace
old_text = """  // Load profile image from localStorage (sync with Profile tab)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const savedProfile = localStorage.getItem('profile_data');
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        setProfileImage(parsedProfile.profile_image || null);
        console.log('✅ Profile image loaded for community:', parsedProfile.profile_image ? 'YES' : 'NO');
      }
    }
  }, []);"""

# Define the new text
new_text = """  // Load profile image from localStorage (sync with Profile tab)
  const loadProfileImage = () => {
    if (Platform.OS === 'web') {
      const savedProfile = localStorage.getItem('profile_data');
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        setProfileImage(parsedProfile.profile_image || null);
        console.log('✅ Profile image loaded for community:', parsedProfile.profile_image ? 'YES' : 'NO');
      }
    }
  };

  useEffect(() => {
    loadProfileImage();
  }, []);

  // Listen for storage changes to sync profile image updates
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'profile_data') {
          console.log('🔄 Profile data changed, reloading profile image...');
          loadProfileImage();
        }
      };

      window.addEventListener('storage', handleStorageChange);
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, []);

  // Also check for profile image changes when component gains focus
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleFocus = () => {
        console.log('🔄 Community tab focused, checking for profile image updates...');
        loadProfileImage();
      };

      window.addEventListener('focus', handleFocus);
      return () => {
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, []);"""

# Perform the replacement
if old_text in content:
    new_content = content.replace(old_text, new_text)
    
    # Write the updated content back to the file
    with open('/app/frontend/app/(tabs)/community.tsx', 'w') as f:
        f.write(new_content)
    
    print("✅ Successfully replaced the profile image loading code with sync functionality")
else:
    print("❌ Old text not found in the file")
    print("Searching for similar patterns...")
    
    # Try to find the pattern with some flexibility
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if "Load profile image from localStorage" in line:
            print(f"Found similar text at line {i+1}: {line.strip()}")
            # Show context
            start = max(0, i-2)
            end = min(len(lines), i+15)
            print("Context:")
            for j in range(start, end):
                marker = ">>> " if j == i else "    "
                print(f"{marker}{j+1}: {lines[j]}")
            break