/**
 * Modern color palette for Foodies app - white, black, and indigo theme
 * Inspired by contemporary 2025 mobile app design trends
 */

const indigoAccent = "#4F46E5" // Modern indigo
const indigoLight = "#6366F1" // Lighter indigo for interactions
const indigoDark = "#3730A3" // Darker indigo for depth

export const Colors = {
  light: {
    text: "#0F172A", // Rich black for text
    background: "#FFFFFF", // Pure white background
    surface: "#F8FAFC", // Subtle off-white for cards
    tint: indigoAccent,
    icon: "#64748B", // Neutral gray for icons
    tabIconDefault: "#94A3B8",
    tabIconSelected: indigoAccent,
    border: "#E2E8F0", // Light border
    input: "#F1F5F9", // Input background
    placeholder: "#94A3B8", // Placeholder text
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    primary: indigoAccent,
    primaryLight: indigoLight,
    primaryDark: indigoDark,
    shadow: "rgba(15, 23, 42, 0.1)",
  },
  dark: {
    text: "#F8FAFC",
    background: "#0F172A",
    surface: "#1E293B",
    tint: indigoLight,
    icon: "#94A3B8",
    tabIconDefault: "#64748B",
    tabIconSelected: indigoLight,
    border: "#334155",
    input: "#1E293B",
    placeholder: "#64748B",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    primary: indigoLight,
    primaryLight: "#818CF8",
    primaryDark: indigoAccent,
    shadow: "rgba(0, 0, 0, 0.3)",
  },
}
