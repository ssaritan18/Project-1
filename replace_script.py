#!/usr/bin/env python3

# Read the file
with open('frontend/app/(tabs)/community.tsx', 'r') as f:
    content = f.read()

# Define the old and new strings
old_str = """    // Add comment to local state for immediate display
    setComments(prevComments => ({
      ...prevComments,
      [postId]: [...(prevComments[postId] || []), newCommentObj]
    }));"""

new_str = """    // Add comment to local state for immediate display
    setComments(prevComments => {
      const newCommentsState = {
        ...prevComments,
        [postId]: [...(prevComments[postId] || []), newCommentObj]
      };
      console.log(`💬 Updated comments state for post ${postId}:`, newCommentsState[postId]);
      return newCommentsState;
    });"""

# Perform the replacement
if old_str in content:
    new_content = content.replace(old_str, new_str)
    
    # Write the updated content back to the file
    with open('frontend/app/(tabs)/community.tsx', 'w') as f:
        f.write(new_content)
    
    print("Replacement successful!")
else:
    print("Old string not found in file")
    print("Looking for:")
    print(repr(old_str))