import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, Modal, Pressable, TextInput, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, COLORS } from "@/src/utils/api";

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
            <Text style={styles.title}>Comments</Text>
            <Pressable onPress={onClose} testID="comments-close" hitSlop={12}>
              <Ionicons name="close" size={22} color={COLORS.onSurface} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 30 }} color={COLORS.brandSecondary} />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(c) => c.comment_id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
              ListEmptyComponent={
                <Text style={styles.empty}>Be the first to comment.</Text>
              }
              renderItem={({ item }) => (
                <View style={styles.commentRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarInit}>{item.name?.[0]?.toUpperCase() || "?"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cUser}>@{item.username || item.name}</Text>
                    <Text style={styles.cText}>{item.text}</Text>
                  </View>
                </View>
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
                placeholderTextColor="#666"
                style={styles.input}
                onSubmitEditing={submit}
                returnKeyType="send"
              />
              <Pressable
                testID="comment-send"
                onPress={submit}
                disabled={posting || !text.trim()}
                style={[styles.send, (!text.trim() || posting) && { opacity: 0.4 }]}
              >
                <Ionicons name="arrow-up" size={20} color="#fff" />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    height: "72%", backgroundColor: COLORS.surface2,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: COLORS.border,
  },
  handle: { alignSelf: "center", width: 44, height: 4, borderRadius: 2, backgroundColor: COLORS.borderStrong, marginTop: 10 },
  header: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: COLORS.onSurface, fontSize: 16, fontWeight: "700" },
  empty: { color: COLORS.onSurface3, textAlign: "center", marginTop: 40 },
  commentRow: { flexDirection: "row", gap: 12, paddingVertical: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface3, alignItems: "center", justifyContent: "center" },
  avatarInit: { color: "#fff", fontWeight: "700" },
  cUser: { color: COLORS.brandSecondary, fontSize: 13, fontWeight: "700" },
  cText: { color: COLORS.onSurface, fontSize: 14, marginTop: 2, lineHeight: 20 },
  inputBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface2,
  },
  input: {
    flex: 1, height: 44, borderRadius: 22, paddingHorizontal: 16,
    backgroundColor: COLORS.surface3, color: COLORS.onSurface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  send: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.brandPrimary, alignItems: "center", justifyContent: "center",
  },
});
