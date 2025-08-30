#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/(auth)/login.tsx', 'r') as f:
    content = f.read()

# Define the old and new strings
old_str = '''          {/* Submit Button */}
          <Pressable 
            style={[styles.submitBtn, { opacity: validEmail && !isLoading ? 1 : 0.5 }]} 
            onPress={submit}
            disabled={!validEmail || isLoading}
          >
            {isLoading ? (
              <Text style={styles.submitText}>Giriş yapılıyor...</Text>
            ) : (
              <Text style={styles.submitText}>
                {password ? 'Giriş Yap' : 'Hızlı Giriş'}
              </Text>
            )}
          </Pressable>'''

new_str = '''          {/* Submit Button */}
          <Pressable 
            style={[styles.submitBtn, { opacity: validEmail && !isLoading ? 1 : 0.5 }]} 
            onPress={() => {
              console.log("🚨 BUTTON CLICKED - DIRECT HANDLER", { validEmail, isLoading });
              submit();
            }}
            disabled={!validEmail || isLoading}
          >
            {isLoading ? (
              <Text style={styles.submitText}>Giriş yapılıyor...</Text>
            ) : (
              <Text style={styles.submitText}>
                {password ? 'Giriş Yap' : 'Hızlı Giriş'}
              </Text>
            )}
          </Pressable>'''

# Perform the replacement
if old_str in content:
    new_content = content.replace(old_str, new_str)
    
    # Write back to file
    with open('/app/frontend/app/(auth)/login.tsx', 'w') as f:
        f.write(new_content)
    
    print("✅ Replacement successful!")
else:
    print("❌ Old string not found in file")
    print("Searching for partial matches...")
    
    # Check if the button section exists
    if "Submit Button" in content:
        print("Found 'Submit Button' comment")
        
        # Find the button section
        import re
        pattern = r'(\s*{/\* Submit Button \*/}.*?</Pressable>)'
        match = re.search(pattern, content, re.DOTALL)
        if match:
            print("Found button section:")
            print(repr(match.group(1)))