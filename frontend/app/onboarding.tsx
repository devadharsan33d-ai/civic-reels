import { useState } from "react";
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/components/Toast";
import { api } from "@/src/utils/api";
import { COLORS, RADIUS, TYPE } from "@/src/theme";
import FloatingInput from "@/src/components/FloatingInput";
import GradientButton from "@/src/components/GradientButton";

export default function OnboardingScreen() {
  const { user, refresh, logout } = useAuth();
  const router = useRouter();
  const { show } = useToast();
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [slogan, setSlogan] = useState("");
  const [saving, setSaving] = useState(false);
  const [usernameErr, setUsernameErr] = useState<string | null>(null);

  const submit = async () => {
    if (!username.trim()) {
      setUsernameErr("Please pick a username");
      return;
    }
    setUsernameErr(null);
    setSaving(true);
    try {
      await api("/users/profile", {
        method: "PUT",
        body: { name, username, country, state, slogan },
      });
      await refresh();
      show("Welcome to Civic Reels!", "success");
      router.replace("/(tabs)");
    } catch (e: any) {
      const msg = e?.message || "Failed to save";
      if (/username/i.test(msg)) setUsernameErr(msg);
      else show(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container} testID="onboarding-screen">
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={["#1E1B4B", "#0A0A0A"]} style={StyleSheet.absoluteFill} />
        <View style={styles.orb} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={logout} hitSlop={12} testID="onb-back">
            <Ionicons name="arrow-back" size={22} color={COLORS.onBg} />
          </Pressable>
          <Text style={styles.stepLabel}>Step 1 of 1</Text>
          <View style={{ width: 22 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.duration(500)}>
              <Text style={styles.eyebrow}>your identity</Text>
              <Text style={styles.title}>Set up your{"\n"}civic profile</Text>
              <Text style={styles.subtitle}>
                A voice needs a name. Pick a handle your neighbours will remember.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.fields}>
              <FloatingInput
                label="Full name"
                value={name}
                onChangeText={setName}
                testID="onb-name"
              />
              <FloatingInput
                label="Username"
                prefix="@"
                autoCapitalize="none"
                value={username}
                onChangeText={(v) => setUsername(v.toLowerCase().replace(/\s+/g, "_"))}
                errorText={usernameErr}
                testID="onb-username"
              />
              <View style={styles.row2}>
                <FloatingInput
                  label="Country"
                  value={country}
                  onChangeText={setCountry}
                  containerStyle={{ flex: 1 }}
                  testID="onb-country"
                />
                <FloatingInput
                  label="State"
                  value={state}
                  onChangeText={setState}
                  containerStyle={{ flex: 1 }}
                  testID="onb-state"
                />
              </View>
              <FloatingInput
                label="Slogan"
                multiline
                value={slogan}
                onChangeText={setSlogan}
                testID="onb-slogan"
              />
            </Animated.View>
          </ScrollView>

          <View style={styles.footer}>
            <GradientButton
              label={saving ? "Saving…" : "Enter Civic Reels"}
              onPress={submit}
              loading={saving}
              size="lg"
              testID="onb-submit"
              icon={<Ionicons name="arrow-forward" size={18} color="#fff" />}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  orb: {
    position: "absolute", top: 120, right: -100, width: 320, height: 320, borderRadius: 320,
    backgroundColor: "rgba(217,70,239,0.32)", opacity: 0.7,
  },
  header: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  stepLabel: { ...TYPE.label, color: COLORS.onBgMuted },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 24 },
  eyebrow: { ...TYPE.label, color: COLORS.brand2 },
  title: { ...TYPE.display, fontSize: 36, color: COLORS.onBg, marginTop: 6, lineHeight: 42 },
  subtitle: { color: COLORS.onBgMuted, fontSize: 15, lineHeight: 22, marginTop: 12, fontWeight: "500" },
  fields: { gap: 14 },
  row2: { flexDirection: "row", gap: 12 },
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
});
