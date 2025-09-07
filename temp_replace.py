#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/(auth)/signup.tsx', 'r') as f:
    content = f.read()

# Define the old and new strings
old_str = """  termsText: {
    color: '#E5E7EB',
    fontSize: 14,
    lineHeight: 20,
  },
  termsLink: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
    lineHeight: 20,
  },"""

new_str = """  termsText: {
    color: '#FFFFFF',  // Pure white for better contrast
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',  // Slightly bolder for readability
  },
  termsLink: {
    color: '#FFD700',  // Gold color for better visibility on purple
    fontSize: 14,
    fontWeight: '700',  // Bold for emphasis
    textDecorationLine: 'underline',
    lineHeight: 20,
  },"""

# Perform the replacement
if old_str in content:
    new_content = content.replace(old_str, new_str)
    
    # Write the file back
    with open('/app/frontend/app/(auth)/signup.tsx', 'w') as f:
        f.write(new_content)
    
    print("Replacement successful!")
else:
    print("Old string not found in file")
    print("Looking for:")
    print(repr(old_str))