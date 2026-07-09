import React, { useRef, useState } from "react";
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
 * Material-3 style floating label input.
 * When empty & unfocused the label sits inside the field; on focus/value it lifts.
 */
export default function FloatingInput({
  label, value, prefix, containerStyle, errorText, multiline, style,
  onFocus, onBlur, rightIcon, onRightPress, testID, ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const isFloating = focused || Boolean(value);

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: isFloating ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [isFloating, anim]);

  const labelTop = anim.interpolate({ inputRange: [0, 1], outputRange: [multiline ? 20 : 18, 8] });
  const labelSize = anim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const labelColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.onBgDim, focused ? COLORS.brand2 : COLORS.onBgMuted],
  });

  return (
    <View style={containerStyle}>
      <View
        style={[
          styles.wrap,
          multiline && { minHeight: 96, alignItems: "flex-start", paddingTop: 22 },
          focused && styles.wrapFocused,
          errorText ? { borderColor: COLORS.error } : null,
        ]}
      >
        <Animated.Text
          style={[
            styles.label,
            { top: labelTop, fontSize: labelSize, color: labelColor, left: prefix ? 30 : 16 },
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
            multiline && { height: 70, textAlignVertical: "top", paddingTop: 4 },
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
    minHeight: 60,
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
  wrapFocused: {
    borderColor: COLORS.brand2,
    backgroundColor: COLORS.surface2,
    shadowColor: COLORS.brand2,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  label: {
    position: "absolute",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  prefix: { color: COLORS.onBgMuted, fontSize: 16, marginRight: 4 },
  input: {
    flex: 1,
    color: COLORS.onBg,
    fontSize: 16,
    fontWeight: "500",
    padding: 0,
    letterSpacing: 0.1,
  },
  right: { marginLeft: 8 },
  err: { color: COLORS.error, fontSize: 12, marginTop: 6, marginLeft: 4, fontWeight: "600" },
});
