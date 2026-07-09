import { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform, Dimensions, Alert,
} from "react-native";
import { Image } from "expo-image";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { api } from "@/src/utils/api";
import { useToast } from "@/src/components/Toast";
import { BRAND_GRADIENT, COLORS, RADIUS, TYPE } from "@/src/theme";
import FloatingInput from "@/src/components/FloatingInput";
import GradientButton from "@/src/components/GradientButton";
import CategoryChip from "@/src/components/CategoryChip";

type Category = { key: string; label: string; icon: any };
type Step = "capture" | "compose";

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("capture");
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [tags, setTags] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [posting, setPosting] = useState(false);
  const [descErr, setDescErr] = useState<string | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const { show } = useToast();

  useEffect(() => {
    (async () => {
      try { setCategories(await api<Category[]>("/categories")); } catch {}
    })();
  }, []);

  useFocusEffect(useCallback(() => {
    return () => {
      setStep("capture"); setImage(null); setDescription(""); setCategory(""); setTags(""); setDescErr(null);
    };
  }, []));

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.55 });
      if (photo?.base64) {
        setImage(`data:image/jpeg;base64,${photo.base64}`);
        setStep("compose");
      }
    } catch { show("Failed to capture photo", "error"); }
  };

  const pickGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.55, base64: true,
    });
    if (!res.canceled && res.assets[0]?.base64) {
      setImage(`data:image/jpeg;base64,${res.assets[0].base64}`);
      setStep("compose");
    }
  };

  const submit = async () => {
    if (!image) { show("Please add a photo first", "error"); return; }
    if (!description.trim()) { setDescErr("Describe the problem"); return; }
    if (!category) { show("Pick a category", "error"); return; }
    setDescErr(null);
    setPosting(true);
    try {
      const tagList = tags
        .split(/[\s,]+/)
        .map((t) => t.replace(/^@/, "").trim().toLowerCase())
        .filter(Boolean);
      await api("/posts", {
        method: "POST",
        body: { image_base64: image, description: description.trim(), category, tagged_usernames: tagList },
      });
      show("Report posted!", "success");
      router.replace("/(tabs)");
    } catch (e: any) {
      show(e?.message || "Failed to post", "error");
    } finally {
      setPosting(false);
    }
  };

  // ------- STEP 1: CAPTURE -------
  if (step === "capture") {
    return (
      <View style={styles.container} testID="create-capture">
        <SafeAreaView edges={["top"]} style={styles.captureHeader}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerIconBtn}>
            <Ionicons name="close" size={22} color={COLORS.onBg} />
          </Pressable>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.eyebrow}>new post</Text>
            <Text style={styles.headerTitle}>Report a problem</Text>
          </View>
          <View style={{ width: 40 }} />
        </SafeAreaView>

        <Animated.View entering={FadeIn.duration(400)} style={styles.cameraWrap}>
          {!permission?.granted ? (
            <View style={styles.permBox}>
              <View style={styles.permBadge}>
                <LinearGradient
                  colors={BRAND_GRADIENT as unknown as string[]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Ionicons name="camera" size={26} color="#fff" />
              </View>
              <Text style={styles.permTitle}>Camera access needed</Text>
              <Text style={styles.permBody}>
                We need your camera to capture the civic issue right where it is.
              </Text>
              <GradientButton
                label="Grant camera access"
                onPress={requestPermission}
                testID="grant-camera"
                size="md"
                fullWidth={false}
                icon={<Ionicons name="lock-open" size={16} color="#fff" />}
              />
            </View>
          ) : (
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing}>
              <View style={styles.cameraFrame} />
            </CameraView>
          )}
        </Animated.View>

        <View style={[styles.captureFooter, { paddingBottom: insets.bottom + 96 }]}>
          <Pressable style={styles.roundBtn} onPress={pickGallery} testID="pick-gallery">
            <Ionicons name="images" size={22} color="#fff" />
          </Pressable>

          <Pressable
            style={[styles.shutterOuter, !permission?.granted && { opacity: 0.4 }]}
            onPress={takePhoto}
            disabled={!permission?.granted}
            testID="shutter"
          >
            <LinearGradient
              colors={BRAND_GRADIENT as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shutterInner}
            />
          </Pressable>

          <Pressable
            style={styles.roundBtn}
            onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
            testID="flip"
          >
            <Ionicons name="camera-reverse" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }

  // ------- STEP 2: COMPOSE -------
  return (
    <View style={styles.container} testID="create-compose">
      <SafeAreaView edges={["top"]} style={styles.composeHeader}>
        <Pressable onPress={() => setStep("capture")} hitSlop={8} style={styles.headerIconBtn} testID="back-capture">
          <Ionicons name="chevron-back" size={22} color={COLORS.onBg} />
        </Pressable>
        <Text style={styles.headerTitle}>New Report</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 140, gap: 18 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {image && (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.previewWrap}>
              <Image source={{ uri: image }} style={styles.preview} contentFit="cover" />
              <LinearGradient
                colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]}
                style={StyleSheet.absoluteFill}
              />
              <Pressable style={styles.retake} onPress={() => setStep("capture")} testID="retake">
                <Ionicons name="refresh" size={14} color="#fff" />
                <Text style={styles.retakeText}>Retake</Text>
              </Pressable>
            </Animated.View>
          )}

          <FloatingInput
            label="Describe the problem"
            multiline
            value={description}
            onChangeText={setDescription}
            testID="desc-input"
            errorText={descErr}
          />

          <View>
            <Text style={styles.sectionLabel}>Category</Text>
            <View style={styles.catWrap}>
              {categories.map((c) => (
                <CategoryChip
                  key={c.key}
                  categoryKey={c.key}
                  label={c.label}
                  active={category === c.key}
                  onPress={() => setCategory(c.key)}
                  testID={`cat-${c.key}`}
                />
              ))}
            </View>
          </View>

          <FloatingInput
            label="Tag users (optional)"
            value={tags}
            onChangeText={setTags}
            autoCapitalize="none"
            testID="tags-input"
          />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 92 }]}>
          <LinearGradient
            colors={["rgba(10,10,10,0)", COLORS.bg]}
            style={styles.footerScrim}
            pointerEvents="none"
          />
          <GradientButton
            label={posting ? "Posting…" : "Post to Civic Reels"}
            onPress={submit}
            loading={posting}
            size="lg"
            testID="post-submit"
            icon={<Ionicons name="send" size={16} color="#fff" />}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const { width } = Dimensions.get("window");
