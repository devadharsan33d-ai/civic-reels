import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Dimensions, ScrollView, TextInput,
  Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { api, COLORS } from "@/src/utils/api";

const { width } = Dimensions.get("window");
const GRID = (width - 6) / 3;

type PostRow = { post_id: string; image_base64: string; category: string; like_count: number };

export default function ProfileScreen() {
  const { user, logout, refresh } = useAuth();
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
        contentContainerStyle={{ paddingBottom: 120 }}
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
            <Ionicons name="images-outline" size={40} color={COLORS.onSurface3} />
            <Text style={styles.emptyTxt}>No reports yet.</Text>
            <Pressable style={styles.emptyBtn} onPress={() => router.push("/(tabs)/create")}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Add your first report</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
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
            <View style={styles.tilePill}>
              <Text style={styles.tilePillText}>{item.category}</Text>
            </View>
          </View>
        )}
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
        <LinearGradient colors={["#064E3B", "#022C22", COLORS.surface]} style={StyleSheet.absoluteFill} />
      </View>
      <SafeAreaView edges={["top"]} style={styles.headerTop}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable onPress={onLogout} style={styles.logoutBtn} testID="logout-btn" hitSlop={8}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.onSurface} />
        </Pressable>
      </SafeAreaView>

      <View style={styles.avatarWrap}>
        {user.picture ? (
          <Image source={{ uri: user.picture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInit}>{user.name?.[0]?.toUpperCase() || "?"}</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.handle}>@{user.username || "username"}</Text>
        {(user.state || user.country) && (
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.onSurface3} />
            <Text style={styles.loc}>
              {[user.state, user.country].filter(Boolean).join(", ")}
            </Text>
          </View>
        )}
        {user.slogan ? <Text style={styles.slogan}>&ldquo;{user.slogan}&rdquo;</Text> : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{postCount}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
        </View>

        <Pressable style={styles.editBtn} onPress={onEdit} testID="edit-profile-btn">
          <Ionicons name="create-outline" size={16} color={COLORS.onSurface} />
          <Text style={styles.editText}>Edit profile</Text>
        </Pressable>
      </View>

      <View style={styles.tabIndicator}>
        <View style={styles.tabItemActive}>
          <Ionicons name="grid" size={16} color={COLORS.onSurface} />
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
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      await api("/users/profile", {
        method: "PUT",
        body: { name, username, country, state, slogan },
      });
      onSaved();
    } catch (e: any) {
      setError(e?.message || "Failed to save");
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
              <Pressable onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={22} color={COLORS.onSurface} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
              <ModField label="Full name" value={name} onChange={setName} testID="edit-name" />
              <ModField
                label="Username" value={username}
                onChange={(v) => setUsername(v.toLowerCase().replace(/\s+/g, "_"))}
                prefix="@" testID="edit-username"
              />
              <ModField label="Country" value={country} onChange={setCountry} testID="edit-country" />
              <ModField label="State" value={state} onChange={setState} testID="edit-state" />
              <ModField label="Slogan" value={slogan} onChange={setSlogan} multiline testID="edit-slogan" />
              {error && <Text style={styles.err}>{error}</Text>}
              <Pressable
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={save} disabled={saving} testID="edit-save"
              >
                <Text style={styles.saveText}>{saving ? "Saving…" : "Save changes"}</Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function ModField({
  label, value, onChange, prefix, multiline, testID,
}: any) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: COLORS.onSurface2, fontSize: 13, fontWeight: "600" }}>{label}</Text>
      <View style={[styles.modInputWrap, multiline && { minHeight: 80, alignItems: "flex-start" }]}>
        {prefix && <Text style={{ color: COLORS.onSurface3, fontSize: 16, marginRight: 4 }}>{prefix}</Text>}
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChange}
          multiline={multiline}
          autoCapitalize={prefix ? "none" : "sentences"}
          style={[styles.modInput, multiline && { height: 80, textAlignVertical: "top" }]}
          placeholderTextColor="#666"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  cover: { height: 200 },
  headerTop: {
    position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8,
  },
  headerTitle: { color: COLORS.onSurface, fontSize: 20, fontWeight: "800" },
  logoutBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: COLORS.border,
  },
  avatarWrap: {
    marginTop: -48, alignItems: "center",
  },
  avatar: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: COLORS.surface,
    backgroundColor: COLORS.surface3,
  },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInit: { color: "#fff", fontSize: 32, fontWeight: "800" },
  info: { alignItems: "center", paddingHorizontal: 24, gap: 4, paddingTop: 12 },
  name: { color: COLORS.onSurface, fontSize: 22, fontWeight: "800" },
  handle: { color: COLORS.brandSecondary, fontSize: 14, fontWeight: "600" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  loc: { color: COLORS.onSurface3, fontSize: 13 },
  slogan: { color: COLORS.onSurface2, fontSize: 14, fontStyle: "italic", textAlign: "center", marginTop: 8 },
  statsRow: { flexDirection: "row", marginTop: 16, gap: 32 },
  stat: { alignItems: "center" },
  statNum: { color: COLORS.onSurface, fontSize: 20, fontWeight: "800" },
  statLabel: { color: COLORS.onSurface3, fontSize: 12, marginTop: 2 },
  editBtn: {
    marginTop: 16, flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
  },
  editText: { color: COLORS.onSurface, fontWeight: "600" },
  tabIndicator: { marginTop: 24, borderTopWidth: 1, borderTopColor: COLORS.divider, flexDirection: "row" },
  tabItemActive: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderTopWidth: 2, borderTopColor: COLORS.brandSecondary, marginTop: -1 },
  tabTextActive: { color: COLORS.onSurface, fontWeight: "700", fontSize: 13 },
  tile: { width: GRID, height: GRID, backgroundColor: COLORS.surface2, overflow: "hidden" },
  tilePill: {
    position: "absolute", left: 6, bottom: 6, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 999, backgroundColor: "rgba(0,0,0,0.6)",
  },
  tilePillText: { color: "#fff", fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  emptyBox: { alignItems: "center", padding: 40, gap: 10 },
  emptyTxt: { color: COLORS.onSurface3 },
  emptyBtn: {
    marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: COLORS.brandPrimary,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, height: "82%",
    backgroundColor: COLORS.surface2, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: COLORS.border,
  },
  modalHandle: { alignSelf: "center", width: 44, height: 4, borderRadius: 2, backgroundColor: COLORS.borderStrong, marginTop: 10 },
  modalHeader: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { color: COLORS.onSurface, fontSize: 16, fontWeight: "700" },
  modInputWrap: {
    flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface3,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, minHeight: 50,
  },
  modInput: { flex: 1, color: COLORS.onSurface, fontSize: 15, paddingVertical: 12 },
  saveBtn: {
    marginTop: 8, height: 50, borderRadius: 999, backgroundColor: COLORS.brandPrimary,
    alignItems: "center", justifyContent: "center",
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  err: { color: COLORS.error, fontSize: 13 },
});
