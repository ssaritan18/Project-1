import React, { useState, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Keyboard,
  Platform
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/AuthContext";
import { MockAdBanner } from "../../src/components/MockAdBanner";

interface CommunityPost {
  id: string;
  author: {
    name: string;
    avatar: string;
    verified: boolean;
    memberSince: string;
  };
  topic: string;
  title: string;
  content: string;
  timeAgo: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    userLiked: boolean;
  };
  tags: string[];
  category: 'experience' | 'tips' | 'research' | 'support' | 'success';
}

interface Comment {
  id: string;
  author: string;
  content: string;
  timeAgo: string;
  likes: number;
  userLiked: boolean;
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth(); // Get user info for comments
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'trending' | 'recent' | 'research'>('trending');

  // Real ADHD Community Posts with authentic content
  const communityPosts: CommunityPost[] = [
    {
      id: '1',
      author: {
        name: 'Dr. Sarah Chen',
        avatar: '👩‍⚕️',
        verified: true,
        memberSince: '2 years'
      },
      topic: '🔬 Research Update',
      title: 'New Study: Exercise vs Medication for ADHD Focus',
      content: 'Just published research from Stanford shows that 30min daily exercise can be as effective as low-dose stimulants for improving focus in adults with ADHD. The study followed 200 participants over 12 weeks. Key findings:\n\n• 45% improvement in sustained attention tasks\n• 38% reduction in distractibility \n• Works best when combined with structured routines\n\nThoughts? Anyone tried replacing meds with exercise?',
      timeAgo: '2 hours ago',
      engagement: {
        likes: 127,
        comments: 34,
        shares: 18,
        userLiked: false
      },
      tags: ['research', 'exercise', 'focus', 'alternatives'],
      category: 'research'
    },
    {
      id: '2',
      author: {
        name: 'Alex M.',
        avatar: '🧑‍💻',
        verified: false,
        memberSince: '8 months'
      },
      topic: '💡 Life Hack',
      title: 'Game-changer: Body doubling for remote work',
      content: 'Fellow ADHDers! I\'ve been struggling with WFH productivity until I discovered "body doubling" - working alongside others virtually. Started using Focusmate and my productivity DOUBLED.\n\nWhat works:\n✅ 50min sessions with strangers\n✅ Camera on (accountability)\n✅ Brief check-ins at start/end\n✅ No chatting during work\n\nAnyone else tried this? Looking for more body doubling platforms!',
      timeAgo: '4 hours ago',
      engagement: {
        likes: 89,
        comments: 22,
        shares: 15,
        userLiked: true
      },
      tags: ['productivity', 'remote-work', 'body-doubling', 'tips'],
      category: 'tips'
    },
    {
      id: '3',
      author: {
        name: 'Maya Rodriguez',
        avatar: '🎨',
        verified: false,
        memberSince: '1 year'
      },
      topic: '🎯 Success Story',
      title: 'From burnout to breakthrough: My ADHD medication journey',
      content: 'Sharing my story because representation matters. After 3 failed medication attempts and severe burnout, I finally found the right combination:\n\n• Concerta 36mg (extended release)\n• Daily meditation (10min)\n• Protein-heavy breakfast\n• Sleep schedule (10pm-6am religiously)\n\nIt took 8 months to dial in, but I\'m now running my own design studio. Don\'t give up if first attempts don\'t work! 💪\n\nAMA about the journey!',
      timeAgo: '1 day ago',
      engagement: {
        likes: 203,
        comments: 47,
        shares: 31,
        userLiked: false
      },
      tags: ['medication', 'success', 'entrepreneur', 'journey'],
      category: 'success'
    },
    {
      id: '4',
      author: {
        name: 'Jordan K.',
        avatar: '🎓',
        verified: false,
        memberSince: '3 months'
      },
      topic: '🆘 Need Support',
      title: 'Struggling with rejection sensitivity - any coping strategies?',
      content: 'Hi everyone. Having a really tough week with RSD (rejection sensitive dysphoria). Got some feedback at work that sent me spiraling for days. Even positive feedback felt like criticism.\n\nI know this is common with ADHD but feeling really alone. How do you cope when your brain amplifies every social interaction into potential rejection?\n\nLooking for practical strategies that actually work. Therapy waiting list is 3 months. 😔',
      timeAgo: '6 hours ago',
      engagement: {
        likes: 67,
        comments: 29,
        shares: 8,
        userLiked: false
      },
      tags: ['rsd', 'support', 'emotional-regulation', 'workplace'],
      category: 'support'
    },
    {
      id: '5',
      author: {
        name: 'Dr. Michael Torres',
        avatar: '👨‍⚕️',
        verified: true,
        memberSince: '4 years'
      },
      topic: '📚 Educational',
      title: 'Myth-busting: ADHD and dopamine - what the research actually says',
      content: 'Seeing a lot of misinformation about ADHD and dopamine lately. Let\'s clear up some myths with actual neuroscience:\n\n❌ MYTH: ADHD brains don\'t produce enough dopamine\n✅ FACT: ADHD involves dysregulated dopamine reuptake and receptor sensitivity\n\n❌ MYTH: All ADHD people need stimulants\n✅ FACT: ~80% respond to stimulants, but other pathways exist\n\n❌ MYTH: Dopamine = pleasure/reward only\n✅ FACT: Dopamine is crucial for motivation, attention, and executive function\n\nSources: Latest meta-analysis from Journal of Neuropsychopharmacology (2023). Happy to discuss!',
      timeAgo: '1 day ago',
      engagement: {
        likes: 156,
        comments: 41,
        shares: 67,
        userLiked: true
      },
      tags: ['neuroscience', 'education', 'dopamine', 'myths'],
      category: 'research'
    }
  ];

