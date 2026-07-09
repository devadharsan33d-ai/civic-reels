import { Platform } from "react-native";

// Civic Reels — premium theme
export const COLORS = {
  bg: "#0A0A0A",
  surface: "#111114",
  surface2: "#17171B",
  surface3: "#1F1F24",
  onBg: "#F5F5F7",
  onBgMuted: "#A0A0A6",
  onBgDim: "#6B6B72",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  divider: "rgba(255,255,255,0.06)",
  overlay: "rgba(0,0,0,0.55)",

  // Brand gradient stops
  brand1: "#7C3AED",   // violet-600
  brand2: "#D946EF",   // fuchsia-500
  brand3: "#F97316",   // orange-500

  success: "#10B981",
  successBg: "rgba(16,185,129,0.12)",
  error: "#F43F5E",
  errorBg: "rgba(244,63,94,0.12)",
  warning: "#F59E0B",
  info: "#38BDF8",
};

export const BRAND_GRADIENT = ["#7C3AED", "#D946EF", "#F97316"] as const;
export const BRAND_GRADIENT_SOFT = ["rgba(124,58,237,0.35)", "rgba(217,70,239,0.25)", "rgba(249,115,22,0.2)"] as const;

export const CATEGORY_GRADIENTS: Record<string, readonly [string, string]> = {
  electricity: ["#FBBF24", "#F97316"],
  water: ["#60A5FA", "#22D3EE"],
  road: ["#A1A1AA", "#3F3F46"],
  pollution: ["#34D399", "#14B8A6"],
  traffic: ["#EF4444", "#E11D48"],
  corruption: ["#A855F7", "#6366F1"],
  wastage: ["#F59E0B", "#B45309"],
  sanitation: ["#2DD4BF", "#0F766E"],
  safety: ["#FB7185", "#E11D48"],
  other: ["#525252", "#262626"],
};

export const CATEGORY_ICONS: Record<string, any> = {
  electricity: "flash",
  water: "water",
  road: "car",
  pollution: "cloud",
  wastage: "trash",
  sanitation: "medkit",
  traffic: "warning",
  safety: "shield",
  corruption: "alert-circle",
  other: "ellipsis-horizontal",
};

export const RADIUS = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 };

// System-font stack that reads as premium modern
export const FONT = {
  display: Platform.select({ ios: "System", android: "sans-serif", default: "System" }) as string,
  body: Platform.select({ ios: "System", android: "sans-serif", default: "System" }) as string,
};

export const TYPE = {
  display: { fontFamily: FONT.display, fontWeight: "900" as const, letterSpacing: -1.2 },
  h1: { fontFamily: FONT.display, fontWeight: "800" as const, letterSpacing: -0.8 },
  h2: { fontFamily: FONT.display, fontWeight: "700" as const, letterSpacing: -0.4 },
  h3: { fontFamily: FONT.display, fontWeight: "700" as const, letterSpacing: -0.2 },
  label: { fontFamily: FONT.body, fontWeight: "700" as const, letterSpacing: 1.6, textTransform: "uppercase" as const, fontSize: 11 },
  body: { fontFamily: FONT.body, fontWeight: "500" as const, letterSpacing: 0.1 },
  bodySemi: { fontFamily: FONT.body, fontWeight: "600" as const, letterSpacing: 0.1 },
};

export const SHADOW = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  glow: {
    shadowColor: "#D946EF",
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
};

export function categoryGradient(key: string) {
  return CATEGORY_GRADIENTS[key] || CATEGORY_GRADIENTS.other;
}

export function categoryIcon(key: string) {
  return CATEGORY_ICONS[key] || "ellipsis-horizontal";
}
