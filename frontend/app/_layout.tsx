import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { PaperProvider, MD3LightTheme } from "react-native-paper";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { RuntimeConfigProvider } from "../src/context/RuntimeConfigContext";
import { TasksProvider } from "../src/context/TasksContext";
import { FriendsProvider } from "../src/context/FriendsProvider";
import { ChatProvider } from "../src/context/ChatContext";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { CommunityProvider } from "../src/context/CommunityContext";
import { MoodProvider } from "../src/context/MoodContext";
import { SubscriptionProvider } from "../src/context/SubscriptionContext";
import mobileAds from 'react-native-google-mobile-ads';
// import { adMobService } from "../src/services/AdMobService"; // Disabled for development

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#A3C9FF",
    secondary: "#FFCFE1",
    tertiary: "#B8F1D9",
    background: "#0c0c0c",
    surface: "#111111",
    onSurface: "#FFFFFF",
  },
};

// Wrapper to pass token to RuntimeConfigProvider
function AppWrapper() {
  const { token } = useAuth();
  
  return (
    <RuntimeConfigProvider token={token}>
      <TasksProvider>
        <FriendsProvider>
          <CommunityProvider>
            <MoodProvider>
              <SubscriptionProvider>
                <ErrorBoundary>
                  <ChatProvider>
                    <StatusBar style="light" />
                    <Stack screenOptions={{ headerShown: false }} />
                  </ChatProvider>
                </ErrorBoundary>
              </SubscriptionProvider>
            </MoodProvider>
          </CommunityProvider>
        </FriendsProvider>
      </TasksProvider>
    </RuntimeConfigProvider>
  );
}

export default function RootLayout() {
  // Initialize AdMob on app startup
  useEffect(() => {
    const initializeAdMob = async () => {
      try {
        console.log('🚀 Initializing AdMob SDK...');
        const adapterStatuses = await mobileAds().initialize();
        console.log('✅ AdMob initialized successfully:', adapterStatuses);

        // Configure request settings
        await mobileAds().setRequestConfiguration({
          maxAdContentRating: 'MA',
          testDeviceIdentifiers: __DEV__ ? [] : [],
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
        });

        console.log('🔧 Development mode: Using test ads for safe testing');
        console.log('🎯 Test ads will show safely without policy violations');
      } catch (error) {
        console.error('❌ Failed to initialize AdMob:', error);
      }
    };

    initializeAdMob();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme as any}>
          <AuthProvider>
            <AppWrapper />
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}