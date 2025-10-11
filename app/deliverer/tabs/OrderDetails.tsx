import { router, useLocalSearchParams } from "expo-router"; // Import from expo-router
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../../../supabaseClient";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  total_price: number;
  status: string;
  created_at: string;
  customer_id: string;
  vendor_id: string;
  deliverer_id: string | null;
  customer: Array<{
    full_name: string;
  }>;
  vendor: Array<{
    name: string;
    business_address: string;
  }>;
}

const Colors = {
  light: {
    background: '#F5F5F5',
    surface: '#FFFFFF',
    primary: '#E91E63',
    primaryLight: '#FCE4EC',
    text: '#1F2937',
    textSecondary: '#6B7280',
    icon: '#9CA3AF',
    border: '#E5E7EB',
    input: '#F3F4F6',
    success: '#10B981',
    successLight: '#D1FAE5',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
  }
};

// Remove route and navigation props
const OrderDetails = () => {
  // Get orderId from URL params using useLocalSearchParams
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error.message);
      } else {
        setUser(data.user);
      }
    };
    getUser();
  }, []);

  const fetchOrderDetails = async () => {
    if (!orderId) {
      Alert.alert("Error", "No order ID provided");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        total_price,
        created_at,
        items,
        customer_id,
        vendor_id,
        deliverer_id,
        customer:profiles!fk_orders_customer(full_name),
        vendor:vendors(name, business_address)
      `)
      .eq("id", orderId)
      .single();

    if (error) {
      console.error("Fetch error:", error.message);
      Alert.alert("Error", error.message);
    } else {
      setOrder(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
      
      const channel = supabase
        .channel(`order-${orderId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `id=eq.${orderId}`,
          },
          () => {
            fetchOrderDetails();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [orderId]);

  const acceptOrder = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in first");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      Alert.alert("Error", "Could not fetch user role");
      return;
    }

    if (profile.role !== "deliverer") {
      Alert.alert("Error", "You must be logged in as a Deliverer");
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({
        deliverer_id: user.id,
        status: "Accepted by Deliverer",
      })
      .eq("id", orderId)
      .is("deliverer_id", null);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Order accepted!");
      fetchOrderDetails();
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    if (!user) {
      Alert.alert("Error", "You must be logged in first");
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId)
      .eq("deliverer_id", user.id);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", `Order marked as ${newStatus}`);
      fetchOrderDetails();
    }
  };

  const getStatusProgress = (status: string) => {
    const statuses = ['Ready', 'Accepted by Deliverer', 'Picked Up', 'Delivered'];
    const currentIndex = statuses.findIndex(s =>
      status === 'Accepted' ? s === 'Accepted by Deliverer' : s === status
    );
    return currentIndex + 1;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity
          style={styles.backToOrdersButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backToOrdersText}>Back to Orders</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStep = getStatusProgress(order.status);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.headerRight}>
          <Text style={styles.orderNumber}>#{order.id.slice(0, 8)}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Tracker */}
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <View style={[styles.progressDot, currentStep >= 1 && styles.progressDotActive]}>
              {currentStep > 1 ? (
                <Text style={styles.checkmark}>✓</Text>
              ) : (
                <View style={styles.progressDotInner} />
              )}
            </View>
            <Text style={styles.progressLabel}>Accepted</Text>
          </View>

          <View style={[styles.progressLine, currentStep >= 2 && styles.progressLineActive]} />

          <View style={styles.progressStep}>
            <View style={[styles.progressDot, currentStep >= 2 && styles.progressDotActive]}>
              {currentStep > 2 ? (
                <Text style={styles.checkmark}>✓</Text>
              ) : (
                <View style={styles.progressDotInner} />
              )}
            </View>
            <Text style={styles.progressLabel}>Pickup</Text>
          </View>

          <View style={[styles.progressLine, currentStep >= 3 && styles.progressLineActive]} />

          <View style={styles.progressStep}>
            <View style={[styles.progressDot, currentStep >= 3 && styles.progressDotActive]}>
              {currentStep > 3 ? (
                <Text style={styles.checkmark}>✓</Text>
              ) : (
                <View style={styles.progressDotInner} />
              )}
            </View>
            <Text style={styles.progressLabel}>Delivery</Text>
          </View>
        </View>

        {/* Pickup Location */}
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <Text style={styles.locationTitle}>Pickup Location</Text>
            <View style={styles.preparingBadge}>
              <Text style={styles.preparingText}>Preparing</Text>
            </View>
          </View>
          <View style={styles.locationDetails}>
            <View style={styles.locationImagePlaceholder}>
              <Text style={styles.locationIcon}>🏪</Text>
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationName}>
                {order.vendor?.[0]?.name || 'Vendor'}
              </Text>
              <Text style={styles.locationAddress}>
                {order.vendor?.[0]?.business_address || 'Address not available'}
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Location */}
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>Delivery Location</Text>
          <View style={styles.locationDetails}>
            <View style={styles.locationImagePlaceholder}>
              <Text style={styles.locationIcon}>👤</Text>
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationName}>
                {order.customer?.[0]?.full_name || 'Customer'}
              </Text>
              <Text style={styles.locationAddress}>
                Ateneo De Naga University{'\n'}
                Naga City, Camarines Sur
              </Text>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items && order.items.map((item: OrderItem, index: number) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>
                  {item.name} ({item.id.slice(0, 6)})
                </Text>
                <Text style={styles.itemQuantity}>x{item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>
                ₱{(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalPrice}>₱{order.total_price.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Button */}
      <View style={styles.footer}>
        {order.status === "Ready" && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={acceptOrder}
          >
            <Text style={styles.actionButtonText}>Accept Order</Text>
          </TouchableOpacity>
        )}
        {order.status === "Accepted by Deliverer" && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => updateOrderStatus("Picked Up")}
          >
            <Text style={styles.actionButtonText}>Mark as Picked Up</Text>
          </TouchableOpacity>
        )}
        {order.status === "Picked Up" && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => updateOrderStatus("Delivered")}
          >
            <Text style={styles.actionButtonText}>Mark as Delivered</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default OrderDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.light.icon,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontWeight: '500',
    marginBottom: 20,
  },
  backToOrdersButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.light.primary,
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
    backgroundColor: '#4A2C4D',
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
    justifyContent: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressDotActive: {
    backgroundColor: Colors.light.success,
  },
  progressDotInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.light.surface,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.light.border,
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: Colors.light.success,
  },
  locationCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  preparingBadge: {
    backgroundColor: Colors.light.warningLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  preparingText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.warning,
  },
  locationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationIcon: {
    fontSize: 28,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  itemsCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
    flex: 1,
  },
  itemQuantity: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500',
    marginLeft: 8,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  footer: {
    backgroundColor: Colors.light.surface,
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  actionButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});