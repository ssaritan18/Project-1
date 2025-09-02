import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface NeurodivergencyContentProps {
  onPress?: () => void;
  showFullContent?: boolean;
  style?: any;
}

const NeurodivergencyContent: React.FC<NeurodivergencyContentProps> = ({
  onPress,
  showFullContent = false,
  style
}) => {
  // Hot Topics for Neurodivergency Hub - Glow Inspired
  const educationalTopics = [
    {
      id: '1',
      title: '🧠 Understanding ADHD',
      description: 'Learn about ADHD types, symptoms, and brain science',
      readTime: '5 min read',
      color: '#8B5CF6',
      gradient: ['#8B5CF6', '#A855F7'],
      icon: '🧠',
      popular: true
    },
    {
      id: '2', 
      title: '🎯 Focus Strategies',
      description: 'Proven techniques to improve concentration',
      readTime: '7 min read',
      color: '#EC4899',
      gradient: ['#EC4899', '#F97316'],
      icon: '🎯',
      popular: false
    },
    {
      id: '3',
      title: '💊 Medication Guide',
      description: 'Comprehensive guide to ADHD medications',
      readTime: '10 min read',
      color: '#F97316',
      gradient: ['#F97316', '#FBBF24'],
      icon: '💊',
      popular: true
    },
    {
      id: '4',
      title: '🏠 Home Organization',
      description: 'ADHD-friendly organizing and decluttering tips',
      readTime: '6 min read',
      color: '#10B981',
      gradient: ['#10B981', '#34D399'],
      icon: '🏠',
      popular: false
    },
    {
      id: '5',
      title: '💚 Self-Care Essentials',
      description: 'Mental health and wellness for neurodivergents',
      readTime: '8 min read',
      color: '#6366F1',
      gradient: ['#6366F1', '#8B5CF6'],
      icon: '💚',
      popular: true
    },
    {
      id: '6',
      title: '👥 Relationship Tips',
      description: 'Building healthy relationships with ADHD',
      readTime: '9 min read',
      color: '#EC4899',
      gradient: ['#EC4899', '#8B5CF6'],
      icon: '👥',
      popular: false
    }
  ];

  if (!showFullContent) {
    // Compact preview version - Updated for Glow Theme
    return (
      <TouchableOpacity style={[styles.previewContainer, style]} onPress={onPress}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.1)', 'rgba(183, 75, 255, 0.1)']}
          style={styles.previewGradient}
        >
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>🧠 Neurodivergency Hub</Text>
            <Ionicons name="chevron-forward" size={20} color="#8B5CF6" />
          </View>
          <Text style={styles.previewDescription}>
            Educational content, coping strategies, and community resources for neurodivergent individuals
          </Text>
          <View style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>6 Topics Available</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Full content version - Hot Topics Style
  return (
    <View style={[styles.fullContainer, style]}>
      <Text style={styles.title}>🧠 Neurodivergency Hub</Text>
      <Text style={styles.subtitle}>Educational resources and guides</Text>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {educationalTopics.map((topic) => (
          <TouchableOpacity
            key={topic.id}
            style={styles.topicCard}
            onPress={() => console.log(`Opening: ${topic.title}`)}
          >
            <LinearGradient
              colors={topic.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.topicGradient}
            >
              <View style={styles.topicContent}>
                <View style={styles.topicHeader}>
                  <Text style={styles.topicIcon}>{topic.icon}</Text>
                  {topic.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>POPULAR</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <Text style={styles.topicDescription}>{topic.description}</Text>
                <View style={styles.topicFooter}>
                  <Text style={styles.readTime}>📖 {topic.readTime}</Text>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Preview mode styles - Updated for Glow
  previewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  previewGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  previewDescription: {
    color: '#E5E7EB',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  previewBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  previewBadgeText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '700',
  },

  // Full content styles - Hot Topics Style
  fullContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  subtitle: {
    color: '#E5E7EB',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  topicCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  topicGradient: {
    padding: 20,
  },
  topicContent: {
    
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  topicIcon: {
    fontSize: 24,
  },
  popularBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  topicTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  topicDescription: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 14,
  },
  topicFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readTime: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default NeurodivergencyContent;