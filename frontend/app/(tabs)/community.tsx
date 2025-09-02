import React, { useState, useCallback, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  RefreshControl, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  ScrollView
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCommunity } from "../../src/context/CommunityContext";
import { PostCard } from "../../src/components/PostCard";
import { CreatePostModal } from "../../src/components/CreatePostModal";
import { CommentModal } from "../../src/components/CommentModal";

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const { posts, loading, error, refreshPosts, createPost, reactToPost, deletePost, addComment } = useCommunity();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Animation ref for single-tap refresh
  const refreshAnimRef = useRef(new Animated.Value(0)).current;
  const [isRefreshAnimating, setIsRefreshAnimating] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshPosts();
    } catch (error) {
      console.error('Failed to refresh posts:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshPosts]);

  // Single-tap refresh with smooth animation
  const handleSingleTapRefresh = useCallback(async () => {
    if (isRefreshAnimating) return;
    
    setIsRefreshAnimating(true);
    
    // Start animation
    Animated.sequence([
      Animated.timing(refreshAnimRef, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(refreshAnimRef, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start(() => {
      setIsRefreshAnimating(false);
    });
    
    // Refresh data
    await handleRefresh();
  }, [handleRefresh, isRefreshAnimating]);

  const handleCreatePost = useCallback(async (text: string, imageUrl?: string, tags?: string[], visibility?: string) => {
    try {
      await createPost(text, imageUrl, tags, visibility);
    } catch (error) {
      console.error('Failed to create post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    }
  }, [createPost]);

  const handleReaction = useCallback(async (postId: string, reactionType: string) => {
    try {
      await reactToPost(postId, reactionType);
    } catch (error) {
      console.error('Failed to react to post:', error);
      Alert.alert('Error', 'Failed to react to post. Please try again.');
    }
  }, [reactToPost]);

  const handleDeletePost = useCallback(async (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(postId);
            } catch (error) {
              console.error('Failed to delete post:', error);
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
          }
        }
      ]
    );
  }, [deletePost]);

  const handleComment = useCallback(async (postId: string) => {
    setSelectedPostId(postId);
    setShowCommentModal(true);
  }, []);

  const handleCommentSubmit = useCallback(async (text: string) => {
    if (!selectedPostId) return;
    
    setCommentLoading(true);
    try {
      await addComment(selectedPostId, text);
    } catch (error) {
      console.error('Failed to add comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setCommentLoading(false);
      setShowCommentModal(false);
      setSelectedPostId(null);
    }
  }, [selectedPostId, addComment]);

  const renderPost = ({ item }: { item: any }) => (
    <PostCard
      post={item}
      onReact={handleReaction}
      onDelete={handleDeletePost}
      onComment={handleComment}
      isOwner={item.author_name === 'You' || item.author_id === 'current_user'}
    />
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color="#666" />
      <Text style={styles.emptyTitle}>No Posts Yet</Text>
      <Text style={styles.emptySubtitle}>
        Be the first to share something with the community!
      </Text>
      <TouchableOpacity 
        style={styles.createFirstPostButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Text style={styles.createFirstPostButtonText}>Create Your First Post</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.header}>Community Feed</Text>
        <Text style={styles.subtitle}>Share and connect with fellow ADHDers</Text>
      </View>
      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={24} color="#000" />
      </TouchableOpacity>
    </View>
  );

  // Hot Topics Data - Glow Inspired
  const hotTopics = [
    {
      id: '1',
      title: '🎯 ADHD Focus Techniques',
      description: 'Share your best focus strategies and tips',
      participants: 1247,
      color: '#8B5CF6',
      gradient: ['#8B5CF6', '#A855F7'],
      icon: '🎯',
      trending: true
    },
    {
      id: '2', 
      title: '💊 Medication Experiences',
      description: 'Open discussion about ADHD medications',
      participants: 892,
      color: '#EC4899',
      gradient: ['#EC4899', '#F97316'],
      icon: '💊',
      trending: false
    },
    {
      id: '3',
      title: '🎨 Creative ADHD Minds',
      description: 'Show off your creative projects and art',
      participants: 1156,
      color: '#F97316',
      gradient: ['#F97316', '#FBBF24'],
      icon: '🎨',
      trending: true
    },
    {
      id: '4',
      title: '🏢 Workplace Success',
      description: 'Navigate work life with ADHD',
      participants: 743,
      color: '#10B981',
      gradient: ['#10B981', '#34D399'],
      icon: '🏢',
      trending: false
    },
    {
      id: '5',
      title: '💚 Mental Health Check',
      description: 'Support and self-care discussions',
      participants: 1834,
      color: '#6366F1',
      gradient: ['#6366F1', '#8B5CF6'],
      icon: '💚',
      trending: true
    }
  ];

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f172a']}
      style={styles.container}
    >
      <View style={[styles.contentContainer, { paddingTop: insets.top + 20 }]}>
        {/* Glow Header */}
        <LinearGradient
          colors={['#8B5CF6', '#EC4899', '#F97316']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.glowHeader}
        >
          <Text style={styles.glowHeaderTitle}>🌟 Community Hub</Text>
          <Text style={styles.glowHeaderSubtitle}>Connect with fellow ADHDers</Text>
        </LinearGradient>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {/* Hot Topics Section */}
          <View style={styles.hotTopicsSection}>
            <Text style={styles.sectionTitle}>🔥 Hot Topics</Text>
            <Text style={styles.sectionSubtitle}>Join the conversation</Text>
            
            {hotTopics.map((topic) => (
              <TouchableOpacity
                key={topic.id}
                style={styles.hotTopicCard}
                onPress={() => Alert.alert('Coming Soon!', `${topic.title} discussion board will launch soon!`)}
              >
                <LinearGradient
                  colors={topic.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.hotTopicGradient}
                >
                  <View style={styles.hotTopicContent}>
                    <View style={styles.hotTopicHeader}>
                      <Text style={styles.hotTopicIcon}>{topic.icon}</Text>
                      {topic.trending && (
                        <View style={styles.trendingBadge}>
                          <Text style={styles.trendingText}>TRENDING</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.hotTopicTitle}>{topic.title}</Text>
                    <Text style={styles.hotTopicDescription}>{topic.description}</Text>
                    <View style={styles.hotTopicFooter}>
                      <Text style={styles.participantCount}>
                        👥 {topic.participants.toLocaleString()} members
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* Community Posts Section */}
          <View style={styles.postsSection}>
            <View style={styles.postsSectionHeader}>
              <Text style={styles.sectionTitle}>📝 Recent Posts</Text>
              <TouchableOpacity 
                onPress={() => setShowCreateModal(true)}
                style={styles.createPostBtn}
              >
                <LinearGradient
                  colors={['#EC4899', '#F97316']}
                  style={styles.createPostGradient}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.createPostText}>New Post</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && posts.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Loading community posts...</Text>
          </View>
        ) : (
          <FlashList
            data={posts}
            keyExtractor={(item) => item._id}
            estimatedItemSize={200}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 16, 32) }}
            renderItem={renderPost}
            ListEmptyComponent={renderEmptyComponent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#4A90E2"
                colors={["#4A90E2"]}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        <CreatePostModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreatePost={handleCreatePost}
        />

        <CommentModal
          visible={showCommentModal}
          onClose={() => {
            setShowCommentModal(false);
            setSelectedPostId(null);
          }}
          onSubmit={handleCommentSubmit}
          loading={commentLoading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#000" 
  },
  headerContainer: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16, 
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  headerTitleContainer: {
    flex: 1
  },
  header: { 
    color: "#fff", 
    fontSize: 24, 
    fontWeight: "700", 
    marginBottom: 4 
  },
  subtitle: { 
    color: "#888", 
    fontSize: 14, 
    fontWeight: "400" 
  },
  createButton: {
    backgroundColor: '#4A90E2',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  errorContainer: {
    backgroundColor: '#2D1B1B',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B0000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    flex: 1
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center'
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    paddingTop: 80
  },
  emptyTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center'
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24
  },
  createFirstPostButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20
  },
  refreshArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent'
  },
  refreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.3)'
  },
  refreshText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8
  },
  createFirstPostButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  }
});