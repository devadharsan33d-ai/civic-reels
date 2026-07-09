import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Dimensions, RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withSpring, withSequence } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/utils/api";
import { BRAND_GRADIENT, categoryGradient, categoryIcon, COLORS, RADIUS, TYPE } from "@/src/theme";
import CommentsSheet from "@/src/components/CommentsSheet";
import Logo from "@/src/components/Logo";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");

type Post = {
  post_id: string;
  image_base64: string;
  description: string;
  category: string;
  tagged_usernames: string[];
  created_at: string;
  author: { user_id: string; username?: string | null; name: string; picture?: string | null };
  like_count: number;
  comment_count: number;
  liked: boolean;
};

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const itemHeight = SCREEN_H;

  const load = useCallback(async () => {
    try {
      const list = await api<Post[]>("/posts/feed");
      setPosts(list);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => { await load(); setLoading(false); })();
  }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onLike = async (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPosts((cur) =>
      cur.map((p) =>
        p.post_id === postId
          ? { ...p, liked: !p.liked, like_count: p.like_count + (p.liked ? -1 : 1) }
          : p
      )
    );
    try {
      const res = await api<{ liked: boolean; like_count: number }>(`/posts/${postId}/like`, { method: "POST" });
      setPosts((cur) => cur.map((p) => (p.post_id === postId ? { ...p, ...res } : p)));
    } catch {}
  };

  const bumpCommentCount = (postId: string, delta: number) => {
    setPosts((cur) =>
      cur.map((p) => (p.post_id === postId ? { ...p, comment_count: p.comment_count + delta } : p))
    );
  };

  if (loading) {
    return (
      <View style={styles.emptyContainer} testID="feed-loading">
        <FeedTopBar topInset={insets.top} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <View style={styles.loaderBadge}>
            <LinearGradient
              colors={BRAND_GRADIENT as unknown as string[]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Ionicons name="sparkles" size={22} color="#fff" />
          </View>
          <Text style={styles.loaderText}>Loading the neighbourhood…</Text>
        </View>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer} testID="feed-empty">
        <FeedTopBar topInset={0} />
        <View style={styles.emptyBox}>
          <LinearGradient
            colors={BRAND_GRADIENT as unknown as string[]}
            style={styles.emptyGlow}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="camera" size={30} color="#fff" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>Be the first to speak up</Text>
          <Text style={styles.emptyBody}>
            No reports in your area yet. Snap a photo and put a problem on the map.
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/create")} testID="empty-create" style={styles.emptyCtaWrap}>
            <LinearGradient
              colors={BRAND_GRADIENT as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyCta}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyCtaText}>Post a report</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container} testID="feed-screen">
      <FlatList
        data={posts}
        keyExtractor={(item) => item.post_id}
        pagingEnabled
        snapToInterval={itemHeight}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand2} />}
        renderItem={({ item }) => (
          <ReelItem
            post={item}
            height={itemHeight}
            topInset={insets.top}
            bottomInset={insets.bottom + 76}
            onLike={() => onLike(item.post_id)}
            onComment={() => setCommentsPostId(item.post_id)}
          />
        )}
      />
      <FeedTopBar topInset={insets.top} overlay />
      {commentsPostId && (
        <CommentsSheet
          postId={commentsPostId}
          onClose={() => setCommentsPostId(null)}
          onAdded={() => bumpCommentCount(commentsPostId, 1)}
        />
      )}
    </View>
  );
}

