import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useSubscription } from '../context/SubscriptionContext';
import { adMobService } from '../services/AdMobService';

interface AdBannerProps {
  size?: BannerAdSize;
  style?: any;
}

export function AdBanner({ 
  size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER, 
  style 
}: AdBannerProps) {
  const { subscription } = useSubscription();

  // Don't show ads for premium users
  if (!adMobService.shouldShowAds(subscription.tier === 'premium')) {
    return null;
  }

  const adUnitId = adMobService.getBannerAdUnitId();

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={adUnitId}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log('✅ Banner ad loaded successfully');
          adMobService.logAdEvent('banner_loaded');
        }}
        onAdFailedToLoad={(error) => {
          console.warn('⚠️ Banner ad failed to load:', error);
          adMobService.logAdEvent('banner_failed', { error: error.message });
        }}
        onAdOpened={() => {
          console.log('📱 Banner ad opened');
          adMobService.logAdEvent('banner_clicked');
        }}
        onAdClosed={() => {
          console.log('📱 Banner ad closed');
          adMobService.logAdEvent('banner_closed');
        }}
      />
    </View>
  );
}

export default AdBanner;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 4,
  },
});