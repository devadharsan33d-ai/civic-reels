import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Dimensions, ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { api } from "@/src/utils/api";
import { useToast } from "@/src/components/Toast";
import { BRAND_GRADIENT, categoryGradient, COLORS, RADIUS, TYPE } from "@/src/theme";
import GradientButton from "@/src/components/GradientButton";
import FollowersModal from "@/src/components/FollowersModal";

const { width } = Dimensions.get("window");
const GRID = (width - 4) / 3;

type UserDetail = {
  user_id: string;
  name: string;
  username?: string | null;
  country?: string | null;
  state?: string | null;
  slogan?: string | null;
  picture?: string | null;
  post_count: number;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  is_self: boolean;
};

type PostRow = { post_id: string; image_base64: string; category: string; like_count: number };

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { show } = useToast();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followersModal, setFollowersModal] = useState<null | "followers" | "following">(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [u, p] = await Promise.all([
        api<UserDetail>(`/users/${id}`),
        api<PostRow[]>(`/posts/user/${id}`),
      ]);
      setUser(u);
      setPosts(p);
    } catch (e: any) {
      show(e?.message || "Failed to load profile", "error");
    }
    setLoading(false);
  }, [id, show]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [load]);

  const toggleFollow = async () => {
    if (!user || following) return;
    setFollowing(true);
    // optimistic
    setUser((cur) =>
      cur
        ? {
            ...cur,
            is_following: !cur.is_following,
            follower_count: cur.follower_count + (cur.is_following ? -1 : 1),
          }
        : cur
    );
    try {
      const res = await api<{ is_following: boolean; follower_count: number }>(
        `/users/${user.user_id}/follow`,
        { method: "POST" }
      );
      setUser((cur) => (cur ? { ...cur, ...res } : cur));
    } catch (e: any) {
      show(e?.message || "Failed", "error");
      // revert
      setUser((cur) =>
        cur
          ? {
              ...cur,
              is_following: !cur.is_following,
              follower_count: cur.follower_count + (cur.is_following ? -1 : 1),
            }
          : cur
      );
    } finally {
      setFollowing(false);
    }
  };

  if (loading || !user) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={COLORS.brand2} />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="user-detail-screen">
      <FlatList
        data={posts}
        keyExtractor={(p) => p.post_id}
        numColumns={3}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        columnWrapperStyle={{ gap: 2 }}
        ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
        ListHeaderComponent={
          <Header
            user={user}
            following={following}
            onBack={() => router.back()}
            onToggleFollow={toggleFollow}
            onOpenFollowers={() => setFollowersModal("followers")}
            onOpenFollowing={() => setFollowersModal("following")}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="images-outline" size={26} color={COLORS.onBgMuted} />
            </View>
            <Text style={styles.emptyText}>@{user.username || user.name} hasn&apos;t posted yet.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const [c1, c2] = categoryGradient(item.category);
          return (
            <Animated.View entering={FadeIn.duration(300).delay(index * 25)}>
              <View style={styles.tile}>
                <Image
                  source={{
                    uri: item.image_base64.startsWith("data:") || item.image_base64.startsWith("http")
                      ? item.image_base64
                      : `data:image/jpeg;base64,${item.image_base64}`,
                  }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
                <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tilePill} />
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

      {followersModal && (
        <FollowersModal
          userId={user.user_id}
          mode={followersModal}
          onClose={() => setFollowersModal(null)}
        />
      )}
    </View>
  );
}

function Header({
  user, following, onBack, onToggleFollow, onOpenFollowers, onOpenFollowing,
}: {
  user: UserDetail;
  following: boolean;
  onBack: () => void;
  onToggleFollow: () => void;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
}) {
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
        <Pressable onPress={onBack} style={styles.headerIconBtn} hitSlop={8} testID="user-back">
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{user.name}</Text>
        <View style={{ width: 38 }} />
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
        <Text style={styles.handle}>@{user.username || user.name}</Text>
        {(user.state || user.country) && (
          <View style={styles.locRow}>
            <Ionicons name="location" size={13} color={COLORS.onBgMuted} />
            <Text style={styles.loc}>{[user.state, user.country].filter(Boolean).join(", ")}</Text>
          </View>
        )}
        {user.slogan ? <Text style={styles.slogan}>&ldquo;{user.slogan}&rdquo;</Text> : null}

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{user.post_count}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
          <View style={styles.statDivider} />
          <Pressable style={styles.statItem} onPress={onOpenFollowers} testID="open-followers">
            <Text style={styles.statNum}>{user.follower_count}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </Pressable>
          <View style={styles.statDivider} />
          <Pressable style={styles.statItem} onPress={onOpenFollowing} testID="open-following">
            <Text style={styles.statNum}>{user.following_count}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </Pressable>
        </View>

        {!user.is_self && (
          <View style={{ alignSelf: "stretch", paddingHorizontal: 20, marginTop: 18 }}>
            <GradientButton
              label={user.is_following ? "Following" : "Follow"}
              onPress={onToggleFollow}
              loading={following}
              size="md"
              testID="follow-btn"
              variant={user.is_following ? "secondary" : "primary"}
              icon={
                <Ionicons
                  name={user.is_following ? "checkmark" : "person-add"}
                  size={16}
                  color="#fff"
                />
              }
            />
          </View>
        )}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  cover: { height: 210, overflow: "hidden" },
  orb1: { position: "absolute", top: -40, right: -60, width: 200, height: 200, borderRadius: 200, backgroundColor: "rgba(249,115,22,0.55)" },
  orb2: { position: "absolute", bottom: -60, left: -40, width: 160, height: 160, borderRadius: 160, backgroundColor: "rgba(217,70,239,0.55)" },
  headerTop: {
    position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8,
  },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },
  headerIconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
  },
  avatarWrap: { marginTop: -52, alignItems: "center", justifyContent: "center" },
  avatarRing: { position: "absolute", width: 108, height: 108, borderRadius: 54, overflow: "hidden" },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: COLORS.bg, backgroundColor: COLORS.surface3 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInit: { color: "#fff", fontSize: 32, fontWeight: "800" },
  info: { alignItems: "center", paddingTop: 14, gap: 4 },
  name: { ...TYPE.h2, color: COLORS.onBg, fontSize: 22 },
  handle: { color: COLORS.brand2, fontSize: 14, fontWeight: "700" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  loc: { color: COLORS.onBgMuted, fontSize: 13, fontWeight: "500" },
  slogan: { color: COLORS.onBg, fontSize: 14, fontStyle: "italic", textAlign: "center", marginTop: 8, opacity: 0.9, paddingHorizontal: 20 },
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
  tabIndicator: { marginTop: 24, borderTopWidth: 1, borderTopColor: COLORS.divider, flexDirection: "row" },
  tabItemActive: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderTopWidth: 2, borderTopColor: COLORS.brand2, marginTop: -1,
  },
  tabTextActive: { color: COLORS.onBg, fontWeight: "800", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" },
  tile: { width: GRID, height: GRID, backgroundColor: COLORS.surface2, overflow: "hidden", position: "relative" },
  tilePill: { position: "absolute", left: 6, top: 6, height: 4, width: 22, borderRadius: 2 },
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
  empty: { alignItems: "center", padding: 40, gap: 10 },
  emptyIcon: {
    width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
  },
  emptyText: { color: COLORS.onBgMuted, textAlign: "center", fontSize: 14, fontWeight: "500" },
});
