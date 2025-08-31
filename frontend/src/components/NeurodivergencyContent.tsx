import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NeurodivergencyContentProps {
  onPress?: () => void;
  showFullContent?: boolean;
}

export const NeurodivergencyContent: React.FC<NeurodivergencyContentProps> = ({ 
  onPress, 
  showFullContent = false 
}) => {
  const contentSections = [
    {
      id: 'understanding',
      title: '🧠 Understanding ADHD',
      emoji: '🧠',
      description: 'Learn about ADHD symptoms, types, and how it affects daily life',
      placeholder: 'Educational content about ADHD will be added here...'
    },
    {
      id: 'strategies',
      title: '⚡ Coping Strategies',
      emoji: '⚡',
      description: 'Practical tips and techniques for managing ADHD symptoms',
      placeholder: 'Coping strategies and management techniques will be featured here...'
    },
    {
      id: 'community',
      title: '🤝 Community Support',
      emoji: '🤝',
      description: 'Connect with others who understand your journey',
      placeholder: 'Community resources and support groups information will be available here...'
    },
    {
      id: 'resources',
      title: '📚 Resources & Tools',
      emoji: '📚',
      description: 'Helpful apps, books, and professional resources',
      placeholder: 'Curated resources and tools for ADHD management will be listed here...'
    }
  ];

  if (!showFullContent) {
    // Compact preview version
    return (
      <TouchableOpacity style={styles.previewContainer} onPress={onPress}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>🧠 Neurodivergency Hub</Text>
          <Ionicons name="chevron-forward" size={20} color="#A3C9FF" />
        </View>
        <Text style={styles.previewDescription}>
          Educational content, coping strategies, and community resources for neurodivergent individuals
        </Text>
        <View style={styles.previewBadge}>
          <Text style={styles.previewBadgeText}>Coming Soon</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Full content version
  return (
    <ScrollView style={styles.fullContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.fullHeader}>
        <Text style={styles.fullTitle}>🧠 Neurodivergency Hub</Text>
        <Text style={styles.fullSubtitle}>
          A dedicated space for neurodivergent community members to learn, grow, and connect
        </Text>
      </View>

      {contentSections.map((section) => (
        <View key={section.id} style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>{section.emoji}</Text>
            <View style={styles.sectionInfo}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionDescription}>{section.description}</Text>
            </View>
          </View>
          
          <View style={styles.placeholderContent}>
            <Text style={styles.placeholderText}>{section.placeholder}</Text>
            <TouchableOpacity style={styles.comingSoonBtn}>
              <Text style={styles.comingSoonText}>Content Coming Soon</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={styles.footerNote}>
        <Text style={styles.footerText}>
          💡 This section will be populated with evidence-based content, community-contributed resources, 
          and expert insights to support the neurodivergent community.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  // Preview styles
  previewContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  previewDescription: {
    color: '#bdbdbd',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  previewBadge: {
    backgroundColor: 'rgba(163, 201, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  previewBadgeText: {
    color: '#A3C9FF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Full content styles
  fullContainer: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  fullHeader: {
    padding: 20,
    backgroundColor: '#111',
    borderRadius: 12,
    marginBottom: 16,
  },
  fullTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  fullSubtitle: {
    color: '#bdbdbd',
    fontSize: 16,
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionEmoji: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    color: '#bdbdbd',
    fontSize: 14,
    lineHeight: 18,
  },
  placeholderContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#A3C9FF',
  },
  placeholderText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  comingSoonBtn: {
    backgroundColor: 'rgba(163, 201, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  comingSoonText: {
    color: '#A3C9FF',
    fontSize: 12,
    fontWeight: '600',
  },
  footerNote: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  footerText: {
    color: '#bdbdbd',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});