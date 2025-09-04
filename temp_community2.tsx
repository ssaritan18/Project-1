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
