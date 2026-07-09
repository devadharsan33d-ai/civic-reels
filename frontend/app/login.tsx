import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/components/Toast";
import { BRAND_GRADIENT, COLORS, RADIUS, TYPE } from "@/src/theme";
import Logo from "@/src/components/Logo";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const { handleSessionId } = useAuth();
  const { show } = useToast();
  const router = useRouter();

  const onGoogleLogin = async () => {
    setLoading(true);
    Haptics.selectionAsync().catch(() => {});
    try {
      let redirectUrl: string;
      if (Platform.OS === "web") {
        redirectUrl = window.location.origin + "/";
      } else {
        redirectUrl = Linking.createURL("auth");
      }
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === "web") {
        window.location.href = authUrl;
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      if (result.type === "success" && result.url) {
        const m = result.url.match(/session_id=([^&]+)/);
        if (m) {
          const user = await handleSessionId(decodeURIComponent(m[1]));
          if (user && !user.onboarded) router.replace("/onboarding");
          else router.replace("/(tabs)");
          return;
        }
      }
      setLoading(false);
    } catch (e: any) {
      show(e?.message || "Login failed", "error");
      setLoading(false);
    }
  };

  return (
    <View style={styles.container} testID="login-screen">
      {/* Dramatic ambient background */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={["#1E1B4B", "#0A0A0A", "#0A0A0A"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.orb1} />
        <View style={styles.orb2} />
        <View style={styles.orb3} />
      </View>

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.top}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.brandRow}>
            <View style={styles.brandDot} />
            <Text style={styles.brandKicker}>welcome to</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(80)}>
            <Logo size={56} />
          </Animated.View>

          <Animated.Text entering={FadeInDown.duration(600).delay(160)} style={styles.subtitle}>
            Turn broken streets, dirty parks, and dead street-lamps into stories your community can rally around.
          </Animated.Text>

          <Animated.View entering={FadeInDown.duration(600).delay(240)} style={styles.pillsRow}>
            <FeaturePill icon="film-outline" label="Reels feed" />
            <FeaturePill icon="location-outline" label="Local" />
            <FeaturePill icon="megaphone-outline" label="Loud" />
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.duration(600).delay(360)} style={styles.bottom}>
          <Pressable
            testID="google-login-button"
            onPress={onGoogleLogin}
            disabled={loading}
            style={({ pressed }) => [styles.ctaWrap, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <LinearGradient
              colors={BRAND_GRADIENT as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cta}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <View style={styles.gLogo}>
                    <Ionicons name="logo-google" size={16} color="#0A0A0A" />
                  </View>
                  <Text style={styles.ctaText}>Continue with Google</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Text style={styles.finePrint}>
            By continuing, you agree to our{"  "}
            <Text style={styles.link}>Terms</Text>{"  "}·{"  "}
            <Text style={styles.link}>Privacy</Text>
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function FeaturePill({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.featurePill}>
      <Ionicons name={icon} size={13} color={COLORS.onBg} />
      <Text style={styles.featurePillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1, paddingHorizontal: 24, justifyContent: "space-between", paddingTop: 12, paddingBottom: 16 },
  orb1: { position: "absolute", width: 340, height: 340, borderRadius: 340, top: -80, right: -120, backgroundColor: "rgba(217,70,239,0.35)", opacity: 0.55 },
  orb2: { position: "absolute", width: 260, height: 260, borderRadius: 260, top: 120, left: -140, backgroundColor: "rgba(124,58,237,0.45)", opacity: 0.55 },
  orb3: { position: "absolute", width: 300, height: 300, borderRadius: 300, bottom: -80, right: -100, backgroundColor: "rgba(249,115,22,0.25)", opacity: 0.55 },
  top: { flex: 1, justifyContent: "center", gap: 20 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.brand2, shadowColor: COLORS.brand2, shadowRadius: 8, shadowOpacity: 0.9 },
  brandKicker: { ...TYPE.label, color: COLORS.onBgMuted },
  subtitle: {
    color: COLORS.onBgMuted, fontSize: 17, lineHeight: 26,
    fontWeight: "500", maxWidth: 380, marginTop: 4,
  },
  pillsRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  featurePill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.pill,
  },
  featurePillText: { color: COLORS.onBg, fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  bottom: { gap: 14 },
  ctaWrap: { borderRadius: RADIUS.pill, overflow: "hidden", shadowColor: "#7C3AED", shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  cta: { height: 60, borderRadius: RADIUS.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 20 },
  gLogo: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: 0.2 },
  finePrint: { color: COLORS.onBgDim, fontSize: 12, textAlign: "center", fontWeight: "500" },
  link: { color: COLORS.onBgMuted, fontWeight: "700" },
});
