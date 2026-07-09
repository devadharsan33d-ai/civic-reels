import React from "react";
import { Pressable, Text, StyleSheet, StyleProp, ViewStyle, ActivityIndicator, View, PressableProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { BRAND_GRADIENT, RADIUS, COLORS } from "@/src/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
  testID?: string;
  fullWidth?: boolean;
};

export default function GradientButton({
  label, onPress, loading, disabled, icon,
  variant = "primary", size = "md", style, testID, fullWidth = true,
}: Props) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn = () => { scale.value = withSpring(0.96, { damping: 15 }); };
  const onPressOut = () => { scale.value = withSpring(1, { damping: 12 }); };
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.();
  };

  const height = size === "lg" ? 56 : size === "sm" ? 42 : 50;
  const fontSize = size === "lg" ? 16 : size === "sm" ? 14 : 15;

  const inner = (
    <View style={[styles.inner, { paddingHorizontal: 22 }]}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { fontSize }]}>{label}</Text>
        </>
      )}
    </View>
  );

  if (variant === "primary") {
    return (
      <AnimatedPressable
        testID={testID}
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        style={[
          styles.btn,
          { height, width: fullWidth ? undefined : "auto", alignSelf: fullWidth ? "stretch" : "flex-start" },
          disabled && { opacity: 0.5 },
          animStyle,
          style,
        ]}
      >
        <LinearGradient
          colors={BRAND_GRADIENT as unknown as string[]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {inner}
      </AnimatedPressable>
    );
  }

  if (variant === "secondary") {
    return (
      <AnimatedPressable
        testID={testID}
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        style={[
          styles.btn,
          styles.secondary,
          { height, width: fullWidth ? undefined : "auto", alignSelf: fullWidth ? "stretch" : "flex-start" },
          disabled && { opacity: 0.5 },
          animStyle,
          style,
        ]}
      >
        {inner}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      testID={testID}
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled || loading}
      style={[
        styles.btn,
        { height, backgroundColor: "transparent", width: fullWidth ? undefined : "auto", alignSelf: fullWidth ? "stretch" : "flex-start" },
        disabled && { opacity: 0.5 },
        animStyle,
        style,
      ]}
    >
      {inner}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: RADIUS.pill,
    overflow: "hidden",
    justifyContent: "center",
  },
  secondary: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: "100%",
  },
  label: {
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
