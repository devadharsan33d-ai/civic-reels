import React from "react";
import { Pressable, Text, StyleSheet, View, StyleProp, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { categoryGradient, categoryIcon, COLORS, RADIUS } from "@/src/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  categoryKey: string;
  label: string;
  active?: boolean;
  onPress?: () => void;
  size?: "sm" | "md";
  showIcon?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export default function CategoryChip({
  categoryKey, label, active, onPress, size = "md", showIcon = true, testID, style,
}: Props) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const [c1, c2] = categoryGradient(categoryKey);
  const height = size === "sm" ? 32 : 38;
  const px = size === "sm" ? 12 : 16;

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.94, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12 }); }}
      style={[
        styles.chip,
        { height, paddingHorizontal: px, borderRadius: RADIUS.pill },
        !active && styles.inactive,
        animStyle,
        style,
      ]}
    >
      {active ? (
        <LinearGradient
          colors={[c1, c2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.pill }]}
        />
      ) : null}
      <View style={styles.row}>
        {showIcon ? (
          <Ionicons
            name={categoryIcon(categoryKey) as any}
            size={size === "sm" ? 12 : 14}
            color={active ? "#fff" : COLORS.onBgMuted}
          />
        ) : null}
        <Text
          style={[
            styles.label,
            { fontSize: size === "sm" ? 12 : 13, color: active ? "#fff" : COLORS.onBg },
          ]}
        >
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  inactive: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontWeight: "700", letterSpacing: 0.2 },
});
