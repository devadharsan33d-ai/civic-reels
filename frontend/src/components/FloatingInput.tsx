import React, { useRef, useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps, StyleProp, ViewStyle, Animated, Pressable } from "react-native";
import { COLORS, RADIUS } from "@/src/theme";

type Props = TextInputProps & {
  label: string;
  prefix?: string;
  containerStyle?: StyleProp<ViewStyle>;
  errorText?: string | null;
  multiline?: boolean;
  onRightPress?: () => void;
  rightIcon?: React.ReactNode;
};

/**
 * Material-3 floating label input.
 * Bug-safe implementation: we DO NOT animate layout (top/fontSize) because
 * that causes a re-flow inside ScrollView + KeyboardAvoidingView, which makes
 * fields jump between positions when focused on mobile. Instead we render two
 * absolutely-positioned labels (rest + floating) and cross-fade between them
 * using opacity (native driver) — zero layout impact.
 */
export default function FloatingInput({
  label, value, prefix, containerStyle, errorText, multiline, style,
  onFocus, onBlur, rightIcon, onRightPress, testID, ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || Boolean(value);
  const opacity = useRef(new Animated.Value(isFloating ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: isFloating ? 1 : 0,
      duration: 140,
      useNativeDriver: true,
    }).start();
  }, [isFloating, opacity]);

  const restOpacity = opacity.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const floatOpacity = opacity;

  const labelLeft = prefix ? 30 : 16;
  const focusedColor = focused ? COLORS.brand2 : COLORS.onBgMuted;

  return (
    <View style={containerStyle}>
      <View
        style={[
          styles.wrap,
          multiline && styles.wrapMultiline,
          focused && styles.wrapFocused,
          errorText ? { borderColor: COLORS.error } : null,
        ]}
      >
        {/* Rest state label — sits where the input value would appear */}
        <Animated.Text
          pointerEvents="none"
          style={[
            styles.labelRest,
            { left: labelLeft, opacity: restOpacity, color: COLORS.onBgDim },
            multiline && { top: 22 },
          ]}
        >
          {label}
        </Animated.Text>
        {/* Floating state label — sits at the top */}
        <Animated.Text
          pointerEvents="none"
          style={[
            styles.labelFloat,
            { left: labelLeft, opacity: floatOpacity, color: focusedColor },
          ]}
        >
          {label}
        </Animated.Text>

        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}

        <TextInput
          {...rest}
          testID={testID}
          value={value}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          placeholderTextColor="transparent"
          multiline={multiline}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            style,
          ]}
        />

        {rightIcon ? (
          <Pressable onPress={onRightPress} hitSlop={12} style={styles.right}>
            {rightIcon}
          </Pressable>
        ) : null}
      </View>
      {errorText ? <Text style={styles.err}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 60,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  wrapMultiline: {
    height: 96,
    alignItems: "flex-start",
    paddingTop: 24,
  },
  wrapFocused: {
    borderColor: COLORS.brand2,
  },
  labelRest: {
    position: "absolute",
    top: 18,
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  labelFloat: {
    position: "absolute",
    top: 8,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  prefix: { color: COLORS.onBgMuted, fontSize: 16, marginRight: 4 },
  input: {
    flex: 1,
    color: COLORS.onBg,
    fontSize: 16,
    fontWeight: "500",
    padding: 0,
    letterSpacing: 0.1,
    // Fixed height keeps layout stable so animated labels don't cause reflow.
    height: 30,
  },
  inputMultiline: {
    height: 60,
    textAlignVertical: "top",
    paddingTop: 4,
  },
  right: { marginLeft: 8 },
  err: { color: COLORS.error, fontSize: 12, marginTop: 6, marginLeft: 4, fontWeight: "600" },
});
