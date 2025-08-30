import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { Alert } from 'react-native';

export type Post = {
  _id: string;
  author_id: string;
  author_name: string;
  author_email?: string;
  text: string;
  image_url?: string;
  attachments: string[];
  tags: string[];
  visibility: 'public' | 'friends' | 'private';
  reactions: {
    like: number;
    heart: number;
    clap: number;
    star: number;
  };
  reaction_counts?: {
    like: number;
    heart: number;
    clap: number;
    star: number;
  };
  total_reactions?: number;
  comments_count?: number;
  created_at: string;
  updated_at: string;
};

type CommunityContextType = {
  posts: Post[];
  loading: boolean;
  error: string | null;
  refreshPosts: () => Promise<void>;
  createPost: (text: string, imageUrl?: string, tags?: string[], visibility?: string) => Promise<void>;
  reactToPost: (postId: string, reactionType: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
};

const CommunityContext = createContext<CommunityContextType | null>(null);

export function useCommunity() {
  const context = useContext(CommunityContext);
  if (!context) {
    throw new Error('useCommunity must be used within CommunityProvider');
  }
  return context;
}

export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const { mode, isAuthenticated, user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock local posts for development
  const mockPosts: Post[] = [
    {
      _id: 'mock_1',
      author_id: 'mock_user_1',
      author_name: 'Alex Chen',
      text: 'Just finished organizing my workspace using the ADHD-friendly tips from this community! 🎉 Anyone else find that visual organization helps with focus?',
      image_url: undefined,
      attachments: [],
      tags: ['productivity', 'workspace'],
      visibility: 'public',
      reactions: { like: 12, heart: 5, clap: 3, star: 1 },
      reaction_counts: { like: 12, heart: 5, clap: 3, star: 1 },
      total_reactions: 21,
      comments_count: 8,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      _id: 'mock_2',
      author_id: 'mock_user_2',
      author_name: 'Maya Rodriguez',
      text: 'Sharing my daily routine that has been helping with time management. The key is breaking everything into 25-minute chunks! ⏰',
      image_url: undefined,
      attachments: [],
      tags: ['time-management', 'routine'],
      visibility: 'friends',
      reactions: { like: 8, heart: 15, clap: 2, star: 0 },
      reaction_counts: { like: 8, heart: 15, clap: 2, star: 0 },
      total_reactions: 25,
      comments_count: 12,
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    }
  ];

  const refreshPosts = async () => {
    if (mode === 'sync' && isAuthenticated) {
      setLoading(true);
      setError(null);
      try {
        // TODO: Call backend API when implemented
        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/posts/feed`, {
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setPosts(data.posts || []);
        } else {
          throw new Error(`Failed to fetch posts: ${response.status}`);
        }
      } catch (err) {
        console.error('Failed to fetch posts:', err);
        setError('Failed to load posts');
        setPosts(mockPosts); // Fallback to mock data
      } finally {
        setLoading(false);
      }
    } else {
      // Local mode - use mock data
      setPosts(mockPosts);
    }
  };

  const createPost = async (text: string, imageUrl?: string, tags?: string[], visibility = 'friends') => {
    if (mode === 'sync' && isAuthenticated) {
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/posts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text,
            image_url: imageUrl,
            tags: tags || [],
            visibility
          })
        });

        if (response.ok) {
          const newPost = await response.json();
          setPosts(prev => [newPost, ...prev]);
          Alert.alert('Success', 'Post created successfully!');
        } else {
          throw new Error(`Failed to create post: ${response.status}`);
        }
      } catch (err) {
        console.error('Failed to create post:', err);
        Alert.alert('Error', 'Failed to create post');
      }
    } else {
      // Local mode - add to mock data
      const newPost: Post = {
        _id: `local_${Date.now()}`,
        author_id: 'current_user',
        author_name: 'You',
        text,
        image_url: imageUrl,
        attachments: [],
        tags: tags || [],
        visibility: visibility as any,
        reactions: { like: 0, heart: 0, clap: 0, star: 0 },
        reaction_counts: { like: 0, heart: 0, clap: 0, star: 0 },
        total_reactions: 0,
        comments_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setPosts(prev => [newPost, ...prev]);
      Alert.alert('Success', 'Post created (local mode)');
    }
  };

  const reactToPost = async (postId: string, reactionType: string) => {
    if (mode === 'sync' && isAuthenticated) {
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/posts/${postId}/react`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ type: reactionType })
        });

        if (response.ok) {
          // Refresh posts to get updated reaction counts
          await refreshPosts();
        }
      } catch (err) {
        console.error('Failed to react to post:', err);
        Alert.alert('Error', 'Failed to react to post');
      }
    } else {
      // Local mode - update mock data
      setPosts(prev => prev.map(post => 
        post._id === postId 
          ? {
              ...post,
              reactions: {
                ...post.reactions,
                [reactionType as keyof typeof post.reactions]: post.reactions[reactionType as keyof typeof post.reactions] + 1
              }
            }
          : post
      ));
    }
  };

  const deletePost = async (postId: string) => {
    if (mode === 'sync' && isAuthenticated) {
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/posts/${postId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          setPosts(prev => prev.filter(post => post._id !== postId));
          Alert.alert('Success', 'Post deleted successfully');
        }
      } catch (err) {
        console.error('Failed to delete post:', err);
        Alert.alert('Error', 'Failed to delete post');
      }
    } else {
      // Local mode
      setPosts(prev => prev.filter(post => post._id !== postId));
      Alert.alert('Success', 'Post deleted (local mode)');
    }
  };

  // Load posts on mount and when mode/auth changes
  useEffect(() => {
    refreshPosts();
  }, [mode, isAuthenticated]);

  return (
    <CommunityContext.Provider value={{
      posts,
      loading,
      error,
      refreshPosts,
      createPost,
      reactToPost,
      deletePost
    }}>
      {children}
    </CommunityContext.Provider>
  );
}