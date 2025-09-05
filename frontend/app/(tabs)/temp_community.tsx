import React, { useState, useRef, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  TextInput,
  Alert,
  Platform
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/AuthContext";

interface Post {
  id: string;
  content: string;
  author: string;
  authorId: string;
  category: string;
  timestamp: Date;
  likes: number;
  replies: number;
  shares: number;
  userLiked: boolean;
}

const categories = [
  { id: 'general', name: '🏠 General', icon: '🏠' },
  { id: 'tips', name: '💡 Tips & Tricks', icon: '💡' },
  { id: 'research', name: '🧠 ADHD Research', icon: '🧠' },
  { id: 'success', name: '💪 Success Stories', icon: '💪' },
  { id: 'support', name: '🆘 Support & Help', icon: '🆘' }
];

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  // State
  const [activeCategory, setActiveCategory] = useState('general');
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [replyText, setReplyText] = useState('');
  
  // Search & Hashtag state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  
  // Profile image state - sync with Profile tab
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Load profile image from localStorage (sync with Profile tab)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const savedProfile = localStorage.getItem('profile_data');
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        setProfileImage(parsedProfile.profile_image || null);
        console.log('✅ Profile image loaded for community:', parsedProfile.profile_image ? 'YES' : 'NO');
      }
    }
  }, []);
  
  // Get user avatar for posts
  const getUserAvatar = (authorId: string) => {
    // Return profile image if it's current user's post
    if (authorId === (user?.id || user?.email)) {
      return profileImage;
    }
    return null; // Other users don't have profile images yet
  };
  
  // Get user initials for fallback avatar
  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };
  
  // Extract hashtags from text
  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.toLowerCase()) : [];
  };
  
  // Get trending hashtags for current category
  const getTrendingHashtags = (): string[] => {
    const categoryPosts = posts.filter(post => post.category === activeCategory);
    const allHashtags: string[] = [];
    
    categoryPosts.forEach(post => {
      const hashtags = extractHashtags(post.content);
      allHashtags.push(...hashtags);
    });
    
    // Count hashtag frequency
    const hashtagCounts: Record<string, number> = {};
    allHashtags.forEach(tag => {
      hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
    });
    
    // Return top 5 trending hashtags
    return Object.entries(hashtagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);
  };
  
  // Filter posts based on search query and selected hashtag
  const getFilteredPosts = () => {
    let filtered = posts.filter(post => post.category === activeCategory);
    
    // Filter by hashtag if selected
    if (selectedHashtag) {
      filtered = filtered.filter(post => {
        const hashtags = extractHashtags(post.content);
        return hashtags.includes(selectedHashtag.toLowerCase());
      });
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post => {
        return post.content.toLowerCase().includes(query) ||
               post.author.toLowerCase().includes(query) ||
               extractHashtags(post.content).some(tag => tag.includes(query));
      });
    }
    
    return filtered;
  };
  
  // Handle hashtag click
  const handleHashtagClick = (hashtag: string) => {
    setSelectedHashtag(hashtag);
    setSearchQuery('');
    console.log('🏷️ Hashtag selected:', hashtag);
  };
  
  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedHashtag(null);
    setShowSearch(false);
  };

  // Create new post - Twitter style
  const handleCreatePost = () => {
    if (!newPost.trim()) return;
    
    if (!user) {
      Alert.alert('Login Required', 'Please log in to create posts');
      return;
    }

    const post: Post = {
      id: `post_${Date.now()}`,
      content: newPost.trim(),
      author: user.name || 'Anonymous',
      authorId: user.id || user.email || 'anonymous',
      category: activeCategory,
      timestamp: new Date(),
      likes: 0,
      replies: 0,
      shares: 0,
      userLiked: false
    };

    setPosts(prev => [post, ...prev]); // Latest first
    setNewPost('');
    
    console.log('✅ New post created:', post);
    Alert.alert('Success', 'Post created successfully!');
  };

  // Handle delete post
  const handleDeletePost = (postId: string) => {
    console.log('🔴 DELETE BUTTON CLICKED for post:', postId);
    
    if (Platform.OS === 'web') {
      // Web fallback - use confirm instead of Alert.alert
      const confirmed = window.confirm('Are you sure you want to delete this post?');
      if (confirmed) {
        setPosts(prev => prev.filter(post => post.id !== postId));
        console.log('✅ Post deleted:', postId);
        alert('Post deleted successfully!');
      }
    } else {
      // Mobile Alert.alert
      Alert.alert(
        'Delete Post',
        'Are you sure you want to delete this post?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              setPosts(prev => prev.filter(post => post.id !== postId));
              console.log('✅ Post deleted:', postId);
              Alert.alert('Success', 'Post deleted successfully!');
            },
          },
        ]
      );
    }
  };

  // Handle like
  const handleLike = (postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const newLiked = !post.userLiked;
        return {
          ...post,
          userLiked: newLiked,
          likes: newLiked ? post.likes + 1 : post.likes - 1
        };
      }
      return post;
    }));
  };

  // Handle reply
  const handleReply = (post: Post) => {
    setSelectedPost(post);
    setShowReplyModal(true);
    setReplyText('');
  };

  // Handle share
  const handleShare = (postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          shares: post.shares + 1
        };
      }
      return post;
    }));
    
    Alert.alert('Shared!', 'Post shared successfully');
  };

  // Submit reply
  const handleSubmitReply = () => {
    if (!replyText.trim() || !selectedPost) return;
    
    // For now, create reply as new post
    const reply: Post = {
      id: `reply_${Date.now()}`,
      content: `@${selectedPost.author} ${replyText.trim()}`,
      author: user?.name || 'Anonymous',
      authorId: user?.id || user?.email || 'anonymous',
      category: selectedPost.category,
      timestamp: new Date(),
      likes: 0,
      replies: 0,
      shares: 0,
      userLiked: false
    };

    setPosts(prev => [reply, ...prev]);
    
    // Update reply count
    setPosts(prev => prev.map(post => {
      if (post.id === selectedPost.id) {
        return {
          ...post,
          replies: post.replies + 1
        };
      }
      return post;
    }));

    setShowReplyModal(false);
    setReplyText('');
    setSelectedPost(null);
    
    Alert.alert('Success', 'Reply posted!');
  };

  // Get relative time
  const getRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return timestamp.toLocaleDateString();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ADHDers Social Club</Text>
        </View>

        {/* Categories */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
        >
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                activeCategory === category.id && styles.activeCategoryButton
              ]}
              onPress={() => setActiveCategory(category.id)}
            >
              <Text style={[
                styles.categoryText,
                activeCategory === category.id && styles.activeCategoryText
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="rgba(255,255,255,0.6)" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search posts or hashtags..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setShowSearch(true)}
            />
            {(searchQuery || selectedHashtag) && (
              <TouchableOpacity onPress={clearFilters} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Active filters display */}
          {selectedHashtag && (
            <View style={styles.activeFilters}>
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>{selectedHashtag}</Text>
                <TouchableOpacity onPress={() => setSelectedHashtag(null)}>
                  <Ionicons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Trending Hashtags */}
        {getTrendingHashtags().length > 0 && (
          <View style={styles.trendingContainer}>
            <Text style={styles.trendingTitle}>🔥 Trending in {categories.find(c => c.id === activeCategory)?.name}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trendingScroll}>
              {getTrendingHashtags().map((hashtag, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.trendingTag,
                    selectedHashtag === hashtag && styles.selectedTrendingTag
                  ]}
                  onPress={() => handleHashtagClick(hashtag)}
                >
                  <Text style={[
                    styles.trendingTagText,
                    selectedHashtag === hashtag && styles.selectedTrendingTagText
                  ]}>
                    {hashtag}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
