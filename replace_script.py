#!/usr/bin/env python3

import re

# Read the file
with open('./frontend/app/(tabs)/profile.tsx', 'r') as f:
    content = f.read()

# Define the old and new strings
old_str = """  const navigateToEdit = () => {
    console.log('🎯 navigateToEdit called - attempting to navigate to /profile/edit');
    
    // For web compatibility, use window.location directly
    if (typeof window !== 'undefined') {
      console.log('🌐 Web environment detected - using window.location.href');
      window.location.href = '/profile/edit';
      return;
    }
    
    // Fallback to router.push for native
    try {
      router.push('/profile/edit');
      console.log('✅ router.push called successfully');
    } catch (error) {
      console.error('❌ router.push failed:', error);
    }
  };"""

new_str = """  const navigateToEdit = () => {
    console.log('🎯 navigateToEdit called - attempting to navigate to /profile/edit');
    
    try {
      // Use router.push for both web and native - Expo Router handles this properly
      router.push('/profile/edit');
      console.log('✅ router.push called successfully');
    } catch (error) {
      console.error('❌ router.push failed:', error);
      // Fallback for web environments
      if (typeof window !== 'undefined') {
        console.log('🌐 Fallback: using window.location.href');
        window.location.href = '/profile/edit';
      }
    }
  };"""

# Perform the replacement
if old_str in content:
    new_content = content.replace(old_str, new_str)
    
    # Write the updated content back to the file
    with open('./frontend/app/(tabs)/profile.tsx', 'w') as f:
        f.write(new_content)
    
    print("✅ Successfully replaced the navigateToEdit function")
else:
    print("❌ Old string not found in the file")
    print("Content around line 49:")
    lines = content.split('\n')
    for i in range(45, min(70, len(lines))):
        print(f"{i+1}: {lines[i]}")