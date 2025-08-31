import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ADHDOnboarding } from '../src/components/ADHDOnboarding';
import { OnboardingResults } from '../src/components/OnboardingResults';

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

export default function OnboardingScreen() {
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<OnboardingResult | null>(null);

  const handleOnboardingComplete = (result: OnboardingResult) => {
    console.log('🧠 ADHD Assessment Results:', result);
    setResults(result);
    setShowResults(true);
  };

  const handleSkip = () => {
    console.log('📋 Onboarding skipped');
    router.replace('/(tabs)/');
  };

  const handleContinue = () => {
    console.log('🚀 Continuing to main app');
    // Could save results to storage/backend here
    router.replace('/(tabs)/');
  };

  return (
    <View style={styles.container}>
      {showResults && results ? (
        <OnboardingResults 
          result={results}
          onContinue={handleContinue}
        />
      ) : (
        <ADHDOnboarding 
          onComplete={handleOnboardingComplete}
          onSkip={handleSkip}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
});