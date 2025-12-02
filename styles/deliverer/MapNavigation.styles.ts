import { StyleSheet } from "react-native";
import { Colors } from "../../constants/Colors";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.surfaceSecondary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.error,
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // Header - Dark Navy (matches app header)
  header: {
    backgroundColor: Colors.light.header, // Dark navy #1E293B
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: Colors.light.headerText, // White
    fontWeight: "600",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.headerText, // White
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#CBD5E1", // Lighter white/grey
    fontWeight: "500",
  },

  // Stats Bar (White card with clean design)
  statsBar: {
    backgroundColor: Colors.light.surface,
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text, // Dark slate
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary, // Gray
    fontWeight: "500",
    textTransform: "capitalize",
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 4,
  },

  // Map
  map: {
    flex: 1,
  },

  // Turn Instruction Card (Clean white card)
  instructionCard: {
    position: "absolute",
    bottom: 140,
    left: 16,
    right: 16,
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  instructionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.light.infoLight, // Light blue background
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  instructionIconText: {
    fontSize: 24,
  },
  instructionContent: {
    flex: 1,
  },
  instructionText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 4,
    lineHeight: 22,
  },
  instructionDistance: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },

  // Action Buttons (Match app color scheme)
  buttonContainer: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    gap: 12,
  },
  photoButton: {
    backgroundColor: Colors.light.primary, // Purple #5B5FDE
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  deliveredButton: {
    backgroundColor: Colors.light.success, // Green #10B981
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: Colors.light.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
