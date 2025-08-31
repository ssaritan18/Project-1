import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
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
  if (!showFullContent) {
    // Compact preview version
    return (
      <TouchableOpacity style={[styles.previewContainer, style]} onPress={onPress}>
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

  // Full content version (placeholder)
  return (
    <View style={[styles.fullContainer, style]}>
      <Text style={styles.title}>🧠 Neurodivergency Hub</Text>
      <Text style={styles.subtitle}>Content coming soon...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Preview mode styles
  previewContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    padding: 16,
    marginVertical: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  previewDescription: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
    marginBottom: 12,
  },
  previewBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  previewBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Full content mode styles
  fullContainer: {
    flex: 1,
    backgroundColor: '#0c0c0c',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
  },
});

export default NeurodivergencyContent;