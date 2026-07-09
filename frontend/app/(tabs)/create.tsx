import { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Dimensions, Alert,
} from "react-native";
import { Image } from "expo-image";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { api, COLORS } from "@/src/utils/api";

const { width } = Dimensions.get("window");

type Category = { key: string; label: string; icon: any };

type Step = "capture" | "compose";

export default function CreateScreen() {
  const [step, setStep] = useState<Step>("capture");
  const [image, setImage] = useState<string | null>(null); // data uri
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [tags, setTags] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try { setCategories(await api<Category[]>("/categories")); } catch {}
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        // reset on blur
        setStep("capture");
        setImage(null);
        setDescription("");
        setCategory("");
        setTags("");
        setError(null);
      };
    }, [])
  );

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6 });
      if (photo?.base64) {
        setImage(`data:image/jpeg;base64,${photo.base64}`);
        setStep("compose");
      }
    } catch (e: any) {
      setError("Failed to capture photo");
    }
  };

  const pickGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });
    if (!res.canceled && res.assets[0]?.base64) {
      setImage(`data:image/jpeg;base64,${res.assets[0].base64}`);
      setStep("compose");
    }
  };

  const submit = async () => {
    if (!image) { setError("Please add a photo"); return; }
    if (!description.trim()) { setError("Please describe the problem"); return; }
    if (!category) { setError("Please pick a category"); return; }
    setError(null);
    setPosting(true);
    try {
      const tagList = tags
        .split(/[\s,]+/)
        .map((t) => t.replace(/^@/, "").trim().toLowerCase())
        .filter(Boolean);
      await api("/posts", {
        method: "POST",
        body: {
          image_base64: image,
          description: description.trim(),
          category,
          tagged_usernames: tagList,
        },
      });
      setPosting(false);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message || "Failed to post");
      setPosting(false);
    }
  };

  // ------- Step 1: Capture -------
  if (step === "capture") {
    return (
      <SafeAreaView style={styles.container} testID="create-capture">
        <View style={styles.captureHeader}>
          <Text style={styles.title}>Report a problem</Text>
          <Text style={styles.subtitle}>Take a photo or pick from gallery.</Text>
        </View>

        <View style={styles.cameraWrap}>
          {!permission?.granted ? (
            <View style={styles.permBox}>
              <Ionicons name="camera-outline" size={44} color={COLORS.brandSecondary} />
              <Text style={styles.permText}>Camera access is required to capture problems.</Text>
              <Pressable style={styles.permBtn} onPress={requestPermission} testID="grant-camera">
                <Text style={styles.permBtnText}>Grant camera access</Text>
              </Pressable>
            </View>
          ) : (
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />
          )}
        </View>

        <View style={styles.controlsRow}>
          <Pressable style={styles.smallBtn} onPress={pickGallery} testID="pick-gallery">
            <Ionicons name="images-outline" size={22} color="#fff" />
            <Text style={styles.smallBtnText}>Gallery</Text>
          </Pressable>

          <Pressable
            style={[styles.shutter, !permission?.granted && { opacity: 0.4 }]}
            onPress={takePhoto}
            disabled={!permission?.granted}
            testID="shutter"
          >
            <View style={styles.shutterInner} />
          </Pressable>

          <Pressable
            style={styles.smallBtn}
            onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
            testID="flip"
          >
            <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
            <Text style={styles.smallBtnText}>Flip</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ------- Step 2: Compose -------
  return (
    <SafeAreaView style={styles.container} testID="create-compose">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 160 }} keyboardShouldPersistTaps="handled">
          <View style={styles.composeHeader}>
            <Pressable onPress={() => setStep("capture")} testID="back-capture" hitSlop={12}>
              <Ionicons name="chevron-back" size={26} color={COLORS.onSurface} />
            </Pressable>
            <Text style={styles.composeTitle}>New Report</Text>
            <View style={{ width: 26 }} />
          </View>

          {image && (
            <View style={styles.previewWrap}>
              <Image source={{ uri: image }} style={styles.preview} contentFit="cover" />
              <Pressable style={styles.retake} onPress={() => setStep("capture")} testID="retake">
                <Ionicons name="refresh" size={14} color="#fff" />
                <Text style={styles.retakeText}>Retake</Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.label}>Description</Text>
          <TextInput
            testID="desc-input"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the problem so people can help."
            placeholderTextColor="#666"
            style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
            multiline
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.catWrap}>
            {categories.map((c) => (
              <Pressable
                key={c.key}
                onPress={() => setCategory(c.key)}
                style={[styles.catChip, category === c.key && styles.catChipActive]}
                testID={`cat-${c.key}`}
              >
                <Ionicons
                  name={c.icon}
                  size={14}
                  color={category === c.key ? "#022C22" : COLORS.onSurface2}
                />
                <Text style={[styles.catChipText, category === c.key && styles.catChipTextActive]}>
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Tag users (optional)</Text>
          <TextInput
            testID="tags-input"
            value={tags}
            onChangeText={setTags}
            placeholder="@mayor @city_council"
            placeholderTextColor="#666"
            style={styles.input}
            autoCapitalize="none"
          />

          {error && <Text style={styles.error} testID="compose-error">{error}</Text>}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            testID="post-submit"
            onPress={submit}
            disabled={posting}
            style={({ pressed }) => [styles.postBtn, pressed && { opacity: 0.85 }, posting && { opacity: 0.6 }]}
          >
            {posting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={16} color="#fff" />
                <Text style={styles.postBtnText}>Post to CivicReel</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  captureHeader: { paddingHorizontal: 16, paddingTop: 8, gap: 4, paddingBottom: 12 },
  title: { color: COLORS.onSurface, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: COLORS.onSurface3, fontSize: 13 },
  cameraWrap: {
    marginHorizontal: 16, borderRadius: 20, overflow: "hidden",
    backgroundColor: COLORS.surface2, aspectRatio: 3 / 4,
  },
  permBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  permText: { color: COLORS.onSurface2, textAlign: "center" },
  permBtn: { marginTop: 8, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: COLORS.brandPrimary },
  permBtnText: { color: "#fff", fontWeight: "700" },
  controlsRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    paddingVertical: 20, paddingHorizontal: 16,
  },
  smallBtn: { alignItems: "center", gap: 4, width: 80 },
  smallBtnText: { color: COLORS.onSurface2, fontSize: 12, fontWeight: "600" },
  shutter: {
    width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.brandSecondary },
  composeHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  composeTitle: { color: COLORS.onSurface, fontSize: 18, fontWeight: "700" },
  previewWrap: { borderRadius: 16, overflow: "hidden", aspectRatio: 4 / 3, marginBottom: 16, backgroundColor: COLORS.surface2 },
  preview: { width: "100%", height: "100%" },
  retake: {
    position: "absolute", top: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.55)",
  },
  retakeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  label: { color: COLORS.onSurface2, fontSize: 13, fontWeight: "600", marginTop: 12, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.surface2, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.onSurface, fontSize: 15,
  },
  catWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: {
    height: 36, paddingHorizontal: 12, borderRadius: 999,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: COLORS.brandSecondary, borderColor: COLORS.brandSecondary },
  catChipText: { color: COLORS.onSurface2, fontSize: 13, fontWeight: "600" },
  catChipTextActive: { color: "#022C22", fontWeight: "700" },
  error: { color: COLORS.error, marginTop: 12, fontSize: 13 },
  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  postBtn: {
    height: 54, borderRadius: 999, backgroundColor: COLORS.brandPrimary,
    alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8,
  },
  postBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