const CAM_ASPECT = width - 40;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  captureHeader: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  composeHeader: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  eyebrow: { ...TYPE.label, color: COLORS.brand2, fontSize: 10 },
  headerTitle: { ...TYPE.h3, color: COLORS.onBg, fontSize: 18, marginTop: 2 },
  headerIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center",
  },
  cameraWrap: {
    marginHorizontal: 20, borderRadius: RADIUS.xl, overflow: "hidden",
    backgroundColor: COLORS.surface2, aspectRatio: 3 / 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cameraFrame: {
    position: "absolute", left: 24, top: 24, right: 24, bottom: 24,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", borderRadius: RADIUS.lg,
    borderStyle: "dashed",
  },
  permBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 12 },
  permBadge: {
    width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", overflow: "hidden",
    marginBottom: 4,
  },
  permTitle: { ...TYPE.h3, color: COLORS.onBg, fontSize: 18 },
  permBody: { color: COLORS.onBgMuted, textAlign: "center", fontSize: 14, lineHeight: 20, maxWidth: 260 },
  captureFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    paddingTop: 20, paddingHorizontal: 32,
  },
  roundBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.borderStrong,
    alignItems: "center", justifyContent: "center",
  },
  shutterOuter: {
    width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: "rgba(255,255,255,0.9)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#D946EF", shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 6 },
  },
  shutterInner: { width: 66, height: 66, borderRadius: 33 },
  previewWrap: { borderRadius: RADIUS.xl, overflow: "hidden", aspectRatio: 4 / 3, backgroundColor: COLORS.surface2 },
  preview: { width: "100%", height: "100%" },
  retake: {
    position: "absolute", top: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill, backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
  },
  retakeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  sectionLabel: { ...TYPE.label, color: COLORS.onBgMuted, marginBottom: 10 },
  catWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingHorizontal: 20, paddingTop: 20,
  },
  footerScrim: {
    position: "absolute", left: 0, right: 0, top: -30, height: 50,
  },
});