function FeedTopBar({ topInset, overlay }: { topInset: number; overlay?: boolean }) {
  return (
    <View style={[
      styles.topBar,
      { paddingTop: topInset + 6 },
      overlay && { position: "absolute", left: 0, right: 0, top: 0, zIndex: 5 },
    ]}>
      <LinearGradient
        colors={overlay ? ["rgba(0,0,0,0.55)", "transparent"] : ["transparent", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <Logo size={22} />
      <View style={{ flex: 1 }} />
      <Pressable style={styles.topIconBtn} hitSlop={8}>
        <Ionicons name="notifications-outline" size={20} color="#fff" />
      </Pressable>
    </View>
  );
}

function ReelItem({
  post, height, topInset, bottomInset, onLike, onComment,
}: {
  post: Post; height: number; topInset: number; bottomInset: number;
  onLike: () => void; onComment: () => void;
}) {
  const heart = useSharedValue(1);
  const src = useMemo(() => {
    const b = post.image_base64;
    if (b?.startsWith("data:") || b?.startsWith("http")) return b;
    return `data:image/jpeg;base64,${b}`;
  }, [post.image_base64]);

  const [c1, c2] = categoryGradient(post.category);

  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heart.value }] }));
  const handleLike = () => {
    heart.value = withSequence(withSpring(1.35, { damping: 4, mass: 0.5 }), withSpring(1));
    onLike();
  };

  return (
    <View style={[styles.reel, { height }]} testID={`reel-${post.post_id}`}>
      <Image source={{ uri: src }} style={styles.image} contentFit="cover" transition={200} />
      <LinearGradient
        colors={["rgba(0,0,0,0.65)", "transparent", "transparent", "rgba(0,0,0,0.9)"]}
        locations={[0, 0.22, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top: category pill */}
      <View style={[styles.topRow, { top: topInset + 56 }]}>
        <View style={styles.catPillWrap}>
          <LinearGradient
            colors={[c1, c2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.catPill}
          >
            <Ionicons name={categoryIcon(post.category) as any} size={12} color="#fff" />
            <Text style={styles.catPillText}>{post.category.toUpperCase()}</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Right action stack */}
      <View style={[styles.rightStack, { bottom: bottomInset + 24 }]}>
        <Pressable onPress={handleLike} style={styles.actionBtn} testID={`like-${post.post_id}`}>
          <Animated.View style={[styles.actionGlass, heartStyle]}>
            <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />
            <Ionicons name={post.liked ? "heart" : "heart-outline"} size={26} color={post.liked ? "#F43F5E" : "#fff"} />
          </Animated.View>
          <Text style={styles.actionLabel}>{formatCount(post.like_count)}</Text>
        </Pressable>

        <Pressable onPress={onComment} style={styles.actionBtn} testID={`comment-${post.post_id}`}>
          <View style={styles.actionGlass}>
            <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />
            <Ionicons name="chatbubble-outline" size={24} color="#fff" />
          </View>
          <Text style={styles.actionLabel}>{formatCount(post.comment_count)}</Text>
        </Pressable>

        <Pressable style={styles.actionBtn} testID={`share-${post.post_id}`}>
          <View style={styles.actionGlass}>
            <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />
            <Ionicons name="paper-plane-outline" size={22} color="#fff" />
          </View>
          <Text style={styles.actionLabel}>Share</Text>
        </Pressable>
      </View>

      {/* Bottom text */}
      <Animated.View entering={FadeIn.duration(400)} style={[styles.bottomInfo, { bottom: bottomInset + 24 }]}>
        <View style={styles.authorRow}>
          {post.author.picture ? (
            <Image source={{ uri: post.author.picture }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={BRAND_GRADIENT as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarInit}>{post.author.name?.[0]?.toUpperCase() || "?"}</Text>
            </LinearGradient>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.username} numberOfLines={1}>@{post.author.username || post.author.name}</Text>
            <Text style={styles.subLine} numberOfLines={1}>{formatTime(post.created_at)}</Text>
          </View>
        </View>
        <Text style={styles.description} numberOfLines={4}>{post.description}</Text>
        {post.tagged_usernames?.length > 0 && (
          <Text style={styles.tags} numberOfLines={1}>
            {post.tagged_usernames.map((u) => `@${u}`).join("  ")}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

function formatCount(n: number) {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString();
  } catch { return ""; }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  emptyContainer: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  topIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: COLORS.border,
  },
  loaderBadge: {
    width: 56, height: 56, borderRadius: 28, overflow: "hidden",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  loaderText: { color: COLORS.onBgMuted, fontWeight: "600" },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyGlow: {
    width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 8,
    shadowColor: "#D946EF", shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
  },
  emptyTitle: { ...TYPE.h2, color: COLORS.onBg, fontSize: 24, textAlign: "center" },
  emptyBody: { color: COLORS.onBgMuted, textAlign: "center", fontSize: 15, lineHeight: 22, maxWidth: 300 },
  emptyCtaWrap: { marginTop: 12, borderRadius: RADIUS.pill, overflow: "hidden" },
  emptyCta: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  emptyCtaText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  reel: { width: SCREEN_W, backgroundColor: "#000" },
  image: { width: "100%", height: "100%" },
  topRow: { position: "absolute", left: 16, right: 16, flexDirection: "row" },
  catPillWrap: {
    borderRadius: RADIUS.pill, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  catPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill,
  },
  catPillText: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  rightStack: { position: "absolute", right: 12, gap: 22, alignItems: "center" },
  actionBtn: { alignItems: "center", gap: 6 },
  actionGlass: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
  },
  actionLabel: { color: "#fff", fontSize: 12, fontWeight: "700" },
  bottomInfo: { position: "absolute", left: 16, right: 92, gap: 10 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  avatarInit: { color: "#fff", fontSize: 16, fontWeight: "800" },
  username: { color: "#fff", fontSize: 15, fontWeight: "800" },
  subLine: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "500", marginTop: 2 },
  description: { color: "#fff", fontSize: 14, lineHeight: 20, fontWeight: "500" },
  tags: { color: "#F5D0FE", fontSize: 13, fontWeight: "700" },
});
