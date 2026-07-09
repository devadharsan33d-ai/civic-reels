import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Dimensions, ScrollView, TextInput,
  Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/utils/api";
import { useToast } from "@/src/components/Toast";
import { BRAND_GRADIENT, categoryGradient, COLORS, RADIUS, TYPE } from "@/src/theme";
import FloatingInput from "@/src/components/FloatingInput";
import GradientButton from "@/src/components/GradientButton";

const { width } = Dimensions.get("window");
const GRID = (width - 4) / 3;

type PostRow = { post_id: string; image_base64: string; category: string; like_count: number };

export default function ProfileScreen() {
  const { user, logout, refresh } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const list = await api<PostRow[]>(`/posts/user/${user.user_id}`);
      setPosts(list);
    } catch {}
  }, [user]);

  useFocusEffect(useCallback(() => { load(); refresh(); }, [load, refresh]));
  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  return (
    <View style={styles.container} testID="profile-screen">
      <FlatList
        data={posts}
        keyExtractor={(p) => p.post_id}
        numColumns={3}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        columnWrapperStyle={{ gap: 2 }}
        ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
        ListHeaderComponent={
          <ProfileHeader
            user={user}
            postCount={posts.length}
            onEdit={() => setEditing(true)}
            onLogout={logout}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Ionicons name="images-outline" size={28} color={COLORS.onBgMuted} />
            </View>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyBody}>Post your first civic report to see it show up here.</Text>
            <View style={{ marginTop: 12 }}>
              <GradientButton
                label="Add your first report"
                onPress={() => router.push("/(tabs)/create")}
                size="md"
                fullWidth={false}
                icon={<Ionicons name="add" size={18} color="#fff" />}
              />
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const [c1, c2] = categoryGradient(item.category);
          return (
            <Animated.View entering={FadeIn.duration(300).delay(index * 25)}>
              <View style={styles.tile} testID={`profile-tile-${item.post_id}`}>
                <Image
                  source={{
                    uri: item.image_base64.startsWith("data:") || item.image_base64.startsWith("http")
                      ? item.image_base64
                      : `data:image/jpeg;base64,${item.image_base64}`,
                  }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={[c1, c2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tilePill}
                />
                <Text style={styles.tilePillText}>{item.category}</Text>
                <View style={styles.tileLikes}>
                  <Ionicons name="heart" size={10} color="#fff" />
                  <Text style={styles.tileLikesText}>{item.like_count}</Text>
                </View>
              </View>
            </Animated.View>
          );
        }}
      />

      {editing && (
        <EditProfileModal
          user={user}
          onClose={() => setEditing(false)}
          onSaved={async () => { setEditing(false); await refresh(); await load(); }}
        />
      )}
    </View>
  );
}

