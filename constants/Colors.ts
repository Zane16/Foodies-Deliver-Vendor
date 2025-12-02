/**
 * Modern color palette for Foodies app - Neutral-first with strategic purple accents
 * Purple used ONLY for primary CTAs and active states - max 2-3 elements per screen
 * Dark neutral headers, light gray backgrounds, white cards
 */

const purpleAccent = "#5B5FDE" // Purple - ONLY for primary CTAs and active states
const purpleLight = "#7C7FE5" // Lighter purple for hover states
const purpleDark = "#4A4DB8" // Darker purple for pressed states

// Dark neutrals for headers/navigation
const darkNavy = "#1E293B" // Primary header color
const darkCharcoal = "#2D3748" // Alternative dark neutral
const darkSlate = "#1A202C" // Darkest neutral option

export const Colors = {
  light: {
    // Text colors
    text: "#1A202C", // Rich dark slate for primary text
    textSecondary: "#6B7280", // Gray for secondary text
    textTertiary: "#9CA3AF", // Light gray for tertiary text

    // Backgrounds
    background: "#F7F7F7", // Light gray main background
    surface: "#FFFFFF", // Pure white for cards
    surfaceSecondary: "#F9FAFB", // Very light gray for secondary surfaces

    // Headers and navigation
    header: darkNavy, // Dark neutral for headers (NOT purple)
    headerText: "#FFFFFF", // White text on dark headers

    // Borders and dividers
    border: "#E5E7EB", // Light gray border
    borderDark: "#D1D5DB", // Slightly darker border
    divider: "#E5E7EB",

    // Form inputs
    input: "#FFFFFF", // White input background
    inputBorder: "#D1D5DB", // Gray input border
    placeholder: "#9CA3AF",

    // Icons
    icon: "#6B7280", // Neutral gray for icons
    iconLight: "#9CA3AF", // Light gray icons

    // Tab navigation
    tabIconDefault: "#9CA3AF",
    tabIconSelected: purpleAccent, // Purple ONLY for selected tab
    tabBackground: "#FFFFFF",

    // Primary actions - Purple (use sparingly!)
    primary: purpleAccent, // ONLY for primary CTAs
    primaryLight: purpleLight,
    primaryDark: purpleDark,
    primaryHover: purpleLight,
    tint: purpleAccent,

    // Secondary actions - Gray with borders (NOT purple)
    secondary: "#FFFFFF", // White background
    secondaryBorder: "#D1D5DB", // Gray border
    secondaryText: "#6B7280", // Gray text
    secondaryHover: "#F9FAFB", // Light gray hover

    // Status colors (semantic - NOT purple)
    success: "#10B981", // Green for success/available
    successLight: "#D1FAE5",
    successDark: "#059669",

    warning: "#F59E0B", // Orange/yellow for in-progress
    warningLight: "#FEF3C7",
    warningDark: "#D97706",

    error: "#EF4444", // Red for errors/danger
    errorLight: "#FEE2E2",
    errorDark: "#DC2626",
    danger: "#EF4444",
    dangerLight: "#FEE2E2",

    info: "#3B82F6", // Blue for info (NOT purple)
    infoLight: "#DBEAFE",
    infoDark: "#2563EB",

    // Avatars and profiles
    avatarBackground: "#E5E7EB", // Light gray (NOT purple)
    avatarBorder: "#D1D5DB",

    // Shadows
    shadow: "rgba(0, 0, 0, 0.08)", // Neutral shadow (no purple tint)
    shadowMedium: "rgba(0, 0, 0, 0.12)",
    shadowStrong: "rgba(0, 0, 0, 0.16)",
    cardShadow: "rgba(0, 0, 0, 0.06)", // Subtle neutral shadow
  },
  dark: {
    // Text colors
    text: "#F8FAFC",
    textSecondary: "#94A3B8",
    textTertiary: "#64748B",

    // Backgrounds
    background: "#0F172A",
    surface: "#1E293B",
    surfaceSecondary: "#1A2332",

    // Headers and navigation
    header: "#0B1120",
    headerText: "#F8FAFC",

    // Borders and dividers
    border: "#334155",
    borderDark: "#475569",
    divider: "#334155",

    // Form inputs
    input: "#1E293B",
    inputBorder: "#475569",
    placeholder: "#64748B",

    // Icons
    icon: "#94A3B8",
    iconLight: "#64748B",

    // Tab navigation
    tabIconDefault: "#64748B",
    tabIconSelected: purpleLight,
    tabBackground: "#1E293B",

    // Primary actions - Purple
    primary: purpleLight,
    primaryLight: "#818CF8",
    primaryDark: purpleAccent,
    primaryHover: "#818CF8",
    tint: purpleLight,

    // Secondary actions - Gray
    secondary: "#1E293B",
    secondaryBorder: "#475569",
    secondaryText: "#94A3B8",
    secondaryHover: "#2D3B4F",

    // Status colors
    success: "#10B981",
    successLight: "#065F46",
    successDark: "#059669",

    warning: "#F59E0B",
    warningLight: "#78350F",
    warningDark: "#D97706",

    error: "#EF4444",
    errorLight: "#7F1D1D",
    errorDark: "#DC2626",
    danger: "#EF4444",
    dangerLight: "#7F1D1D",

    info: "#3B82F6",
    infoLight: "#1E3A8A",
    infoDark: "#2563EB",

    // Avatars and profiles
    avatarBackground: "#334155",
    avatarBorder: "#475569",

    // Shadows
    shadow: "rgba(0, 0, 0, 0.3)",
    shadowMedium: "rgba(0, 0, 0, 0.4)",
    shadowStrong: "rgba(0, 0, 0, 0.5)",
    cardShadow: "rgba(0, 0, 0, 0.2)",
  },
}
