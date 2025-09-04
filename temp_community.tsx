import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Modal
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'trending' | 'recent' | 'research'>('trending');
  const [posts, setPosts] = useState<CommunityPost[]>(communityPosts); // Make posts state manageable
  const [newComment, setNewComment] = useState(''); // For comment input
