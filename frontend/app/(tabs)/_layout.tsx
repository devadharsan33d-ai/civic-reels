import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Platform, Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { BRAND_GRADIENT, COLORS, RADIUS } from "@/src/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Premium bottom tab bar
 * - Glass background (BlurView on iOS, translucent surface on Android)
 * - Floating gradient FAB replaces the middle tab visually
 * - Active state uses a small gradient underline dot
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: COLORS.onBgDim,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: "transparent",
          height: 76 + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            {Platform.OS === "ios" ? (
              <BlurView tint="dark" intensity={80} style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,10,12,0.94)" }]} />
            )}
            <View style={styles.topBorder} />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="film" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="search" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          tabBarIcon: () => <FabIcon />,
          tabBarButton: (props) => (
            <Pressable
              testID="tab-create"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                router.push("/(tabs)/create");
              }}
              style={styles.fabButton}
            >
              <FabIcon />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="search-alt"
        options={{
          // hidden — kept only if you route explicitly
          href: null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="person-circle" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ icon, focused }: { icon: any; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Ionicons name={icon} size={26} color={focused ? "#fff" : COLORS.onBgDim} />
      {focused ? (
        <LinearGradient
          colors={BRAND_GRADIENT as unknown as string[]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.activeDot}
        />
      ) : <View style={styles.dotPlaceholder} />}
    </View>
  );
}

function FabIcon() {
  return (
    <View style={styles.fabWrap}>
      <LinearGradient
        colors={BRAND_GRADIENT as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fab}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  topBorder: {
    position: "absolute", top: 0, left: 0, right: 0, height: 1,
    backgroundColor: COLORS.border,
  },
  iconWrap: { alignItems: "center", justifyContent: "center", width: 60, gap: 4 },
  activeDot: { width: 20, height: 3, borderRadius: 2 },
  dotPlaceholder: { height: 3 },
  fabButton: {
    flex: 1, alignItems: "center", justifyContent: "center",
  },
  fabWrap: {
    marginTop: -22,
    shadowColor: "#7C3AED",
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  fab: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(10,10,10,0.9)",
  },
});
