import { Platform, StyleSheet } from 'react-native';
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
    color: '#6B7280', // TEST: Medium gray
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#6366F1', // TEST: Purple header (brand color)
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profilePicture: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profilePicturePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profilePicturePlaceholderText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  delivererGreeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  statusBadgeOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6bbaa3', // TEST: Soft Green for "Available" badge
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    alignSelf: 'flex-start',
  },
  statusDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF', // TEST: White dot on soft green
    shadowColor: '#6bbaa3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusTextOnline: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ordersSection: {
    flex: 1,
    marginTop: -12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827', // TEST: Dark Gray
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: '#FFFFFF', // TEST: Clean white card
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB', // TEST: Light Gray border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  foodImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  foodImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F9FAFB', // TEST: Light gray
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodImageEmoji: {
    fontSize: 28,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827', // TEST: Dark Gray
    marginBottom: 4,
  },
  customerNameSmall: {
    fontSize: 13,
    color: '#6B7280', // TEST: Medium Gray
    marginBottom: 3,
  },
  distanceText: {
    fontSize: 12,
    color: '#6B7280', // TEST: Medium Gray
    marginBottom: 3,
  },
  addressText: {
    fontSize: 12,
    color: '#6B7280', // TEST: Medium Gray
    lineHeight: 16,
  },
  priceContainer: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827', // TEST: Dark Gray
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#6B7280', // TEST: Medium Gray
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB', // TEST: Light Gray
    marginVertical: 14,
  },
  customerAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 12,
  },
  customerAvatarPlaceholder: {
    backgroundColor: '#E5E7EB', // TEST: Light gray avatar
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280', // TEST: Medium gray text
  },
  customerDetails: {
    flex: 1,
  },
  customerNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827', // TEST: Dark Gray
    marginBottom: 3,
  },
  customerPhone: {
    fontSize: 13,
    color: '#6B7280', // TEST: Medium Gray
    marginBottom: 2,
  },
  customerAddress: {
    fontSize: 13,
    color: '#6B7280', // TEST: Medium Gray
    lineHeight: 18,
  },
  itemsSection: {
    marginBottom: 0,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  itemImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F9FAFB', // TEST: Light gray
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemImageEmoji: {
    fontSize: 24,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: '#111827', // TEST: Dark Gray
    fontWeight: '600',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#6B7280', // TEST: Medium Gray
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827', // TEST: Dark Gray
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB', // TEST: Light gray background
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB', // TEST: Light Gray border
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280', // TEST: Medium Gray
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#6bbaa3', // TEST: Soft Green for earnings
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB', // TEST: Light gray avatar
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB', // TEST: Border
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6B7280', // TEST: Medium gray text
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827', // TEST: Dark Gray
    marginBottom: 2,
  },
  orderTime: {
    fontSize: 13,
    color: '#6B7280', // TEST: Medium Gray
    fontWeight: '400',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  orderSummary: {
    backgroundColor: '#F9FAFB', // TEST: Light gray
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280', // TEST: Medium Gray
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    color: '#111827', // TEST: Dark Gray
    fontWeight: '600',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366F1', // TEST: Primary Purple
  },
  statusBadgeContainer: {
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  detailsButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#14B8A6', // TEST: Teal (secondary action)
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF', // TEST: White text on teal
  },
  acceptButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#6366F1', // TEST: Primary Purple
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: '#9CA3AF', // TEST: Light Gray for disabled
    opacity: 0.6,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  navigateButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#14B8A6', // Teal for navigation
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827', // TEST: Dark Gray
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280', // TEST: Medium Gray
    textAlign: 'center',
    lineHeight: 20,
  },
});
