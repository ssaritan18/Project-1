import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../context/SubscriptionContext';

interface MockAdBannerProps {
  style?: any;
}

export function MockAdBanner({ style }: MockAdBannerProps) {
  const { subscription } = useSubscription();

  // Don't show ads for premium users
  if (subscription.tier === 'premium') {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={['#6B7280', '#9CA3AF']}
        style={styles.mockAd}
      >
        <Text style={styles.adText}>📱 Advertisement</Text>
        <Text style={styles.adSubtext}>Upgrade to Premium for ad-free experience!</Text>
      </LinearGradient>
    </View>
  );
}

export default MockAdBanner;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 4,
  },
  mockAd: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '90%',
  },
  adText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  adSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});