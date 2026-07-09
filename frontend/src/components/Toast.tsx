import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOW } from "@/src/theme";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

type Ctx = { show: (message: string, kind?: ToastKind) => void };
const ToastCtx = createContext<Ctx>({ show: () => {} });

export function useToast() { return useContext(ToastCtx); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<any>(null);

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    setToast({ id: Date.now(), kind, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 15 }).start();
    timerRef.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        setToast(null);
      });
    }, 2400);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast, anim]);

  const kindStyles = toast?.kind === "success"
    ? { bg: COLORS.successBg, color: COLORS.success, icon: "checkmark-circle" as const }
    : toast?.kind === "error"
    ? { bg: COLORS.errorBg, color: COLORS.error, icon: "alert-circle" as const }
    : { bg: "rgba(56,189,248,0.14)", color: COLORS.info, icon: "information-circle" as const };

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrap,
            {
              opacity: anim,
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
              ],
            },
          ]}
        >
          <View style={[styles.card, { backgroundColor: kindStyles.bg }]}>
            <Ionicons name={kindStyles.icon} size={18} color={kindStyles.color} />
            <Text style={styles.msg}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 20, right: 20, top: 60,
    alignItems: "center",
    zIndex: 9999,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    ...SHADOW.card,
    backgroundColor: COLORS.surface2,
    maxWidth: 500,
  },
  msg: { color: COLORS.onBg, fontSize: 14, fontWeight: "600", flexShrink: 1 },
});
