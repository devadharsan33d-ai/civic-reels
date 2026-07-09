import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/context/AuthContext";
import { COLORS } from "@/src/utils/api";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { handleSessionId } = useAuth();
  const router = useRouter();

  const onGoogleLogin = async () => {
    setError(null);
    setLoading(true);
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
      setError(e?.message || "Login failed");
      setLoading(false);
    }
  };

  return (
    <View style={styles.container} testID="login-screen">
      <LinearGradient
        colors={["#022C22", "#050505", "#050505"]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <View style={styles.top}>
          <View style={styles.logoBadge}>
            <Ionicons name="megaphone" size={40} color={COLORS.brandSecondary} />
          </View>
          <Text style={styles.title}>CivicReel</Text>
          <Text style={styles.subtitle}>
            Report civic problems.{"\n"}Get your community to care.
          </Text>
        </View>

        <View style={styles.bottom}>
          <Pressable
            testID="google-login-button"
            onPress={onGoogleLogin}
            disabled={loading}
            style={({ pressed }) => [
              styles.googleBtn,
              pressed && { opacity: 0.85 },
              loading && { opacity: 0.6 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.onSurface} />
            ) : (
              <>
                <Ionicons name="logo-google" size={22} color={COLORS.onSurface} />
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </Pressable>
          {error && <Text style={styles.error} testID="login-error">{error}</Text>}
          <Text style={styles.finePrint}>
            By continuing you agree to our Terms and Privacy Policy.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  safe: { flex: 1, paddingHorizontal: 24, paddingVertical: 24, justifyContent: "space-between" },
  top: { flex: 1, justifyContent: "center", alignItems: "flex-start" },
  logoBadge: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: "rgba(52, 211, 153, 0.12)",
    borderWidth: 1, borderColor: "rgba(52, 211, 153, 0.35)",
    alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  title: { color: COLORS.onSurface, fontSize: 44, fontWeight: "800", letterSpacing: -1 },
  subtitle: { color: COLORS.onSurface3, fontSize: 18, marginTop: 12, lineHeight: 26 },
  bottom: { gap: 12 },
  googleBtn: {
    height: 56, borderRadius: 999, backgroundColor: COLORS.surface3,
    borderWidth: 1, borderColor: COLORS.borderStrong,
    alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 12,
  },
  googleText: { color: COLORS.onSurface, fontSize: 16, fontWeight: "600" },
  finePrint: { color: COLORS.onSurface3, fontSize: 12, textAlign: "center", marginTop: 4 },
  error: { color: COLORS.error, fontSize: 13, textAlign: "center" },
});