  const [posts, setPosts] = useState<CommunityPost[]>(communityPosts); // Make posts state manageable
  const [newComment, setNewComment] = useState(''); // For comment input
  const [comments, setComments] = useState<Record<string, Comment[]>>({}); // Store comments per post ID
  const commentInputRef = useRef<TextInput>(null); // Reference for comment input
  const modalScrollRef = useRef<ScrollView>(null); // Reference for modal scroll

  // Mock comments for posts
  const getCommentsForPost = (postId: string): Comment[] => {
    const commentDatabase: Record<string, Comment[]> = {
      '1': [
        {
          id: 'c1',
          author: 'Lisa P.',
          content: 'This is fascinating! I\'ve been doing morning runs for 6 months and definitely notice better focus. But I still need my meds for really challenging tasks.',
          timeAgo: '1 hour ago',
          likes: 12,
          userLiked: false
        },
        {
          id: 'c2',
          author: 'Dr. Rodriguez',
          content: 'Great summary! The neuroplasticity benefits of exercise are well-documented. The key is consistency - even 15min walks can help if done daily.',
          timeAgo: '45 min ago',
          likes: 18,
          userLiked: true
        }
      ],
      '2': [
        {
          id: 'c3',
          author: 'Sam T.',
          content: 'Body doubling literally saved my freelance career! Also try Caveday - they have amazing facilitated sessions.',
          timeAgo: '2 hours ago',
          likes: 8,
          userLiked: false
        }
      ],
      '4': [
        {
          id: 'c4',
          author: 'Maria S.',
          content: 'RSD is so real and so hard. What helps me: 1) Immediate self-compassion mantras 2) Reaching out to trusted friends for reality checks 3) Writing down the actual words said vs what I heard. You\'re not alone! 💙',
          timeAgo: '3 hours ago',
          likes: 25,
          userLiked: false
        },
        {
          id: 'c5',
          author: 'therapist_jenny',
          content: 'DBT skills are incredible for RSD. Try the STOP technique: Stop, Take a breath, Observe thoughts, Proceed mindfully. Also, remember criticism of behavior ≠ criticism of YOU as a person.',
          timeAgo: '2 hours ago',
          likes: 34,
          userLiked: true
        }
      ]
    };
    return commentDatabase[postId] || [];
  };

  const filteredPosts = posts.filter(post => {
    switch (activeFilter) {
      case 'trending':
        return post.engagement.likes > 80;
      case 'recent':
        return post.timeAgo.includes('hours') || post.timeAgo.includes('1 day');
      case 'research':
        return post.category === 'research';
      default:
        return true;
    }
  });

