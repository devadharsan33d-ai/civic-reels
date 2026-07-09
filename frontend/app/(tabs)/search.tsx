import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable, FlatList, ScrollView, Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { api } from "@/src/utils/api";
import { BRAND_GRADIENT, categoryGradient, COLORS, RADIUS, TYPE } from "@/src/theme";
import CategoryChip from "@/src/components/CategoryChip";
import Skeleton, { SkeletonRow } from "@/src/components/Skeleton";

const { width } = Dimensions.get("window");
const GRID_ITEM = (width - 32 - 8) / 2;

type Mode = "problems" | "users";

type UserRow = { user_id: string; username?: string | null; name: string; picture?: string | null; slogan?: string | null };
type PostRow = { post_id: string; image_base64: string; description: string; category: string; like_count: number };
type Category = { key: string; label: string; icon: any };

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
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

  useEffect(() => { runSearch(); }, [mode, category, q, runSearch]);

  return (
    <View style={styles.container} testID="search-screen">
      <SafeAreaView edges={["top"]} style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>discover</Text>
            <Text style={styles.title}>Explore Civic Reels</Text>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.onBgMuted} />
          <TextInput
            testID="search-input"
            style={styles.searchInput}
            value={q}
            onChangeText={setQ}
            placeholder={mode === "users" ? "Search people, handles…" : "Search reports, keywords…"}
            placeholderTextColor={COLORS.onBgDim}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ("")} testID="search-clear" hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={COLORS.onBgMuted} />
            </Pressable>
          )}
        </View>

        <View style={styles.segment}>
          <SegBtn active={mode === "problems"} label="Problems" onPress={() => setMode("problems")} testID="seg-problems" icon="film" />
          <SegBtn active={mode === "users"} label="People" onPress={() => setMode("users")} testID="seg-users" icon="people" />
        </View>

        {mode === "problems" && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            style={{ height: 56 }}
          >
            <CategoryChip
              categoryKey="brand"
              label="All"
              active={category === ""}
              onPress={() => setCategory("")}
              showIcon={false}
              testID="chip-all"
            />
            {categories.map((c) => (
              <CategoryChip
                key={c.key}
                categoryKey={c.key}
                label={c.label}
                active={category === c.key}
                onPress={() => setCategory(c.key)}
                testID={`chip-${c.key}`}
              />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>

      {loading ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 10, gap: 10 }}>
          {mode === "users"
            ? [1,2,3,4].map((i) => <SkeletonRow key={i} />)
            : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {[1,2,3,4].map((i) => (
                  <Skeleton key={i} width={GRID_ITEM} height={GRID_ITEM * 1.4} radius={RADIUS.lg} />
                ))}
              </View>
            )
          }
        </View>
      ) : mode === "users" ? (
        <FlatList
          key="users-list"
          data={users}
          keyExtractor={(u) => u.user_id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 + insets.bottom }}
          ListEmptyComponent={<EmptyState icon="people-outline" text={q ? "No people found." : "Search neighbours by name or @handle."} />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(300).delay(index * 30)}>
              <Pressable
                style={styles.userRow}
                onPress={() => router.push(`/user/${item.user_id}`)}
                testID={`user-row-${item.user_id}`}
              >
                {item.picture ? (
                  <Image source={{ uri: item.picture }} style={styles.userAvatar} />
                ) : (
                  <LinearGradient
                    colors={BRAND_GRADIENT as unknown as string[]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.userAvatar}
                  >
                    <Text style={styles.userInit}>{item.name?.[0]?.toUpperCase() || "?"}</Text>
                  </LinearGradient>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userHandle}>@{item.username || item.name}</Text>
                  {item.slogan ? <Text style={styles.userSlogan} numberOfLines={1}>{item.slogan}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.onBgDim} />
              </Pressable>
            </Animated.View>
          )}
        />
      ) : (
        <FlatList
          key="problems-grid"
          data={posts}
          keyExtractor={(p) => p.post_id}
          numColumns={2}
          columnWrapperStyle={{ gap: 8 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 + insets.bottom, gap: 8 }}
          ListEmptyComponent={<EmptyState icon="images-outline" text="No reports match. Try a different filter." />}
          renderItem={({ item, index }) => {
            const [c1, c2] = categoryGradient(item.category);
            return (
              <Animated.View entering={FadeIn.duration(300).delay(index * 20)}>
                <Pressable style={styles.gridItem} testID={`grid-${item.post_id}`}>
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
                    colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.85)"]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.gridOverlay}>
                    <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gridPill}>
                      <Text style={styles.gridPillText}>{item.category}</Text>
                    </LinearGradient>
                    <View style={styles.gridLikes}>
                      <Ionicons name="heart" size={11} color="#fff" />
                      <Text style={styles.gridLikesText}>{item.like_count}</Text>
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}

function SegBtn({ active, label, onPress, testID, icon }: { active: boolean; label: string; onPress: () => void; testID?: string; icon: any }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.segBtn}>
      {active ? (
        <LinearGradient
          colors={BRAND_GRADIENT as unknown as string[]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.pill }]}
        />
      ) : null}
      <Ionicons name={icon} size={16} color={active ? "#fff" : COLORS.onBgMuted} />
      <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={COLORS.onBgMuted} />
      </View>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  headerRow: { marginBottom: 14 },
  eyebrow: { ...TYPE.label, color: COLORS.brand2 },
  title: { ...TYPE.h1, color: COLORS.onBg, fontSize: 28, marginTop: 4 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    height: 50, borderRadius: RADIUS.md, paddingHorizontal: 14,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: COLORS.onBg, fontSize: 15, fontWeight: "500" },
  segment: {
    flexDirection: "row", backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.pill, padding: 4, gap: 4, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  segBtn: {
    flex: 1, height: 40, borderRadius: RADIUS.pill,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    overflow: "hidden",
  },
  segText: { color: COLORS.onBgMuted, fontSize: 13, fontWeight: "700", letterSpacing: 0.2 },
  segTextActive: { color: "#fff", fontWeight: "800" },
  chipRow: { gap: 8, paddingRight: 20, alignItems: "center", height: 56 },
  userRow: {
    flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 12,
    marginBottom: 8, borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  userAvatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
  },
  userInit: { color: "#fff", fontWeight: "800", fontSize: 18 },
  userName: { color: COLORS.onBg, fontSize: 15, fontWeight: "700" },
  userHandle: { color: COLORS.brand2, fontSize: 13, marginTop: 2, fontWeight: "600" },
  userSlogan: { color: COLORS.onBgMuted, fontSize: 12, marginTop: 2 },
  gridItem: {
    width: GRID_ITEM, height: GRID_ITEM * 1.4, borderRadius: RADIUS.lg, overflow: "hidden",
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
  },
  gridOverlay: {
    position: "absolute", left: 10, right: 10, bottom: 10, top: 10,
    justifyContent: "space-between",
  },
  gridPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill,
  },
  gridPillText: { color: "#fff", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  gridLikes: {
    alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
  },
  gridLikesText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  empty: { alignItems: "center", padding: 40, gap: 12 },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
  },
  emptyText: { color: COLORS.onBgMuted, textAlign: "center", fontSize: 14, fontWeight: "500" },
});
