import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ADHDQuestion = {
  id: string;
  question: string;
  description?: string;
  type: 'scale' | 'multiple' | 'yes_no';
  options?: string[];
  icon: string;
  category: 'attention' | 'hyperactivity' | 'organization' | 'emotional' | 'social';
};

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

type ADHDOnboardingProps = {
  onComplete: (result: OnboardingResult) => void;
  onSkip?: () => void;
};

const { width, height } = Dimensions.get('window');

const adhdQuestions: ADHDQuestion[] = [
  // Attention Questions
  {
    id: 'attention_1',
    question: 'I often have trouble keeping my attention on tasks or activities',
    description: 'This includes work, school, or fun activities',
    type: 'scale',
    icon: '🎯',
    category: 'attention'
  },
  {
    id: 'attention_2', 
    question: 'I frequently make careless mistakes in work or activities',
    description: 'Missing details or overlooking important information',
    type: 'scale',
    icon: '🔍',
    category: 'attention'
  },
  {
    id: 'attention_3',
    question: 'I have difficulty organizing tasks and activities',
    description: 'Trouble with time management and keeping things in order',
    type: 'scale',
    icon: '📋',
    category: 'attention'
  },
  {
    id: 'attention_4',
    question: 'I avoid or dislike tasks that require sustained mental effort',
    description: 'Like reports, forms, or reviewing lengthy papers',
    type: 'scale',
    icon: '📚',
    category: 'attention'
  },
  
  // Hyperactivity Questions
  {
    id: 'hyperactivity_1',
    question: 'I often fidget with hands/feet or squirm in my seat',
    description: 'Difficulty sitting still when expected to',
    type: 'scale',
    icon: '🪑',
    category: 'hyperactivity'
  },
  {
    id: 'hyperactivity_2',
    question: 'I feel restless or feel like I\'m "driven by a motor"',
    description: 'Often feeling like you need to be moving or doing something',
    type: 'scale',
    icon: '⚡',
    category: 'hyperactivity'
  },
  {
    id: 'hyperactivity_3',
    question: 'I talk excessively or interrupt others frequently',
    description: 'Difficulty waiting for turn in conversations',
    type: 'scale',
    icon: '💬',
    category: 'hyperactivity'
  },
  
  // Organization Questions
  {
    id: 'organization_1',
    question: 'I frequently lose things necessary for tasks',
    description: 'Keys, phone, papers, tools, or other items',
    type: 'scale',
    icon: '🔑',
    category: 'organization'
  },
  {
    id: 'organization_2',
    question: 'I have trouble with time management and deadlines',
    description: 'Often running late or underestimating how long things take',
    type: 'scale',
    icon: '⏰',
    category: 'organization'
  },
  
  // Emotional Questions
  {
    id: 'emotional_1',
    question: 'I experience intense emotions that feel hard to manage',
    description: 'Emotions feel bigger or more overwhelming than they should',
    type: 'scale',
    icon: '💚',
    category: 'emotional'
  },
  {
    id: 'emotional_2',
    question: 'I struggle with rejection sensitivity',
    description: 'Criticism or perceived rejection feels particularly painful',
    type: 'scale',
    icon: '🛡️',
    category: 'emotional'
  },
  
  // Social Questions
  {
    id: 'social_1',
    question: 'I have difficulty reading social cues',
    description: 'Trouble understanding when others are bored, annoyed, or uninterested',
    type: 'scale',
    icon: '👥',
    category: 'social'
  },
  {
    id: 'social_2',
    question: 'I prefer environments that understand neurodiversity',
    description: 'Places where different thinking styles are appreciated',
    type: 'yes_no',
    icon: '🌈',
    category: 'social'
  }
];

