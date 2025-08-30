import React, { useState, useCallback } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  RefreshControl, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCommunity } from "../../src/context/CommunityContext";
import { PostCard } from "../../src/components/PostCard";
import { CreatePostModal } from "../../src/components/CreatePostModal";

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const { posts, loading, error, refreshPosts, createPost, reactToPost, deletePost } = useCommunity();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const renderPost = ({ item }: { item: any }) => (
    <PostCard
      post={item}
      onReact={handleReaction}
      onDelete={handleDeletePost}
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

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {renderHeader()}
        
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0c0c" },
  headerContainer: { padding: 16, paddingBottom: 8 },
  header: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "#888", fontSize: 14, fontWeight: "400" },
  card: { flexDirection: "row", backgroundColor: "#111", borderRadius: 16, padding: 12, marginBottom: 12, alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  name: { color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 8 },
  progressTrack: { height: 10, backgroundColor: "#222", borderRadius: 8, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 8, backgroundColor: "#FFCFE1" },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: '#111', flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#1a1a1a' },
  input: { flex: 1, backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#222' },
  sendBtn: { backgroundColor: '#B8F1D9', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  iconBtn: { padding: 6 },
});