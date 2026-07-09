import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { COLORS } from "@/src/utils/api";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (!user.onboarded) {
      router.replace("/onboarding");
    } else {
      router.replace("/(tabs)");
    }
  }, [user, loading, router]);

  return (
    <View style={styles.center} testID="splash-screen">
      <ActivityIndicator color={COLORS.brandSecondary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
});