export function ADHDOnboarding({ onComplete, onSkip }: ADHDOnboardingProps) {
  const insets = useSafeAreaInsets();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isCompleting, setIsCompleting] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const currentQuestion = adhdQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / adhdQuestions.length) * 100;
  const isLastQuestion = currentQuestionIndex === adhdQuestions.length - 1;

  useEffect(() => {
    // Slide in animation for new question
    slideAnim.setValue(50);
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [currentQuestionIndex]);

  const handleAnswer = (value: number) => {
    // Button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const newAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(newAnswers);

    // Small delay for visual feedback
    setTimeout(() => {
      if (isLastQuestion) {
        completeOnboarding(newAnswers);
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    }, 200);
  };

  const completeOnboarding = (finalAnswers: Record<string, number>) => {
    setIsCompleting(true);
    
    // Calculate results
    const result = calculateADHDResults(finalAnswers);
    
    // Show completion animation
    setTimeout(() => {
      onComplete(result);
    }, 1000);
  };

  const calculateADHDResults = (finalAnswers: Record<string, number>): OnboardingResult => {
    const categoryScores = {
      attention: 0,
      hyperactivity: 0,
      organization: 0,
      emotional: 0,
      social: 0
    };

    const categoryCounts = {
      attention: 0,
      hyperactivity: 0,
      organization: 0,
      emotional: 0,
      social: 0
    };

    // Calculate category averages
    Object.entries(finalAnswers).forEach(([questionId, score]) => {
      const question = adhdQuestions.find(q => q.id === questionId);
      if (question) {
        categoryScores[question.category] += score;
        categoryCounts[question.category]++;
      }
    });

    // Normalize scores to 0-100 scale
    Object.keys(categoryScores).forEach(key => {
      const category = key as keyof typeof categoryScores;
      if (categoryCounts[category] > 0) {
        categoryScores[category] = (categoryScores[category] / categoryCounts[category]) * 20; // Scale 1-5 to 0-100
      }
    });

    const overallScore = Object.values(categoryScores).reduce((sum, score) => sum + score, 0) / 5;

    // Determine ADHD type
    let adhdType: OnboardingResult['adhd_type'] = 'mild_traits';
    if (overallScore >= 70) {
      if (categoryScores.attention > categoryScores.hyperactivity + 10) {
        adhdType = 'primarily_inattentive';
      } else if (categoryScores.hyperactivity > categoryScores.attention + 10) {
        adhdType = 'primarily_hyperactive';
      } else {
        adhdType = 'combined';
      }
    }

    // Generate recommendations
    const recommendations = generateRecommendations(categoryScores, adhdType);

    return {
      overall_score: Math.round(overallScore),
      categories: {
        attention: Math.round(categoryScores.attention),
        hyperactivity: Math.round(categoryScores.hyperactivity),
        organization: Math.round(categoryScores.organization),
        emotional: Math.round(categoryScores.emotional),
        social: Math.round(categoryScores.social),
      },
      recommendations,
      adhd_type: adhdType
    };
  };

  const generateRecommendations = (scores: any, type: string): string[] => {
    const recommendations = [];

    if (scores.attention >= 60) {
      recommendations.push("🎯 Try the Pomodoro technique for better focus");
      recommendations.push("📱 Use our Focus Mode features during work sessions");
    }

    if (scores.hyperactivity >= 60) {
      recommendations.push("⚡ Take regular movement breaks during tasks");
      recommendations.push("🚶‍♂️ Try fidget tools or standing desk options");
    }

    if (scores.organization >= 60) {
      recommendations.push("📋 Use our task management system daily");
      recommendations.push("⏰ Set multiple reminders for important deadlines");
    }

    if (scores.emotional >= 60) {
      recommendations.push("💚 Practice emotional regulation techniques");
      recommendations.push("🛡️ Connect with our supportive community");
    }

    if (scores.social >= 60) {
      recommendations.push("👥 Join community discussions about ADHD experiences");
      recommendations.push("🌈 Celebrate your neurodivergent strengths");
    }

    // Add general recommendations
    recommendations.push("🏆 Use our achievement system to build positive habits");
    recommendations.push("🔥 Track your progress with daily streaks");

    return recommendations;
  };

  const getScaleOption = (value: number): { text: string; color: string } => {
    const options = [
      { text: "Never", color: "#00C851" },
      { text: "Rarely", color: "#4CAF50" },
      { text: "Sometimes", color: "#FF9800" },
      { text: "Often", color: "#FF5722" },
      { text: "Very Often", color: "#F44336" }
    ];
    return options[value - 1] || options[0];
  };

  const getYesNoOption = (value: number): { text: string; color: string } => {
    return value === 1 
      ? { text: "Yes", color: "#4A90E2" }
      : { text: "No", color: "#666" };
  };

  if (isCompleting) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.completingContainer}>
          <Animated.View style={styles.completingContent}>
            <Text style={styles.completingIcon}>🧠✨</Text>
            <Text style={styles.completingTitle}>Analyzing Your Results</Text>
            <Text style={styles.completingSubtitle}>
              Creating your personalized ADHD profile...
            </Text>
            <View style={styles.loadingIndicator}>
              <Animated.View style={styles.loadingDot} />
              <Animated.View style={styles.loadingDot} />
              <Animated.View style={styles.loadingDot} />
            </View>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>ADHD Assessment</Text>
          <Text style={styles.headerSubtitle}>
            {currentQuestionIndex + 1} of {adhdQuestions.length}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Animated.View 
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp'
              })
            }
          ]}
        />
      </View>

      {/* Question */}
      <ScrollView style={styles.questionContainer} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.questionContent,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.questionIcon}>{currentQuestion.icon}</Text>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
          {currentQuestion.description && (
            <Text style={styles.questionDescription}>{currentQuestion.description}</Text>
          )}

          {/* Answer Options */}
          <View style={styles.answerContainer}>
            {currentQuestion.type === 'scale' && (
              <View style={styles.scaleContainer}>
                <Text style={styles.scaleLabel}>How often does this apply to you?</Text>
                {[1, 2, 3, 4, 5].map((value) => {
                  const option = getScaleOption(value);
                  return (
                    <Animated.View
                      key={value}
                      style={[
                        styles.answerButton,
                        { backgroundColor: `${option.color}20`, borderColor: option.color },
                        { transform: [{ scale: scaleAnim }] }
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => handleAnswer(value)}
                        style={styles.answerTouchable}
                      >
                        <Text style={[styles.answerText, { color: option.color }]}>
                          {option.text}
                        </Text>
                        <View style={styles.answerValue}>
                          <Text style={[styles.answerValueText, { color: option.color }]}>
                            {value}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            )}

            {currentQuestion.type === 'yes_no' && (
              <View style={styles.yesNoContainer}>
                {[1, 0].map((value) => {
                  const option = getYesNoOption(value);
                  return (
                    <Animated.View
                      key={value}
                      style={[
                        styles.answerButton,
                        styles.yesNoButton,
                        { backgroundColor: `${option.color}20`, borderColor: option.color },
                        { transform: [{ scale: scaleAnim }] }
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => handleAnswer(value)}
                        style={styles.answerTouchable}
                      >
                        <Text style={[styles.answerText, { color: option.color }]}>
                          {option.text}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Encouragement */}
          <Text style={styles.encouragement}>
            {currentQuestionIndex < 3 && "Remember, there are no wrong answers! 💙"}
            {currentQuestionIndex >= 3 && currentQuestionIndex < 8 && "You're doing great! Keep going! 🌟"}
            {currentQuestionIndex >= 8 && !isLastQuestion && "Almost there! Your insights matter! 🚀"}
            {isLastQuestion && "Last question! You've got this! 🎉"}
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Transparent to show parent gradient
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    color: '#888',
    fontSize: 16,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  progressContainer: {
    height: 6,
    backgroundColor: '#333',
    marginHorizontal: 20,
    borderRadius: 3,
    marginBottom: 20,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 3,
  },
  questionContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  questionContent: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  questionIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  questionText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 12,
  },
  questionDescription: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  answerContainer: {
    width: '100%',
    marginBottom: 24,
  },
  scaleContainer: {
    width: '100%',
  },
  scaleLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  yesNoContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  answerButton: {
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  yesNoButton: {
    flex: 1,
  },
  answerTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  answerText: {
    fontSize: 18,
    fontWeight: '600',
  },
  answerValue: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerValueText: {
    fontSize: 16,
    fontWeight: '700',
  },
  encouragement: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  completingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completingContent: {
    alignItems: 'center',
  },
  completingIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  completingTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  completingSubtitle: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  loadingIndicator: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4A90E2',
  },
});