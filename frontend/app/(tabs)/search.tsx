import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable, FlatList, ScrollView,
  ActivityIndicator, Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, COLORS } from "@/src/utils/api";

const { width } = Dimensions.get("window");
const GRID_ITEM = (width - 32 - 8) / 2;

type Mode = "users" | "problems";

type UserRow = { user_id: string; username?: string | null; name: string; picture?: string | null; slogan?: string | null };
type PostRow = { post_id: string; image_base64: string; description: string; category: string; like_count: number };
type Category = { key: string; label: string; icon: any };

export default function SearchScreen() {
  const [mode, setMode] = useState<Mode>("problems");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try { setCategories(await api<Category[]>("/categories")); } catch {}
    })();
  }, []);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === "users") {
        const data = await api<UserRow[]>(`/users/search?q=${encodeURIComponent(q)}`);
        setUsers(data);
      } else {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (category) params.set("category", category);
        const data = await api<PostRow[]>(`/posts/search?${params.toString()}`);
        setPosts(data);
      }
    } catch {}
    setLoading(false);
  }, [mode, q, category]);

  useEffect(() => { runSearch(); }, [mode, category, runSearch]);

  return (
    <SafeAreaView style={styles.container} testID="search-screen" edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#7A7A7A" />
          <TextInput
            testID="search-input"
            style={styles.searchInput}
            value={q}
            onChangeText={setQ}
            onSubmitEditing={runSearch}
            placeholder={mode === "users" ? "Search users by name or @username" : "Search problems…"}
            placeholderTextColor="#666"
            returnKeyType="search"
          />
          {q.length > 0 && (
            <Pressable onPress={() => { setQ(""); runSearch(); }} testID="search-clear">
              <Ionicons name="close-circle" size={18} color="#7A7A7A" />
            </Pressable>
          )}
        </View>

        <View style={styles.segment}>
          <SegBtn active={mode === "problems"} label="Problems" onPress={() => setMode("problems")} testID="seg-problems" />
          <SegBtn active={mode === "users"} label="Users" onPress={() => setMode("users")} testID="seg-users" />
        </View>

        {mode === "problems" && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            style={{ maxHeight: 56 }}
          >
            <Chip label="All" active={category === ""} onPress={() => setCategory("")} testID="chip-all" />
            {categories.map((c) => (
              <Chip
                key={c.key}
                label={c.label}
                icon={c.icon}
                active={category === c.key}
                onPress={() => setCategory(c.key)}
                testID={`chip-${c.key}`}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.brandSecondary} />
      ) : mode === "users" ? (
        <FlatList
          data={users}
          keyExtractor={(u) => u.user_id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          ListEmptyComponent={<EmptyText text={q ? "No users found." : "Type to search users."} />}
          renderItem={({ item }) => (
            <View style={styles.userRow} testID={`user-row-${item.user_id}`}>
              {item.picture ? (
                <Image source={{ uri: item.picture }} style={styles.userAvatar} />
              ) : (
                <View style={[styles.userAvatar, styles.userAvatarFallback]}>
                  <Text style={styles.userInit}>{item.name?.[0]?.toUpperCase() || "?"}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userHandle}>@{item.username || item.name}</Text>
                {item.slogan ? <Text style={styles.userSlogan} numberOfLines={1}>{item.slogan}</Text> : null}
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.post_id}
          numColumns={2}
          columnWrapperStyle={{ gap: 8 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 8 }}
          ListEmptyComponent={<EmptyText text="No problems found. Try a different category." />}
          renderItem={({ item }) => (
            <View style={styles.gridItem} testID={`grid-${item.post_id}`}>
              <Image
                source={{
                  uri: item.image_base64.startsWith("data:") || item.image_base64.startsWith("http")
                    ? item.image_base64
                    : `data:image/jpeg;base64,${item.image_base64}`,
                }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
              <View style={styles.gridOverlay}>
                <View style={styles.gridPill}>
                  <Text style={styles.gridPillText}>{item.category}</Text>
                </View>
                <View style={styles.gridLikes}>
                  <Ionicons name="heart" size={12} color="#fff" />
                  <Text style={styles.gridLikesText}>{item.like_count}</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function SegBtn({ active, label, onPress, testID }: { active: boolean; label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.segBtn, active && styles.segBtnActive]}
    >
      <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Chip({ label, active, onPress, icon, testID }: { label: string; active: boolean; onPress: () => void; icon?: any; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      {icon && <Ionicons name={icon} size={13} color={active ? "#022C22" : COLORS.onSurface2} />}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function EmptyText({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 8 },
  title: { color: COLORS.onSurface, fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    height: 46, borderRadius: 12, paddingHorizontal: 12,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.onSurface, fontSize: 15 },
  segment: {
    flexDirection: "row", backgroundColor: COLORS.surface2,
    borderRadius: 999, padding: 4, gap: 4,
  },
  segBtn: { flex: 1, height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  segBtnActive: { backgroundColor: COLORS.brandPrimary },
  segText: { color: COLORS.onSurface3, fontSize: 13, fontWeight: "600" },
  segTextActive: { color: "#fff", fontWeight: "700" },
  chipRow: { gap: 8, paddingRight: 16, alignItems: "center", height: 56 },
  chip: {
    height: 36, paddingHorizontal: 14, borderRadius: 999, flexShrink: 0,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.brandSecondary, borderColor: COLORS.brandSecondary },
  chipText: { color: COLORS.onSurface2, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#022C22", fontWeight: "700" },
  userRow: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  userAvatar: { width: 48, height: 48, borderRadius: 24 },
  userAvatarFallback: { backgroundColor: COLORS.surface3, alignItems: "center", justifyContent: "center" },
  userInit: { color: "#fff", fontWeight: "700", fontSize: 18 },
  userName: { color: COLORS.onSurface, fontSize: 15, fontWeight: "700" },
  userHandle: { color: COLORS.brandSecondary, fontSize: 13, marginTop: 2 },
  userSlogan: { color: COLORS.onSurface3, fontSize: 12, marginTop: 2 },
  gridItem: {
    width: GRID_ITEM, height: GRID_ITEM * 1.4, borderRadius: 12, overflow: "hidden",
    backgroundColor: COLORS.surface2,
  },
  gridOverlay: {
    position: "absolute", left: 8, right: 8, bottom: 8, top: 8,
    justifyContent: "space-between",
  },
  gridPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  gridPillText: { color: "#fff", fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  gridLikes: {
    alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  gridLikesText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  emptyText: { color: COLORS.onSurface3, textAlign: "center", marginTop: 40 },
});
