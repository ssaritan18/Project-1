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

// Placeholder content - future expansion point
const placeholderContent: ContentItem[] = [
  {
    id: 'adhd_hyperfocus',
    title: 'Understanding ADHD Hyperfocus',
    type: 'tip',
    icon: '🎯',
    preview: 'Learn how to harness your hyperfocus superpowers...',
    content: 'Hyperfocus is like having a superpower that sometimes feels like a curse. When your ADHD brain locks onto something interesting, you can achieve incredible things. The key is learning to direct this power intentionally.\n\nTips for managing hyperfocus:\n• Set boundaries before you start (timers, breaks)\n• Have snacks and water ready\n• Let others know you\'ll be unavailable\n• Choose important tasks when possible\n\nRemember: Hyperfocus isn\'t a weakness - it\'s one of your greatest strengths!',
    category: 'adhd'
  },
  {
    id: 'rejection_sensitivity',
    title: 'Dealing with Rejection Sensitive Dysphoria',
    type: 'strategy',
    icon: '💜',
    preview: 'RSD can feel overwhelming, but there are ways to cope...',
    content: 'You\'re not being "too sensitive" - your brain literally processes rejection differently.\n\nCoping strategies:\n• Recognize RSD when it happens\n• Practice self-compassion\n• Remember: One person\'s opinion ≠ universal truth\n\nYou\'re worthy of love and respect, always. 💜',
    category: 'adhd'
  },
  {
    id: 'neurodivergent_strengths',
    title: 'Celebrating Neurodivergent Strengths',
    type: 'awareness',
    icon: '🌟',
    preview: 'Your different brain is a gift to the world...',
    content: 'Neurodivergent minds bring incredible gifts:\n\n✨ Creative problem-solving\n🔍 Attention to detail\n⚡ High energy and enthusiasm\n🎨 Unique perspectives\n💡 Innovation\n🤝 Deep empathy\n\nThe world needs your unique way of thinking.',
    category: 'general'
  }
];

// Note: Placeholder for future expansion
if (!showFullContent) {
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All', icon: '🌈' },
    { id: 'adhd', name: 'ADHD', icon: '🎯' },
    { id: 'general', name: 'General', icon: '🌟' },
    { id: 'workplace', name: 'Work', icon: '💼' },
  ];

  const filteredContent = selectedCategory === 'all' 
    ? placeholderContent
    : placeholderContent.filter(item => item.category === selectedCategory);

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getTypeColor = (type: ContentItem['type']) => {
    switch (type) {
      case 'tip': return '#4A90E2';
      case 'article': return '#6C5CE7';
      case 'awareness': return '#FF6B35';
      case 'strategy': return '#00C851';
      default: return '#888';
    }
  };

  const getTypeLabel = (type: ContentItem['type']) => {
    switch (type) {
      case 'tip': return 'Quick Tip';
      case 'article': return 'Deep Dive';
      case 'awareness': return 'Awareness';
      case 'strategy': return 'Strategy';
      default: return 'Content';
    }
  };

  if (!showFullContent) {
    // Compact preview mode
    return (
      <View style={[styles.compactContainer, style]}>
        <TouchableOpacity style={styles.compactHeader} onPress={onPress}>
          <View style={styles.compactHeaderLeft}>
            <Text style={styles.compactIcon}>🧠</Text>
            <View>
              <Text style={styles.compactTitle}>Neurodivergency Hub</Text>
              <Text style={styles.compactSubtitle}>Tips, strategies & awareness</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>
        
        <View style={styles.compactPreview}>
          {placeholderContent.slice(0, 2).map((item) => (
            <View key={item.id} style={styles.compactItem}>
              <Text style={styles.compactItemIcon}>{item.icon}</Text>
              <Text style={styles.compactItemTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
          ))}
          <Text style={styles.moreContent}>+{placeholderContent.length - 2} more</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>🧠 Neurodivergency Hub</Text>
        <Text style={styles.subtitle}>
          Educational content, tips, and awareness resources
        </Text>
        <Text style={styles.placeholder}>
          💡 Future integration point for specialized content
        </Text>
      </View>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryFilter}
        contentContainerStyle={styles.categoryFilterContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={[
              styles.categoryText,
              selectedCategory === category.id && styles.categoryTextActive
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content List */}
      <ScrollView style={styles.contentList} showsVerticalScrollIndicator={false}>
        {filteredContent.map((item) => {
          const isExpanded = expandedItems.has(item.id);
          const typeColor = getTypeColor(item.type);
          
          return (
            <View key={item.id} style={styles.contentItem}>
              <TouchableOpacity
                style={styles.contentHeader}
                onPress={() => toggleExpanded(item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.contentHeaderLeft}>
                  <Text style={styles.contentIcon}>{item.icon}</Text>
                  <View style={styles.contentInfo}>
                    <Text style={styles.contentTitle}>{item.title}</Text>
                    <View style={styles.contentMeta}>
                      <View style={[styles.typeTag, { backgroundColor: `${typeColor}20`, borderColor: typeColor }]}>
                        <Text style={[styles.typeTagText, { color: typeColor }]}>
                          {getTypeLabel(item.type)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <Ionicons 
                  name={isExpanded ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#888" 
                />
              </TouchableOpacity>

              {!isExpanded && (
                <Text style={styles.contentPreview}>{item.preview}</Text>
              )}

              {isExpanded && (
                <View style={styles.expandedContent}>
                  <Text style={styles.contentText}>{item.content}</Text>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: typeColor }]}
                    onPress={() => onContentPress?.(item)}
                  >
                    <Text style={styles.actionButtonText}>Learn More</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {/* Future Integration Placeholder */}
        <View style={styles.integrationPlaceholder}>
          <Text style={styles.placeholderTitle}>🚀 Coming Soon</Text>
          <Text style={styles.placeholderText}>
            This section will expand with:
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>📚 Curated articles and research</Text>
            <Text style={styles.featureItem}>🎥 Educational videos and webinars</Text>
            <Text style={styles.featureItem}>🧭 Personalized recommendations</Text>
            <Text style={styles.featureItem}>👥 Community-contributed content</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

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
  // Compact preview mode styles
  compactContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    margin: 16,
    overflow: 'hidden',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  compactHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compactIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  compactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  compactSubtitle: {
    fontSize: 14,
    color: '#aaa',
  },
  compactPreview: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    padding: 16,
  },
  compactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactItemIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  compactItemTitle: {
    fontSize: 14,
    color: '#ccc',
    flex: 1,
  },
  moreContent: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  
  // Full content mode styles
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  header: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
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
    marginBottom: 8,
  },
  placeholder: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  categoryFilter: {
    maxHeight: 60,
    backgroundColor: '#1a1a1a',
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#333',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#4A90E2',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    color: '#aaa',
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#fff',
  },
  contentList: {
    flex: 1,
    padding: 16,
  },
  contentItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 16,
    overflow: 'hidden',
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  contentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contentIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  contentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeTag: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  contentPreview: {
    fontSize: 14,
    color: '#aaa',
    paddingHorizontal: 16,
    paddingBottom: 16,
    lineHeight: 20,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    padding: 16,
  },
  contentText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
    marginBottom: 16,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  integrationPlaceholder: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6C5CE7',
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    marginTop: 16,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6C5CE7',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 12,
  },
  featureList: {
    alignItems: 'flex-start',
  },
  featureItem: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    textAlign: 'left',
  },
});

export default NeurodivergencyContent;