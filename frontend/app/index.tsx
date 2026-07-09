import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { useAuth } from "@/src/context/AuthContext";
import { COLORS } from "@/src/theme";
import Logo from "@/src/components/Logo";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!user.onboarded) router.replace("/onboarding");
    else router.replace("/(tabs)");
  }, [user, loading, router]);

  return (
    <View style={styles.container} testID="splash-screen">
      <LinearGradient
        colors={["#1E1B4B", "#0A0A0A"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.orb} />
      <Animated.View entering={FadeIn.duration(400)} style={styles.center}>
        <Logo size={44} />
        <ActivityIndicator color={COLORS.brand2} size="small" style={{ marginTop: 20 }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center" },
  orb: { position: "absolute", width: 300, height: 300, borderRadius: 300, backgroundColor: "rgba(217,70,239,0.35)", opacity: 0.5 },
});
