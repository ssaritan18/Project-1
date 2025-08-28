import React from "react";
import { Dimensions, StyleSheet } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

const { width, height } = Dimensions.get("window");
const COLORS = ["#A3C9FF", "#FFCFE1", "#B8F1D9", "#FFE3A3", "#FFB3BA"];

function Piece({ idx }: { idx: number }) {
  const x = (idx / 16) * width;
  const fall = useSharedValue(-20);
  const rot = useSharedValue(0);

  React.useEffect(() => {
    fall.value = withDelay(
      idx * 30,
      withTiming(height + 40, { duration: 1200, easing: Easing.in(Easing.quad) })
    );
    rot.value = withTiming(360, { duration: 1200 });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x - 8 + Math.sin((rot.value * Math.PI) / 180) * 20 },
      { translateY: fall.value },
      { rotate: `${rot.value}deg` },
    ],
  }));

  return <Animated.View style={[styles.piece, style, { backgroundColor: COLORS[idx % COLORS.length] }]} />;
}

export function Confetti({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <Animated.View pointerEvents="none" style={styles.wrap}>
      {new Array(24).fill(0).map((_, i) => (
        <Piece key={i} idx={i} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  piece: { position: "absolute", width: 10, height: 14, borderRadius: 3 },
});