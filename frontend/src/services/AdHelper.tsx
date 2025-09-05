import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

class AdHelper {
  static getBannerAdUnitId() {
    if (__DEV__) {
      // Development - use test IDs
      return Platform.OS === 'ios' ? TestIds.BANNER : TestIds.BANNER;
    }
    // Production - replace with real ad unit IDs when ready
    return Platform.OS === 'ios' 
      ? 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyyyyyy'  // Will be replaced later
      : 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyyyyyy'; // Will be replaced later
  }

  static getInterstitialAdUnitId() {
    if (__DEV__) {
      // Development - use test IDs
      return Platform.OS === 'ios' ? TestIds.INTERSTITIAL : TestIds.INTERSTITIAL;
    }
    // Production - replace with real ad unit IDs when ready
    return Platform.OS === 'ios'
      ? 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyyyyyy'  // Will be replaced later
      : 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyyyyyy'; // Will be replaced later
  }

  static getRewardedAdUnitId() {
    if (__DEV__) {
      // Development - use test IDs
      return Platform.OS === 'ios' ? TestIds.REWARDED : TestIds.REWARDED;
    }
    // Production - replace with real ad unit IDs when ready
    return Platform.OS === 'ios'
      ? 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyyyyyy'  // Will be replaced later
      : 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyyyyyy'; // Will be replaced later
  }

  static logAdEvent(eventType: string, adType: string, details?: any) {
    if (__DEV__) {
      console.log(`🔧 AdMob ${eventType}: ${adType}`, details || '');
    }
  }
}

export default AdHelper;