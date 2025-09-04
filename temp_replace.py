#!/usr/bin/env python3

import sys

# Read the file
with open('frontend/app/(tabs)/chat/[id].tsx', 'r') as f:
    content = f.read()

# Define the old string to replace
old_str = '''  const renderMessageItem = ({ item }: { item: any }) => {
    const normalizedMessage = {
      id: item.id ?? item._id ?? Math.random().toString(36).slice(2),
      text: item.text ?? item.content ?? "",
      author: item.author ?? "Unknown",
      author_id: item.author_id ?? item.sender ?? "unknown",
      author_name: item.author_name ?? item.author ?? "Unknown User",
      type: item.type ?? "text",
      ts: item.ts ?? Date.now(),
      reactions: item.reactions ?? { like: 0, heart: 0, clap: 0, star: 0 },
      voice_url: item.voice_url ?? null,
      durationSec: item.durationSec ?? item.duration_sec ?? 0
    };

    const isOwn = normalizedMessage.author_id === 'current_user_id';
    const timestamp = new Date(normalizedMessage.ts).toLocaleTimeString();'''

# Define the new string
new_str = '''  const renderMessageItem = ({ item }: { item: any }) => {
    const normalizedMessage = {
      id: item.id ?? item._id ?? Math.random().toString(36).slice(2),
      text: item.text ?? item.content ?? "",
      author: item.author ?? "Unknown",
      author_id: item.author_id ?? item.sender ?? "unknown",
      author_name: item.author_name ?? item.author ?? "Unknown User",
      type: item.type ?? "text",
      ts: item.ts ?? Date.now(),
      reactions: item.reactions ?? { like: 0, heart: 0, clap: 0, star: 0 },
      voice_url: item.voice_url ?? null,
      durationSec: item.durationSec ?? item.duration_sec ?? 0,
      status: item.status ?? "sent" // WhatsApp-like status
    };

    const isOwn = normalizedMessage.author_id === 'current_user_id';
    const timestamp = new Date(normalizedMessage.ts).toLocaleTimeString();
    
    // WhatsApp-like read receipt icons
    const getStatusIcon = () => {
      if (!isOwn) return null; // Only show ticks for own messages
      
      switch (normalizedMessage.status) {
        case "sending":
          return <Ionicons name="time-outline" size={12} color="#9CA3AF" />;
        case "sent":
          return <Ionicons name="checkmark" size={12} color="#9CA3AF" />; // Single tick
        case "delivered":
          return (
            <View style={styles.doubleTick}>
              <Ionicons name="checkmark" size={12} color="#9CA3AF" />
              <Ionicons name="checkmark" size={12} color="#9CA3AF" style={styles.secondTick} />
            </View>
          ); // Double tick gray
        case "read":
          return (
            <View style={styles.doubleTick}>
              <Ionicons name="checkmark" size={12} color="#3B82F6" />
              <Ionicons name="checkmark" size={12} color="#3B82F6" style={styles.secondTick} />
            </View>
          ); // Double tick blue
        default:
          return null;
      }
    };'''

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
    print(repr(old_str[:100]))
    print("In content:")
    # Find similar content
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'renderMessageItem' in line:
            print(f"Line {i+1}: {repr(line)}")