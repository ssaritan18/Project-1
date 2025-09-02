import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type OnboardingResult = {
  overall_score: number;
  categories: {
    attention: number;
    hyperactivity: number;
    organization: number;
    emotional: number;
    social: number;
  };
  recommendations: string[];
  adhd_type: 'primarily_inattentive' | 'primarily_hyperactive' | 'combined' | 'mild_traits';
};

type OnboardingResultsProps = {
  result: OnboardingResult;
  onContinue: () => void;
};

const { width } = Dimensions.get('window');

export function OnboardingResults({ result, onContinue }: OnboardingResultsProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Start pulse animation for continue button
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 2000);
  }, []);

  const getTypeDescription = () => {
    switch (result.adhd_type) {
      case 'primarily_inattentive':
        return {
          title: 'Primarily Inattentive',
          icon: '🎯',
          description: 'You show strong patterns of inattention. You might struggle with focus, organization, and completing tasks, but you\'re probably not hyperactive.',
          color: '#4A90E2'
        };
      case 'primarily_hyperactive':
        return {
          title: 'Primarily Hyperactive-Impulsive',
          icon: '⚡',
          description: 'You show strong patterns of hyperactivity and impulsivity. You might fidget, talk excessively, or act without thinking, but attention might not be your main challenge.',
          color: '#FF6B35'
        };
      case 'combined':
        return {
          title: 'Combined Presentation',
          icon: '🌟',
          description: 'You show patterns of both inattention and hyperactivity-impulsivity. This is the most common ADHD presentation.',
          color: '#6C5CE7'
        };
      case 'mild_traits':
        return {
          title: 'Mild ADHD Traits',
          icon: '🌱',  
          description: 'You show some ADHD-like traits, but they may not significantly impact your daily life. Many neurodivergent people have some ADHD characteristics.',
          color: '#00C851'
        };
    }
  };

  const getCategoryColor = (score: number) => {
    if (score >= 80) return '#FF3547'; // High - Red
    if (score >= 60) return '#FF6B35'; // Medium-High - Orange  
    if (score >= 40) return '#FFD700'; // Medium - Yellow
    if (score >= 20) return '#4A90E2'; // Low-Medium - Blue
    return '#00C851'; // Low - Green
  };

  const typeInfo = getTypeDescription();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>🧠✨</Text>
            <Text style={styles.headerTitle}>Your ADHD Profile</Text>
            <Text style={styles.headerSubtitle}>
              Understanding your unique neurodivergent brain
            </Text>
          </View>

          {/* Overall Score */}
          <View style={styles.scoreSection}>
            <Text style={styles.sectionTitle}>Overall Assessment</Text>
            <View style={[styles.scoreCard, { borderColor: getCategoryColor(result.overall_score) }]}>
              <Text style={styles.scoreNumber}>{result.overall_score}%</Text>
              <Text style={styles.scoreLabel}>ADHD Traits Present</Text>
            </View>
          </View>

          {/* Type Description */}
          <View style={styles.typeSection}>
            <Text style={styles.sectionTitle}>Your ADHD Type</Text>
            <View style={[styles.typeCard, { borderColor: typeInfo.color }]}>
              <Text style={styles.typeIcon}>{typeInfo.icon}</Text>
              <Text style={[styles.typeTitle, { color: typeInfo.color }]}>
                {typeInfo.title}
              </Text>
              <Text style={styles.typeDescription}>
                {typeInfo.description}
              </Text>
            </View>
          </View>

          {/* Category Breakdown */}
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Category Breakdown</Text>
            {Object.entries(result.categories).map(([category, score]) => {
              const categoryNames = {
                attention: { name: 'Attention', icon: '🎯' },
                hyperactivity: { name: 'Hyperactivity', icon: '⚡' },
                organization: { name: 'Organization', icon: '📋' },
                emotional: { name: 'Emotional', icon: '💚' },
                social: { name: 'Social', icon: '👥' }
              };
              
              const categoryInfo = categoryNames[category as keyof typeof categoryNames];
              const color = getCategoryColor(score);
              
              return (
                <View key={category} style={styles.categoryItem}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryIcon}>{categoryInfo.icon}</Text>
                    <Text style={styles.categoryName}>{categoryInfo.name}</Text>
                    <Text style={[styles.categoryScore, { color }]}>{score}%</Text>
                  </View>
                  <View style={styles.categoryBarContainer}>
                    <View 
                      style={[
                        styles.categoryBar,
                        {
                          width: `${score}%`,
                          backgroundColor: color
                        }
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          {/* Recommendations */}
          <View style={styles.recommendationsSection}>
            <Text style={styles.sectionTitle}>Personalized Recommendations</Text>
            <Text style={styles.recommendationsIntro}>
              Based on your results, here are some features that might help you:
            </Text>
            {result.recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </View>

          {/* Encouragement */}
          <View style={styles.encouragementSection}>
            <Text style={styles.encouragementTitle}>Remember: You're Amazing! 💜</Text>
            <Text style={styles.encouragementText}>
              ADHD brains are creative, innovative, and full of potential. This assessment 
              helps us personalize your experience in the ADHDers Social Club. You're 
              joining a community that understands and celebrates neurodiversity!
            </Text>
          </View>

          {/* Continue Button */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity onPress={onContinue}>
              <LinearGradient
                colors={['#8B5CF6', '#EC4899', '#F97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueButton}
              >
                <Text style={styles.continueButtonText}>
                  Continue to Your Dashboard 🚀
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Transparent to show parent gradient
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  headerIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  headerSubtitle: {
    color: '#E5E7EB',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  scoreSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  scoreCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 2,
    padding: 24,
    alignItems: 'center',
  },
  scoreNumber: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '900',
    marginBottom: 8,
  },
  scoreLabel: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
  },
  typeSection: {
    marginBottom: 24,
  },
  typeCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  typeTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  typeDescription: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  categoriesSection: {
    marginBottom: 24,
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  categoryName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  categoryScore: {
    fontSize: 16,
    fontWeight: '700',
  },
  categoryBarContainer: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryBar: {
    height: '100%',
    borderRadius: 4,
  },
  recommendationsSection: {
    marginBottom: 24,
  },
  recommendationsIntro: {
    color: '#aaa',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  recommendationItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
    padding: 16,
    marginBottom: 12,
  },
  recommendationText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  encouragementSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#6C5CE7',
  },
  encouragementTitle: {
    color: '#6C5CE7',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  encouragementText: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});