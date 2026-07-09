import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, Modal, Pressable, TextInput, FlatList,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { api } from "@/src/utils/api";
import { BRAND_GRADIENT, COLORS, RADIUS, TYPE } from "@/src/theme";
import Skeleton from "@/src/components/Skeleton";

type Comment = {
  comment_id: string;
  post_id: string;
  user_id: string;
  username?: string | null;
  name: string;
  picture?: string | null;
  text: string;
  created_at: string;
};

export default function CommentsSheet({
  postId, onClose, onAdded,
}: { postId: string; onClose: () => void; onAdded: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await api<Comment[]>(`/posts/${postId}/comments`);
        setComments(list);
      } catch {}
      setLoading(false);
    })();
  }, [postId]);

  const submit = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      const c = await api<Comment>(`/posts/${postId}/comments`, {
        method: "POST",
        body: { text: text.trim() },
      });
      setComments((cur) => [c, ...cur]);
      setText("");
      onAdded();
    } catch {}
    setPosting(false);
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} testID="comments-sheet">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>comments</Text>
              <Text style={styles.title}>{comments.length} {comments.length === 1 ? "reply" : "replies"}</Text>
            </View>
            <Pressable onPress={onClose} testID="comments-close" hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.onBg} />
            </Pressable>
          </View>

          {loading ? (
            <View style={{ padding: 20, gap: 14 }}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={{ flexDirection: "row", gap: 12 }}>
                  <Skeleton width={36} height={36} radius={18} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width="30%" height={12} />
                    <Skeleton width="80%" height={14} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(c) => c.comment_id}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="chatbubbles-outline" size={22} color={COLORS.onBgMuted} />
                  </View>
                  <Text style={styles.emptyText}>Be the first to comment.</Text>
                </View>
              }
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInDown.duration(240).delay(index * 30)} style={styles.commentRow}>
                  <LinearGradient
                    colors={BRAND_GRADIENT as unknown as string[]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarInit}>{item.name?.[0]?.toUpperCase() || "?"}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cUser}>@{item.username || item.name}</Text>
                    <Text style={styles.cText}>{item.text}</Text>
                  </View>
                </Animated.View>
              )}
            />
          )}

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.inputBar}>
              <TextInput
                testID="comment-input"
                value={text}
                onChangeText={setText}
                placeholder="Add a comment…"
                placeholderTextColor={COLORS.onBgDim}
                style={styles.input}
                onSubmitEditing={submit}
                returnKeyType="send"
              />
              <Pressable
                testID="comment-send"
                onPress={submit}
                disabled={posting || !text.trim()}
                style={[(!text.trim() || posting) && { opacity: 0.4 }]}
              >
                <LinearGradient
                  colors={BRAND_GRADIENT as unknown as string[]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.send}
                >
                  <Ionicons name="arrow-up" size={20} color="#fff" />
                </LinearGradient>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    height: "76%", backgroundColor: COLORS.surface,
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
  emptyBox: { alignItems: "center", padding: 40, gap: 10 },
  emptyIcon: {
    width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
  },
  emptyText: { color: COLORS.onBgMuted, textAlign: "center", fontSize: 14, fontWeight: "500" },
  commentRow: { flexDirection: "row", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarInit: { color: "#fff", fontWeight: "800", fontSize: 14 },
  cUser: { color: COLORS.brand2, fontSize: 13, fontWeight: "700" },
  cText: { color: COLORS.onBg, fontSize: 14, marginTop: 3, lineHeight: 20, fontWeight: "500" },
  inputBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 20, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  input: {
    flex: 1, height: 46, borderRadius: RADIUS.pill, paddingHorizontal: 16,
    backgroundColor: COLORS.surface2, color: COLORS.onBg, fontSize: 15, fontWeight: "500",
    borderWidth: 1, borderColor: COLORS.border,
  },
  send: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
  },
});
