import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export function Celebration({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      opacity.value = withTiming(1, { duration: 150 });
      scale.value = withSequence(
        withTiming(1.2, { duration: 280, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 180 })
      );
      const t = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 200 });
        onDone();
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const wrapStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!visible) return null;
  return (
    <Animated.View style={[styles.overlay, wrapStyle]} pointerEvents="none">
      <Animated.View style={[styles.card, cardStyle]}>
        <Ionicons name="trophy" size={48} color="#FFE3A3" />
        <Text style={styles.title}>Great job!</Text>
        <Text style={styles.meta}>Task completed</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  card: { width: width * 0.7, backgroundColor: '#111', borderRadius: 16, paddingVertical: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#222' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 8 },
  meta: { color: '#bdbdbd', marginTop: 4 },
});