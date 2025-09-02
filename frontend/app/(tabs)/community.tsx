import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  
  // Hot Topics Data - Glow Inspired
  const hotTopics = [
    {
      id: '1',
      title: '🎯 ADHD Focus Techniques',
      description: 'Share your best focus strategies and tips',
      participants: 1247,
      gradient: ['#8B5CF6', '#A855F7'],
      trending: true
    },
    {
      id: '2', 
      title: '💊 Medication Experiences',
      description: 'Open discussion about ADHD medications',
      participants: 892,
      gradient: ['#EC4899', '#F97316'],
      trending: false
    },
    {
      id: '3',
      title: '🎨 Creative ADHD Minds',
      description: 'Show off your creative projects and art',
      participants: 1156,
      gradient: ['#F97316', '#FBBF24'],
      trending: true
    },
    {
      id: '4',
      title: '🏢 Workplace Success',
      description: 'Navigate work life with ADHD',
      participants: 743,
      gradient: ['#10B981', '#34D399'],
      trending: false
    },
    {
      id: '5',
      title: '💚 Mental Health Check',
      description: 'Support and self-care discussions',
      participants: 1834,
      gradient: ['#6366F1', '#8B5CF6'],
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
                      <Text style={styles.hotTopicIcon}>{topic.title.split(' ')[0]}</Text>
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

          {/* Coming Soon Section */}
          <View style={styles.comingSoonSection}>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.1)', 'rgba(236, 72, 153, 0.1)']}
              style={styles.comingSoonCard}
            >
              <Text style={styles.comingSoonTitle}>📝 Community Posts</Text>
              <Text style={styles.comingSoonDescription}>
                Share your stories, ask questions, and connect with other ADHDers. This feature is launching soon!
              </Text>
              <TouchableOpacity style={styles.comingSoonBtn}>
                <Text style={styles.comingSoonBtnText}>Get Notified</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  glowHeader: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  glowHeaderTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  glowHeaderSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 4,
  },
  hotTopicsSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
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
  hotTopicCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  hotTopicGradient: {
    padding: 20,
  },
  hotTopicContent: {
    
  },
  hotTopicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hotTopicIcon: {
    fontSize: 28,
  },
  trendingBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendingText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  hotTopicTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  hotTopicDescription: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  hotTopicFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantCount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  comingSoonSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  comingSoonCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    alignItems: 'center',
  },
  comingSoonTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  comingSoonDescription: {
    color: '#E5E7EB',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  comingSoonBtn: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  comingSoonBtnText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '700',
  },
});