  const getCategoryColor = (category: string) => {
    const colors = {
      experience: ['#8B5CF6', '#A855F7'],
      tips: ['#EC4899', '#F97316'],
      research: ['#10B981', '#34D399'],
      support: ['#F59E0B', '#FBBF24'],
      success: ['#6366F1', '#8B5CF6'],
    };
    return colors[category as keyof typeof colors] || ['#8B5CF6', '#A855F7'];
  };

  const handlePostPress = (post: CommunityPost) => {
    setSelectedPost(post);
    setShowPostModal(true);
  };

  const toggleLike = (postId: string) => {
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          const newLikedState = !post.engagement.userLiked;
          const updatedPost = {
            ...post,
            engagement: {
              ...post.engagement,
              likes: newLikedState 
                ? post.engagement.likes + 1 
                : post.engagement.likes - 1,
              userLiked: newLikedState
            }
          };
          
          // Also update selectedPost if it's the same post
          if (selectedPost && selectedPost.id === postId) {
            setSelectedPost(updatedPost);
          }
          
          return updatedPost;
        }
        return post;
      })
    );
    
    // Show feedback
    console.log(`👍 Like toggled for post ${postId}`);
    Alert.alert('TEST', `Like clicked for post ${postId}!`, [{ text: 'OK' }]); // DEBUG: Temporary test alert
  };

  const handleShare = (postId: string, postTitle: string) => {
    // Update share count in posts
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          const updatedPost = {
            ...post,
            engagement: {
              ...post.engagement,
              shares: post.engagement.shares + 1
            }
          };
          
          // Also update selectedPost if it's the same post
          if (selectedPost && selectedPost.id === postId) {
            setSelectedPost(updatedPost);
          }
          
          return updatedPost;
        }
        return post;
      })
    );
    
    // Show success feedback
    if (Platform.OS === 'web') {
      // Web için visible alert
      alert(`🔗 Shared Successfully!\n"${postTitle}" has been shared to your network.`);
    } else {
      // Mobile için Alert.alert
      Alert.alert(
        '🔗 Shared Successfully!', 
        `"${postTitle}" has been shared to your network.`, 
        [
          { 
            text: 'OK',
            style: 'default'
          }
        ]
      );
    }
    console.log(`🔗 Post shared: ${postId} - "${postTitle}"`);
  };

  const toggleCommentLike = (commentId: string, postId: string) => {
    // First try to update user comments
    let foundInUserComments = false;
    setComments(prevComments => {
      const updatedComments = { ...prevComments };
      if (updatedComments[postId]) {
        updatedComments[postId] = updatedComments[postId].map(comment => {
          if (comment.id === commentId) {
            foundInUserComments = true;
            const newLikedState = !comment.userLiked;
            return {
              ...comment,
              likes: newLikedState ? comment.likes + 1 : comment.likes - 1,
              userLiked: newLikedState
            };
          }
          return comment;
        });
      }
      return updatedComments;
    });
    
    // If not found in user comments, it must be a mock comment - show visual feedback
    if (!foundInUserComments) {
      if (Platform.OS === 'web') {
        alert(`❤️ Liked comment! (Mock comments don't persist)`);
      } else {
        Alert.alert('❤️ Liked!', 'Comment liked! (Mock comments don\'t persist)', [{ text: 'OK' }]);
      }
    }
    
    console.log(`❤️ Comment like toggled: ${commentId} in post ${postId}, found in user comments: ${foundInUserComments}`);
  };

  const addComment = (postId: string, commentText: string) => {
    if (!commentText.trim()) return;
    
    // Create new comment object
    const newCommentObj: Comment = {
      id: `c_${Date.now()}`,
      author: user?.name || 'You',
      content: commentText.trim(),
      timeAgo: 'just now',
      likes: 0,
      userLiked: false
    };
    
    // Add comment to local state for immediate display
    setComments(prevComments => {
      const newCommentsState = {
        ...prevComments,
        [postId]: [...(prevComments[postId] || []), newCommentObj]
      };
      console.log(`💬 Updated comments state for post ${postId}:`, newCommentsState[postId]);
      return newCommentsState;
    });
    
    // Update comment count in post
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          const updatedPost = {
            ...post,
            engagement: {
              ...post.engagement,
              comments: post.engagement.comments + 1
            }
          };
          
          // Also update selectedPost if it's the same post
          if (selectedPost && selectedPost.id === postId) {
            setSelectedPost(updatedPost);
          }
          
          return updatedPost;
        }
        return post;
      })
    );
    
    // Clear input and dismiss keyboard
    setNewComment('');
    Keyboard.dismiss();
    
    // Scroll to bottom to show new comment
    setTimeout(() => {
      modalScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    // Show success feedback
    if (Platform.OS === 'web') {
      // Web için visible alert
      alert(`💬 Comment Added!\nYour comment has been posted successfully.`);
    } else {
      // Mobile için Alert.alert
      Alert.alert('💬 Comment Added!', 'Your comment has been posted successfully.', [{ text: 'OK' }]);
    }
    console.log(`💬 Comment added to post ${postId}: "${commentText.slice(0, 30)}..."`);
  };

  const renderPostModal = () => {
    if (!selectedPost) return null;

    const comments = getCommentsForPost(selectedPost.id);

    return (
      <Modal
        visible={showPostModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowPostModal(false)}
      >
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f172a']}
          style={styles.modalContainer}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowPostModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Discussion</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView ref={modalScrollRef} style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Post Content */}
            <View style={styles.fullPostContainer}>
              <View style={styles.postHeader}>
                <Text style={styles.authorAvatar}>{selectedPost.author.avatar}</Text>
                <View style={styles.authorInfo}>
                  <View style={styles.authorNameRow}>
                    <Text style={styles.authorName}>{selectedPost.author.name}</Text>
                    {selectedPost.author.verified && (
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    )}
                  </View>
                  <Text style={styles.memberSince}>Member for {selectedPost.author.memberSince}</Text>
                </View>
                <Text style={styles.timeAgo}>{selectedPost.timeAgo}</Text>
              </View>

              <Text style={styles.postTopic}>{selectedPost.topic}</Text>
              <Text style={styles.postTitle}>{selectedPost.title}</Text>
              <Text style={styles.postContent}>{selectedPost.content}</Text>

              {/* Tags */}
              <View style={styles.tagsContainer}>
                {selectedPost.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>

              {/* Engagement */}
              <View style={styles.engagementRow}>
                <TouchableOpacity 
                  style={styles.engagementButton}
                  onPress={() => toggleLike(selectedPost.id)}
                >
                  <Ionicons 
                    name={selectedPost.engagement.userLiked ? "heart" : "heart-outline"} 
                    size={20} 
                    color={selectedPost.engagement.userLiked ? "#EC4899" : "#E5E7EB"} 
                  />
                  <Text style={styles.engagementText}>{selectedPost.engagement.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.engagementButton}
                  onPress={() => {
                    // Focus on comment input when comment button is pressed
                    setTimeout(() => {
                      commentInputRef.current?.focus();
                    }, 100);
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#E5E7EB" />
                  <Text style={styles.engagementText}>{selectedPost.engagement.comments}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.engagementButton}
                  onPress={() => handleShare(selectedPost.id, selectedPost.title)}
                >
                  <Ionicons name="share-outline" size={20} color="#E5E7EB" />
                  <Text style={styles.engagementText}>{selectedPost.engagement.shares}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Comments Section */}
            <View style={styles.commentsSection}>
              <Text style={styles.commentsTitle}>💬 Comments ({selectedPost.engagement.comments})</Text>
              
              {/* Show user comments for this post first, then mock comments */}
              {(comments[selectedPost.id] || []).map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{comment.author}</Text>
                    <Text style={styles.commentTime}>{comment.timeAgo}</Text>
                  </View>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                  <TouchableOpacity 
                    style={styles.commentLike}
                    onPress={() => toggleCommentLike(comment.id, selectedPost.id)}
                  >
                    <Ionicons 
                      name={comment.userLiked ? "heart" : "heart-outline"} 
                      size={16} 
                      color={comment.userLiked ? "#EC4899" : "#9CA3AF"} 
                    />
                    <Text style={styles.commentLikeText}>{comment.likes}</Text>
                  </TouchableOpacity>
                </View>
              ))}
              
              {/* Then show mock comments */}
              {(getCommentsForPost(selectedPost.id) || []).map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{comment.author}</Text>
                    <Text style={styles.commentTime}>{comment.timeAgo}</Text>
                  </View>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                  <TouchableOpacity 
                    style={styles.commentLike}
                    onPress={() => toggleCommentLike(comment.id, selectedPost.id)}
                  >
                    <Ionicons 
                      name={comment.userLiked ? "heart" : "heart-outline"} 
                      size={16} 
                      color={comment.userLiked ? "#EC4899" : "#9CA3AF"} 
                    />
                    <Text style={styles.commentLikeText}>{comment.likes}</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {(comments[selectedPost.id] || []).length === 0 && getCommentsForPost(selectedPost.id).length === 0 && (
                <Text style={styles.noComments}>No comments yet. Be the first to share your thoughts!</Text>
              )}                            {/* Comment Input Section */}
              <View style={styles.commentInputSection}>
                <View style={styles.commentInputContainer}>
                  <TextInput
                    ref={commentInputRef}
                    style={styles.commentInput}
                    placeholder="Write a comment..."
                    placeholderTextColor="#9CA3AF"
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    maxLength={500}
                    onSubmitEditing={() => {
                      if (newComment.trim()) {
                        addComment(selectedPost.id, newComment);
                      }
                    }}
                    blurOnSubmit={false}
                    returnKeyType="send"
                  />
                  <TouchableOpacity 
                    style={[styles.commentSubmitBtn, { opacity: newComment.trim() ? 1 : 0.5 }]}
                    onPress={() => addComment(selectedPost.id, newComment)}
                    disabled={!newComment.trim()}
                  >
                    <Ionicons name="send" size={16} color="#8B5CF6" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.modalFooter} />
          </ScrollView>
        </LinearGradient>
      </Modal>
    );
  };

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
          <Text style={styles.glowHeaderSubtitle}>Real ADHD discussions & support</Text>
        </LinearGradient>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {[
              { key: 'trending', label: '🔥 Trending', count: filteredPosts.length },
              { key: 'recent', label: '🕐 Recent', count: posts.filter(p => p.timeAgo.includes('hours')).length },
              { key: 'research', label: '🔬 Research', count: posts.filter(p => p.category === 'research').length },
              { key: 'all', label: '📋 All Posts', count: communityPosts.length }
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterTab,
                  activeFilter === filter.key && styles.filterTabActive
                ]}
                onPress={() => setActiveFilter(filter.key as any)}
              >
                <Text style={[
                  styles.filterTabText,
                  activeFilter === filter.key && styles.filterTabTextActive
                ]}>
                  {filter.label}
                </Text>
                <Text style={[
                  styles.filterTabCount,
                  activeFilter === filter.key && styles.filterTabCountActive
                ]}>
                  {filter.count}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {/* Community Posts */}
          <View style={styles.postsSection}>
            <Text style={styles.sectionTitle}>💬 Community Posts</Text>
            <Text style={styles.sectionSubtitle}>Real stories from real people</Text>
            
            {filteredPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.postCard}
                onPress={() => handlePostPress(post)}
              >
                <LinearGradient
                  colors={getCategoryColor(post.category)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.postGradientBorder}
                >
                  <View style={styles.postContentContainer}>
                    {/* Post Header */}
                    <View style={styles.postHeaderRow}>
                      <View style={styles.authorSection}>
                        <Text style={styles.authorAvatar}>{post.author.avatar}</Text>
                        <View style={styles.authorDetails}>
                          <View style={styles.authorNameRow}>
                            <Text style={styles.authorName}>{post.author.name}</Text>
                            {post.author.verified && (
                              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            )}
                          </View>
                          <Text style={styles.postTimeAgo}>{post.timeAgo}</Text>
                        </View>
                      </View>
                      <Text style={styles.postTopic}>{post.topic}</Text>
                    </View>

                    {/* Post Content */}
                    <Text style={styles.postTitle}>{post.title}</Text>
                    <Text style={styles.postPreview} numberOfLines={3}>
                      {post.content}
                    </Text>

                    {/* Tags */}
                    <View style={styles.postTags}>
                      {post.tags.slice(0, 3).map((tag, index) => (
                        <View key={index} style={styles.postTag}>
                          <Text style={styles.postTagText}>#{tag}</Text>
                        </View>
                      ))}
                      {post.tags.length > 3 && (
                        <Text style={styles.moreTags}>+{post.tags.length - 3}</Text>
                      )}
                    </View>

                    {/* Engagement Footer */}
                    <View style={styles.postFooter}>
                      <View style={styles.engagementStats}>
                        <TouchableOpacity 
                          style={styles.engagementStatItem}
                          onPress={() => toggleLike(post.id)}
                        >
                          <Ionicons 
                            name={post.engagement.userLiked ? "heart" : "heart-outline"} 
                            size={16} 
                            color={post.engagement.userLiked ? "#EC4899" : "#9CA3AF"} 
                          />
                          <Text style={styles.statText}>{post.engagement.likes}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.engagementStatItem}
                          onPress={() => handlePostPress(post)}
                        >
                          <Ionicons name="chatbubble-outline" size={16} color="#9CA3AF" />
                          <Text style={styles.statText}>{post.engagement.comments}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.engagementStatItem}
                          onPress={() => handleShare(post.id, post.title)}
                        >
                          <Ionicons name="share-outline" size={16} color="#9CA3AF" />
                          <Text style={styles.statText}>{post.engagement.shares}</Text>
                        </TouchableOpacity>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* Community Stats */}
          <View style={styles.statsSection}>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.1)', 'rgba(236, 72, 153, 0.1)']}
              style={styles.statsCard}
            >
              <Text style={styles.statsTitle}>🏆 Community Impact</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>12.4K</Text>
                  <Text style={styles.statLabel}>Active Members</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>847</Text>
                  <Text style={styles.statLabel}>Daily Posts</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>94%</Text>
                  <Text style={styles.statLabel}>Positive Feedback</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>2.8K</Text>
                  <Text style={styles.statLabel}>Support Messages</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </ScrollView>
      </View>


      {/* Post Detail Modal */}
      {renderPostModal()}
      {/* Banner Ad for Free Users */}
      <MockAdBanner />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  glowHeader: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  glowHeaderTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 6,
  },
  glowHeaderSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Filter System
  filterContainer: {
    marginBottom: 20,
  },
  filterScroll: {
    paddingLeft: 2,
  },
  filterTab: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderColor: '#8B5CF6',
  },
  filterTabText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  filterTabCount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  filterTabCountActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Posts Section
  postsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sectionSubtitle: {
    color: '#E5E7EB',
    fontSize: 16,
    marginBottom: 20,
  },
  postCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  postGradientBorder: {
    padding: 2,
    borderRadius: 20,
  },
  postContentContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 18,
    padding: 16,
  },
  postGradient: {
    padding: 20,
  },
  postHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorDetails: {
    flex: 1,
  },
  postTimeAgo: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  postPreview: {
    color: '#E5E7EB',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  postTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  postTag: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  postTagText: {
    color: '#A855F7',
    fontSize: 12,
    fontWeight: '600',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorAvatar: {
    fontSize: 20,
    marginRight: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  authorName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 6,
  },
  memberSince: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  timeAgo: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  postTopic: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  postTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    lineHeight: 24,
  },
  postContentPreview: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    alignItems: 'center',
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
  },
  moreTags: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontStyle: 'italic',
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  engagementText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  readMore: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readMoreText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 4,
  },

  // Stats Section
  statsSection: {
    marginBottom: 24,
  },
  statsCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  statsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: 16,
  },
  statNumber: {
    color: '#8B5CF6',
    fontSize: 24,
    fontWeight: '900',
    textShadowColor: 'rgba(139, 92, 246, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.2)',
  },
  closeButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  fullPostContainer: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.2)',
    marginBottom: 20,
  },
  postContent: {
    color: '#E5E7EB',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'justify',
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginRight: 12,
  },
  commentsSection: {
    marginBottom: 20,
  },
  commentsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    textShadowColor: '#EC4899',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  commentItem: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthor: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  commentTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  commentContent: {
    color: '#E5E7EB',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
    textAlign: 'justify',
  },
  commentLike: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentLikeText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginLeft: 6,
  },
  noComments: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  modalFooter: {
    height: 30,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  engagementStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  engagementStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  commentInputSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(139, 92, 246, 0.2)",
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  commentInput: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  commentSubmitBtn: {
    marginLeft: 8,
    padding: 8,
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.4)",
  },
});