function ProfileHeader({
  user, postCount, onEdit, onLogout,
}: { user: any; postCount: number; onEdit: () => void; onLogout: () => void }) {
  return (
    <View>
      <View style={styles.cover}>
        <LinearGradient
          colors={["#1E1B4B", "#7C3AED", "#D946EF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.orb1} />
        <View style={styles.orb2} />
      </View>

      <SafeAreaView edges={["top"]} style={styles.headerTop}>
        <View style={styles.headerBrand}>
          <Text style={styles.eyebrow}>profile</Text>
        </View>
        <Pressable onPress={onLogout} style={styles.headerIconBtn} testID="logout-btn" hitSlop={8}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.onBg} />
        </Pressable>
      </SafeAreaView>

      <Animated.View entering={FadeInDown.duration(500)} style={styles.avatarWrap}>
        <View style={styles.avatarRing}>
          <LinearGradient
            colors={BRAND_GRADIENT as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        {user.picture ? (
          <Image source={{ uri: user.picture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInit}>{user.name?.[0]?.toUpperCase() || "?"}</Text>
          </View>
        )}
      </Animated.View>

      <View style={styles.info}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.handle}>@{user.username || "username"}</Text>
        {(user.state || user.country) && (
          <View style={styles.locRow}>
            <Ionicons name="location" size={13} color={COLORS.onBgMuted} />
            <Text style={styles.loc}>
              {[user.state, user.country].filter(Boolean).join(", ")}
            </Text>
          </View>
        )}
        {user.slogan ? <Text style={styles.slogan}>&ldquo;{user.slogan}&rdquo;</Text> : null}

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{postCount}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>—</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>—</Text>
            <Text style={styles.statLabel}>Impact</Text>
          </View>
        </View>

        <Pressable style={styles.editBtn} onPress={onEdit} testID="edit-profile-btn">
          <Ionicons name="create-outline" size={16} color={COLORS.onBg} />
          <Text style={styles.editText}>Edit profile</Text>
        </Pressable>
      </View>

      <View style={styles.tabIndicator}>
        <View style={styles.tabItemActive}>
          <Ionicons name="grid" size={14} color={COLORS.onBg} />
          <Text style={styles.tabTextActive}>Reports</Text>
        </View>
      </View>
    </View>
  );
}

function EditProfileModal({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(user.name || "");
  const [username, setUsername] = useState(user.username || "");
  const [country, setCountry] = useState(user.country || "");
  const [state, setState] = useState(user.state || "");
  const [slogan, setSlogan] = useState(user.slogan || "");
  const [saving, setSaving] = useState(false);
  const [usernameErr, setUsernameErr] = useState<string | null>(null);
  const { show } = useToast();

  const save = async () => {
    setUsernameErr(null);
    setSaving(true);
    try {
      await api("/users/profile", {
        method: "PUT",
        body: { name, username, country, state, slogan },
      });
      show("Profile updated", "success");
      onSaved();
    } catch (e: any) {
      const msg = e?.message || "Failed to save";
      if (/username/i.test(msg)) setUsernameErr(msg);
      else show(msg, "error");
    }
    setSaving(false);
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} testID="edit-modal">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.modalSheet}>
        <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit profile</Text>
              <Pressable onPress={onClose} hitSlop={12} style={styles.headerIconBtnSmall}>
                <Ionicons name="close" size={20} color={COLORS.onBg} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <FloatingInput label="Full name" value={name} onChangeText={setName} testID="edit-name" />
              <FloatingInput
                label="Username" prefix="@" value={username} autoCapitalize="none"
                onChangeText={(v) => setUsername(v.toLowerCase().replace(/\s+/g, "_"))}
                errorText={usernameErr} testID="edit-username"
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <FloatingInput label="Country" value={country} onChangeText={setCountry} containerStyle={{ flex: 1 }} testID="edit-country" />
                <FloatingInput label="State" value={state} onChangeText={setState} containerStyle={{ flex: 1 }} testID="edit-state" />
              </View>
              <FloatingInput label="Slogan" value={slogan} onChangeText={setSlogan} multiline testID="edit-slogan" />

              <View style={{ marginTop: 4 }}>
                <GradientButton
                  label={saving ? "Saving…" : "Save changes"}
                  onPress={save}
                  loading={saving}
                  size="lg"
                  testID="edit-save"
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  cover: { height: 210, overflow: "hidden" },
  orb1: { position: "absolute", top: -40, right: -60, width: 200, height: 200, borderRadius: 200, backgroundColor: "rgba(249,115,22,0.55)" },
  orb2: { position: "absolute", bottom: -60, left: -40, width: 160, height: 160, borderRadius: 160, backgroundColor: "rgba(217,70,239,0.55)" },
  headerTop: {
    position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 20,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8,
  },
  headerBrand: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrow: { ...TYPE.label, color: "rgba(255,255,255,0.85)" },
  headerIconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
  },
  headerIconBtnSmall: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.surface2, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: COLORS.border,
  },
  avatarWrap: { marginTop: -52, alignItems: "center", justifyContent: "center" },
  avatarRing: {
    position: "absolute", width: 108, height: 108, borderRadius: 54, overflow: "hidden",
  },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 4, borderColor: COLORS.bg,
    backgroundColor: COLORS.surface3,
  },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInit: { color: "#fff", fontSize: 32, fontWeight: "800" },
  info: { alignItems: "center", paddingHorizontal: 20, paddingTop: 14, gap: 4 },
  name: { ...TYPE.h2, color: COLORS.onBg, fontSize: 22 },
  handle: { color: COLORS.brand2, fontSize: 14, fontWeight: "700" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  loc: { color: COLORS.onBgMuted, fontSize: 13, fontWeight: "500" },
  slogan: { color: COLORS.onBg, fontSize: 14, fontStyle: "italic", textAlign: "center", marginTop: 8, opacity: 0.9 },
  statsCard: {
    marginTop: 20, flexDirection: "row", alignSelf: "stretch", marginHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statItem: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  statNum: { color: COLORS.onBg, fontSize: 20, fontWeight: "800" },
  statLabel: { color: COLORS.onBgMuted, fontSize: 11, marginTop: 2, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: "700" },
  editBtn: {
    marginTop: 18, flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 22, paddingVertical: 12, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderStrong,
  },
  editText: { color: COLORS.onBg, fontWeight: "700", fontSize: 14 },
  tabIndicator: { marginTop: 24, borderTopWidth: 1, borderTopColor: COLORS.divider, flexDirection: "row" },
  tabItemActive: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12,
    borderTopWidth: 2, borderTopColor: COLORS.brand2, marginTop: -1,
  },
  tabTextActive: { color: COLORS.onBg, fontWeight: "800", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" },
  tile: { width: GRID, height: GRID, backgroundColor: COLORS.surface2, overflow: "hidden", position: "relative" },
  tilePill: {
    position: "absolute", left: 6, top: 6, height: 4, width: 22, borderRadius: 2,
  },
  tilePillText: {
    position: "absolute", left: 6, bottom: 6,
    color: "#fff", fontSize: 8, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6,
    textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 4,
  },
  tileLikes: {
    position: "absolute", right: 6, bottom: 6,
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  tileLikesText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  emptyBox: { alignItems: "center", padding: 40, gap: 10 },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border, marginBottom: 4,
  },
  emptyTitle: { ...TYPE.h3, color: COLORS.onBg, fontSize: 18 },
  emptyBody: { color: COLORS.onBgMuted, textAlign: "center", fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  modalSheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, height: "82%",
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1, borderColor: COLORS.borderStrong,
  },
  modalHandle: { alignSelf: "center", width: 44, height: 4, borderRadius: 2, backgroundColor: COLORS.borderStrong, marginTop: 10 },
  modalHeader: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { ...TYPE.h3, color: COLORS.onBg, fontSize: 17 },
});
