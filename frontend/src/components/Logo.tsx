import { View, Text, StyleSheet, StyleProp, TextStyle, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { BRAND_GRADIENT, TYPE } from "@/src/theme";

type Props = {
  size?: number;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

/**
 * "Civic Reels" text logo — gradient-clipped via MaskedView.
 */
export default function Logo({ size = 36, compact = false, style, textStyle }: Props) {
  const label = compact ? "CR" : "Civic Reels";

  return (
    <View style={style}>
      <MaskedView
        maskElement={
          <View style={{ backgroundColor: "transparent" }}>
            <Text style={[styles.text, { fontSize: size }, textStyle]}>{label}</Text>
          </View>
        }
      >
        <LinearGradient
          colors={BRAND_GRADIENT as unknown as string[]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={[styles.text, { fontSize: size, opacity: 0 }, textStyle]}>{label}</Text>
        </LinearGradient>
      </MaskedView>
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    ...TYPE.display,
    color: "#fff",
    fontSize: 36,
  },
});
