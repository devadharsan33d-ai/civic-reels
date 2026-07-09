import { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { api, COLORS } from "@/src/utils/api";

export default function OnboardingScreen() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [slogan, setSlogan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api("/users/profile", {
        method: "PUT",
        body: { name, username, country, state, slogan },
      });
      await refresh();
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="onboarding-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Complete your profile</Text>
          <Text style={styles.subtitle}>Tell your community who you are.</Text>

          <Field label="Full name" value={name} onChange={setName} placeholder="Jane Doe" testID="onb-name" />
          <Field
            label="Username"
            value={username}
            onChange={(v) => setUsername(v.toLowerCase().replace(/\s+/g, "_"))}
            placeholder="jane_doe"
            testID="onb-username"
            prefix="@"
          />
          <Field label="Country" value={country} onChange={setCountry} placeholder="India" testID="onb-country" />
          <Field label="State" value={state} onChange={setState} placeholder="Karnataka" testID="onb-state" />
          <Field
            label="Slogan"
            value={slogan}
            onChange={setSlogan}
            placeholder="Change begins with a voice."
            testID="onb-slogan"
            multiline
          />

          {error && <Text style={styles.error} testID="onb-error">{error}</Text>}

          <Pressable
            testID="onb-submit"
            onPress={submit}
            disabled={saving}
            style={({ pressed }) => [styles.submit, pressed && { opacity: 0.85 }, saving && { opacity: 0.6 }]}
          >
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.submitText}>Enter CivicReel</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label, value, onChange, placeholder, testID, multiline, prefix,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; testID?: string; multiline?: boolean; prefix?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, multiline && { minHeight: 88, alignItems: "flex-start" }]}>
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#666"
          style={[styles.input, multiline && { height: 88, textAlignVertical: "top" }]}
          multiline={multiline}
          autoCapitalize={prefix ? "none" : "sentences"}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: 24, gap: 14, paddingBottom: 40 },
  title: { color: COLORS.onSurface, fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: COLORS.onSurface3, fontSize: 14, marginBottom: 12 },
  field: { gap: 8 },
  label: { color: COLORS.onSurface2, fontSize: 13, fontWeight: "600" },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.surface2, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14,
    minHeight: 52,
  },
  prefix: { color: COLORS.onSurface3, fontSize: 16, marginRight: 4 },
  input: { flex: 1, color: COLORS.onSurface, fontSize: 16, paddingVertical: 12 },
  submit: {
    marginTop: 12, height: 54, borderRadius: 999, backgroundColor: COLORS.brandPrimary,
    alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  error: { color: COLORS.error, fontSize: 13 },
});
