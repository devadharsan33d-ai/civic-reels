import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, Modal, Pressable, FlatList,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { api } from "@/src/utils/api";
import { BRAND_GRADIENT, COLORS, RADIUS, TYPE } from "@/src/theme";
import Skeleton from "@/src/components/Skeleton";

type UserRow = {
  user_id: string;
  name: string;
  username?: string | null;
  picture?: string | null;
  slogan?: string | null;
};

export default function FollowersModal({
  userId, mode, onClose,
}: { userId: string; mode: "followers" | "following"; onClose: () => void }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const list = await api<UserRow[]>(`/users/${userId}/${mode}`);
        setUsers(list);
      } catch {}
      setLoading(false);
    })();
  }, [userId, mode]);

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} testID={`${mode}-modal`}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>{mode === "followers" ? "who follows you" : "who you follow"}</Text>
              <Text style={styles.title}>
                {loading ? "…" : users.length} {mode === "followers" ? "Followers" : "Following"}
              </Text>
            </View>
            <Pressable onPress={onClose} testID={`${mode}-close`} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.onBg} />
            </Pressable>
          </View>

          {loading ? (
            <View style={{ padding: 20, gap: 14 }}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                  <Skeleton width={44} height={44} radius={22} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width="50%" height={14} />
                    <Skeleton width="30%" height={12} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(u) => u.user_id}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <View style={styles.emptyIcon}>
                    <Ionicons
                      name={mode === "followers" ? "people-outline" : "person-add-outline"}
                      size={22}
                      color={COLORS.onBgMuted}
                    />
                  </View>
                  <Text style={styles.emptyText}>
                    {mode === "followers"
                      ? "No followers yet — post more to attract your neighbours."
                      : "You aren't following anyone yet."}
                  </Text>
                </View>
              }
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInDown.duration(240).delay(index * 25)}>
                  <Pressable
                    style={styles.row}
                    onPress={() => {
                      onClose();
                      router.push(`/user/${item.user_id}`);
                    }}
                    testID={`${mode}-row-${item.user_id}`}
                  >
                    {item.picture ? (
                      <Image source={{ uri: item.picture }} style={styles.avatar} />
                    ) : (
                      <LinearGradient
                        colors={BRAND_GRADIENT as unknown as string[]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.avatar}
                      >
                        <Text style={styles.avatarInit}>{item.name?.[0]?.toUpperCase() || "?"}</Text>
                      </LinearGradient>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{item.name}</Text>
                      <Text style={styles.handle}>@{item.username || item.name}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.onBgDim} />
                  </Pressable>
                </Animated.View>
              )}
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, height: "72%",
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1, borderColor: COLORS.borderStrong,
  },
  handle: { alignSelf: "center", width: 44, height: 4, borderRadius: 2, backgroundColor: COLORS.borderStrong, marginTop: 10 },
  header: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { ...TYPE.label, color: COLORS.brand2 },
  title: { ...TYPE.h3, color: COLORS.onBg, fontSize: 18, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.surface2, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: COLORS.border,
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, paddingHorizontal: 12, marginBottom: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarInit: { color: "#fff", fontSize: 16, fontWeight: "800" },
  name: { color: COLORS.onBg, fontSize: 15, fontWeight: "700" },
  handle: { color: COLORS.brand2, fontSize: 13, fontWeight: "600", marginTop: 2 },
  emptyBox: { alignItems: "center", padding: 40, gap: 10 },
  emptyIcon: {
    width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
  },
  emptyText: { color: COLORS.onBgMuted, textAlign: "center", fontSize: 14, fontWeight: "500", maxWidth: 260 },
});
