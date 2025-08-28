import React from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { PaperProvider, MD3LightTheme } from "react-native-paper";
import { RuntimeConfigProvider } from "../src/context/RuntimeConfigContext";
import { AuthProvider } from "../src/context/AuthContext";
import { TasksProvider } from "../src/context/TasksContext";
import { FriendsProvider } from "../src/context/FriendsContext";
import { ChatProvider } from "../src/context/ChatContext";

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

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme as any}>
          <RuntimeConfigProvider>
            <AuthProvider>
              <TasksProvider>
                <FriendsProvider>
                  <ChatProvider>
                    <StatusBar style="light" />
                    <Stack screenOptions={{ headerShown: false }} />
                  </ChatProvider>
                </FriendsProvider>
              </TasksProvider>
            </AuthProvider>
          </RuntimeConfigProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}