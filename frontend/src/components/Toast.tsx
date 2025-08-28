import React from "react";
import { Text, StyleSheet } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

export function Toast({ visible, text }: { visible: boolean; text: string }) {
  const opacity = useSharedValue(0);
  React.useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 200, easing: Easing.out(Easing.ease) });
  }, [visible]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  if (!visible) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, style]}>
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 100, left: 24, right: 24, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: 12, alignItems: 'center' },
  text: { color: '#000', fontWeight: '800' },
});