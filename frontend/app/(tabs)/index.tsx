import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Dimensions,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { api, COLORS } from "@/src/utils/api";
import CommentsSheet from "@/src/components/CommentsSheet";

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
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onLike = async (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // optimistic
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
      <View style={styles.center}><ActivityIndicator color={COLORS.brandSecondary} /></View>
    );
  }

  if (posts.length === 0) {
    return (
      <SafeAreaView style={styles.center} testID="feed-empty">
        <View style={styles.emptyCard}>
          <Ionicons name="camera-outline" size={48} color={COLORS.brandSecondary} />
          <Text style={styles.emptyTitle}>No reports yet</Text>
          <Text style={styles.emptyBody}>Tap the + tab to post the first civic problem in your area.</Text>
          <Pressable style={styles.refreshBtn} onPress={onRefresh} testID="feed-refresh">
            <Text style={styles.refreshText}>Refresh</Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brandSecondary} />}
        renderItem={({ item }) => (
          <ReelItem
            post={item}
            height={itemHeight}
            topInset={insets.top}
            bottomInset={insets.bottom + 72}
            onLike={() => onLike(item.post_id)}
            onComment={() => setCommentsPostId(item.post_id)}
          />
        )}
      />
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

function ReelItem({
  post, height, topInset, bottomInset, onLike, onComment,
}: {
  post: Post; height: number; topInset: number; bottomInset: number;
  onLike: () => void; onComment: () => void;
}) {
  const src = useMemo(() => {
    const b = post.image_base64;
    if (b?.startsWith("data:") || b?.startsWith("http")) return b;
    return `data:image/jpeg;base64,${b}`;
  }, [post.image_base64]);

  return (
    <View style={[styles.reel, { height }]} testID={`reel-${post.post_id}`}>
      <Image source={{ uri: src }} style={styles.image} contentFit="cover" transition={200} />
      <LinearGradient
        colors={["rgba(0,0,0,0.55)", "transparent", "transparent", "rgba(5,5,5,0.85)"]}
        locations={[0, 0.2, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top: category pill */}
      <View style={[styles.topRow, { top: topInset + 12 }]}>
        <View style={styles.catPill}>
          <Ionicons name="pricetag" size={12} color={COLORS.brandTertiary} />
          <Text style={styles.catPillText}>{post.category.toUpperCase()}</Text>
        </View>
      </View>

      {/* Right action stack */}
      <View style={[styles.rightStack, { bottom: bottomInset + 20 }]}>
        <ActionButton
          testID={`like-${post.post_id}`}
          icon={post.liked ? "heart" : "heart-outline"}
          color={post.liked ? COLORS.error : "#fff"}
          label={`${post.like_count}`}
          onPress={onLike}
        />
        <ActionButton
          testID={`comment-${post.post_id}`}
          icon="chatbubble-outline"
          color="#fff"
          label={`${post.comment_count}`}
          onPress={onComment}
        />
        <ActionButton
          testID={`share-${post.post_id}`}
          icon="paper-plane-outline"
          color="#fff"
          label="Share"
          onPress={() => {}}
        />
      </View>

      {/* Bottom text */}
      <View style={[styles.bottomInfo, { bottom: bottomInset + 20, right: 92 }]}>
        <View style={styles.authorRow}>
          {post.author.picture ? (
            <Image source={{ uri: post.author.picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInit}>{post.author.name?.[0]?.toUpperCase() || "?"}</Text>
            </View>
          )}
          <Text style={styles.username} numberOfLines={1}>
            @{post.author.username || post.author.name}
          </Text>
        </View>
        <Text style={styles.description} numberOfLines={4}>{post.description}</Text>
        {post.tagged_usernames?.length > 0 && (
          <Text style={styles.tags} numberOfLines={1}>
            {post.tagged_usernames.map((u) => `@${u}`).join("  ")}
          </Text>
        )}
      </View>
    </View>
  );
}

function ActionButton({
  icon, color, label, onPress, testID,
}: { icon: any; color: string; label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]} testID={testID}>
      <View style={styles.actionGlass}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyCard: { alignItems: "center", gap: 12 },
  emptyTitle: { color: COLORS.onSurface, fontSize: 20, fontWeight: "700" },
  emptyBody: { color: COLORS.onSurface3, fontSize: 14, textAlign: "center" },
  refreshBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, backgroundColor: COLORS.brandPrimary },
  refreshText: { color: "#fff", fontWeight: "600" },
  reel: { width: SCREEN_W, backgroundColor: "#000" },
  image: { width: "100%", height: "100%" },
  topRow: { position: "absolute", left: 16, right: 16, flexDirection: "row" },
  catPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: "rgba(6,78,59,0.6)", borderWidth: 1, borderColor: "rgba(52,211,153,0.4)",
  },
  catPillText: { color: COLORS.brandTertiary, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  rightStack: { position: "absolute", right: 12, gap: 18, alignItems: "center" },
  actionBtn: { alignItems: "center", gap: 4 },
  actionGlass: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: "rgba(28,28,28,0.6)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  actionLabel: { color: "#fff", fontSize: 11, fontWeight: "600" },
  bottomInfo: { position: "absolute", left: 16, gap: 8 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: COLORS.brandSecondary },
  avatarFallback: { backgroundColor: COLORS.surface3, alignItems: "center", justifyContent: "center" },
  avatarInit: { color: "#fff", fontSize: 14, fontWeight: "700" },
  username: { color: "#fff", fontSize: 15, fontWeight: "700" },
  description: { color: "#fff", fontSize: 14, lineHeight: 20, opacity: 0.95 },
  tags: { color: COLORS.brandTertiary, fontSize: 13, fontWeight: "600" },
});
