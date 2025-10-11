import { router } from "expo-router"; // Import router from expo-router
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../../../supabaseClient";

interface Order {
  id: string;
  items?: any[];
  total_price: number;
  status: string;
  created_at?: string;
  customer: Array<{
    full_name: string;
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

// Remove navigation prop since we're using Expo Router
const AvailableOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
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

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        total_price,
        created_at,
        customer:profiles!orders_customer_id_fkey(full_name)
      `)
      .in("status", ["ready", "accepted", "on_the_way"]);

    if (error) {
      console.error("Fetch error:", error.message);
      Alert.alert("Error", error.message);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel("orders-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const acceptOrder = async (orderId: string) => {
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
        status: "accepted",
      })
      .eq("id", orderId)
      .is("deliverer_id", null);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Order accepted!");
      fetchOrders();
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return Colors.light.success;
      case 'accepted':
        return Colors.light.info;
      case 'on_the_way':
        return Colors.light.warning;
      default:
        return Colors.light.textSecondary;
    }
  };

  const renderOrderCard = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      {/* Header with customer name and status */}
      <View style={styles.cardHeader}>
        <View style={styles.customerSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {item.customer?.[0]?.full_name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>
              {item.customer?.[0]?.full_name || 'Unknown Customer'}
            </Text>
            <Text style={styles.orderTime}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
      </View>

      {/* Order summary */}
      <View style={styles.orderSummary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Order ID</Text>
          <Text style={styles.summaryValue}>#{item.id.slice(0, 8)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.priceText}>₱{item.total_price.toFixed(2)}</Text>
        </View>
      </View>

      {/* Status badge */}
      <View style={styles.statusBadgeContainer}>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
          <View style={[styles.statusDotSmall, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status === 'on_the_way' ? 'On the Way' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => {
            // Use router.push for Expo Router navigation
            router.push({
              pathname: '/deliverer/tabs/OrderDetails',
              params: { orderId: item.id }
            });
          }}
        >
          <Text style={styles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>
        {item.status === "ready" && (
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => acceptOrder(item.id)}
          >
            <Text style={styles.acceptButtonText}>Accept Order</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  // Separate orders by status
  const readyOrders = orders.filter(o => o.status === 'ready');
  const acceptedOrders = orders.filter(o => o.status === 'accepted');
  const pickedUpOrders = orders.filter(o => o.status === 'on_the_way');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Accept Orders</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={styles.statBadge}>
              <Text style={styles.statNumber}>{readyOrders.length}</Text>
            </View>
            <Text style={styles.statLabel}>Today's Earnings</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statBadge}>
              <Text style={styles.statNumber}>{acceptedOrders.length + pickedUpOrders.length}</Text>
            </View>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statBadge}>
              <Text style={styles.statNumber}>4.8</Text>
            </View>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>
      </View>

      {/* Orders section */}
      <View style={styles.ordersSection}>
        <Text style={styles.sectionTitle}>Available Orders</Text>
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📦</Text>
            <Text style={styles.emptyStateTitle}>No orders available</Text>
            <Text style={styles.emptyStateText}>
              New orders will appear here when they're ready for pickup
            </Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            renderItem={renderOrderCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
};

export default AvailableOrders;

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
  header: {
    backgroundColor: '#4A2C4D',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A2C4D',
  },
  statLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  ordersSection: {
    flex: 1,
    marginTop: -12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  orderCard: {
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
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  orderTime: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '400',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  orderSummary: {
    backgroundColor: Colors.light.input,
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
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    color: Colors.light.text,
    fontWeight: '600',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.primary,
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
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  acceptButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButtonText: {
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
    color: Colors.light.text,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});