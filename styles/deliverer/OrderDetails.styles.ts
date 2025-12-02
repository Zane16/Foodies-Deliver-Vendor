import { StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', // TEST: Warm Gray background
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280', // TEST: Medium Gray
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280', // TEST: Medium Gray
    fontWeight: '500',
    marginBottom: 20,
  },
  backToOrdersButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#6366F1', // TEST: Purple primary
    borderRadius: 12,
  },
  backToOrdersText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6366F1', // TEST: Purple header (brand color)
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  orderNumber: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF', // TEST: Clean white card
    paddingVertical: 16,
    marginBottom: 20,
    borderRadius: 12,
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressLabel: {
    fontSize: 13,
    color: '#6B7280', // TEST: Medium Gray
    fontWeight: '500',
  },
  progressLabelActive: {
    color: '#111827', // TEST: Dark Gray
    fontWeight: '600',
  },
  locationSection: {
    backgroundColor: '#FFFFFF', // TEST: Clean white card
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB', // TEST: Light Gray border
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827', // TEST: Dark Gray
  },
  navigateButtonSmall: {
    backgroundColor: '#14B8A6', // TEST: Teal (secondary action)
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  navigateButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827', // TEST: Dark Gray
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 12,
    color: '#6B7280', // TEST: Medium Gray
    lineHeight: 16,
  },
  statusContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#6B7280', // TEST: Medium Gray
    textAlign: 'center',
    lineHeight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  preparingBadge: {
    backgroundColor: '#FEF3C7', // TEST: Warning light (amber)
  },
  readyBadge: {
    backgroundColor: '#6bbaa3', // TEST: Soft Green for ready/success
  },
  readyBadgeText: {
    color: '#FFFFFF', // TEST: White text on soft green
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827', // TEST: Dark Gray
  },
  statusDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#E5E7EB', // TEST: Light gray avatar
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB', // TEST: Border
  },
  locationIcon: {
    fontSize: 28,
  },
  locationInfo: {
    flex: 1,
  },
  orderItemsSection: {
    backgroundColor: '#FFFFFF', // TEST: Clean white card
    padding: 16,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB', // TEST: Light Gray border
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827', // TEST: Dark Gray
    marginBottom: 12,
  },
  simpleItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  simpleItemText: {
    fontSize: 13,
    color: '#111827', // TEST: Dark Gray
    flex: 1,
  },
  simpleItemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827', // TEST: Dark Gray
  },
  dividerSimple: {
    height: 1,
    backgroundColor: '#E5E7EB', // TEST: Light Gray border
    marginVertical: 12,
  },
  totalRowSimple: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  totalLabelSimple: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827', // TEST: Dark Gray
  },
  totalPriceSimple: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366F1', // TEST: Purple for price emphasis
  },
  footer: {
    backgroundColor: '#FFFFFF', // TEST: Clean white footer
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB', // TEST: Light Gray border
  },
  actionButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#6366F1', // TEST: Purple primary action
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonDisabled: {
    backgroundColor: '#9CA3AF', // TEST: Light Gray for disabled
    shadowOpacity: 0.1,
  },
  actionButtonNavigation: {
    backgroundColor: '#14B8A6', // Teal color for navigation
    shadowColor: '#14B8A6',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
