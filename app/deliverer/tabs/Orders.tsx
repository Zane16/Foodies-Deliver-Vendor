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

// Define your color palette to match the design system
const Colors = {
  light: {
    background: '#FAFAFA',
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

const AvailableOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'Ready' | 'Accepted' | 'PickedUp'>('Ready');

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

  // fetch available orders
  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        total_price,
        created_at,
        customer:profiles!fk_orders_customer(full_name)
      `)
      .in("status", ["Ready", "Accepted by Deliverer", "Picked Up"]);

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

    // ✅ Subscribe to real-time changes
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
          fetchOrders(); // refresh list on changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // accept order
  const acceptOrder = async (orderId: string) => {
    if (!user) {
      Alert.alert("Error", "You must be logged in first");
      return;
    }
  
    // 🔍 Fetch role from profiles
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
  
    // ✅ Update the order
    const { error } = await supabase
      .from("orders")
      .update({
        deliverer_id: user.id,
        status: "Accepted by Deliverer",
      })
      .eq("id", orderId)
      .is("deliverer_id", null); // prevent double-claim
  
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Order accepted!");
      fetchOrders();
    }
  };

  // ✨ Update order status
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!user) {
      Alert.alert("Error", "You must be logged in first");
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId)
      .eq("deliverer_id", user.id); // ✅ only this deliverer can update

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", `Order marked as ${newStatus}`);
      fetchOrders();
    }
  };

  // Filter orders based on view
  const filteredOrders = orders.filter((order) => {
    switch (view) {
      case 'Ready':
        return order.status === 'Ready';
      case 'Accepted':
        return order.status === 'Accepted by Deliverer';
      case 'PickedUp':
        return order.status === 'Picked Up';
      default:
        return false;
    }
  });

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

  const renderOrderCard = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
          {item.created_at && (
            <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
          )}
        </View>
        <View style={[
          styles.statusBadge,
          item.status === 'Ready' && styles.statusReady,
          item.status === 'Accepted by Deliverer' && styles.statusAccepted,
          item.status === 'Picked Up' && styles.statusPickedUp,
        ]}>
          <Text style={[
            styles.statusText,
            item.status === 'Ready' && styles.statusTextReady,
            item.status === 'Accepted by Deliverer' && styles.statusTextAccepted,
            item.status === 'Picked Up' && styles.statusTextPickedUp,
          ]}>
            {item.status === 'Accepted by Deliverer' ? 'ACCEPTED' : item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.customerInfo}>
        <Text style={styles.customerLabel}>👤 Customer</Text>
        <Text style={styles.customerName}>
          {item.customer?.[0]?.full_name || 'Unknown Customer'}
        </Text>
      </View>

      <View style={styles.priceContainer}>
        <Text style={styles.priceLabel}>Order Total</Text>
        <Text style={styles.priceValue}>₱{item.total_price.toFixed(2)}</Text>
      </View>

      {/* Action Buttons */}
      {item.status === "Ready" && (
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => acceptOrder(item.id)}
        >
          <Text style={styles.acceptButtonText}>Accept Order</Text>
        </TouchableOpacity>
      )}

      {item.status === "Accepted by Deliverer" && (
        <TouchableOpacity
          style={styles.pickupButton}
          onPress={() => updateOrderStatus(item.id, "Picked Up")}
        >
          <Text style={styles.pickupButtonText}>Mark as Picked Up</Text>
        </TouchableOpacity>
      )}

      {item.status === "Picked Up" && (
        <TouchableOpacity
          style={styles.deliveredButton}
          onPress={() => updateOrderStatus(item.id, "Delivered")}
        >
          <Text style={styles.deliveredButtonText}>Mark as Delivered</Text>
        </TouchableOpacity>
      )}
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚚 Available Orders</Text>
        <Text style={styles.subtitle}>
          {orders.length} active order{orders.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📦</Text>
          <View style={styles.statInfo}>
            <Text style={styles.statValue}>
              {orders.filter(o => o.status === 'Ready').length}
            </Text>
            <Text style={styles.statLabel}>Ready</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>✅</Text>
          <View style={styles.statInfo}>
            <Text style={styles.statValue}>
              {orders.filter(o => o.status === 'Accepted by Deliverer').length}
            </Text>
            <Text style={styles.statLabel}>Accepted</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🚴</Text>
          <View style={styles.statInfo}>
            <Text style={styles.statValue}>
              {orders.filter(o => o.status === 'Picked Up').length}
            </Text>
            <Text style={styles.statLabel}>In Transit</Text>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, view === 'Ready' && styles.activeTab]}
          onPress={() => setView('Ready')}
        >
          <Text style={[styles.tabText, view === 'Ready' && styles.activeTabText]}>
            Ready
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'Accepted' && styles.activeTab]}
          onPress={() => setView('Accepted')}
        >
          <Text style={[styles.tabText, view === 'Accepted' && styles.activeTabText]}>
            Accepted
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'PickedUp' && styles.activeTab]}
          onPress={() => setView('PickedUp')}
        >
          <Text style={[styles.tabText, view === 'PickedUp' && styles.activeTabText]}>
            Picked Up
          </Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>
            {view === 'Ready' ? '📦' : view === 'Accepted' ? '✅' : '🚴'}
          </Text>
          <Text style={styles.emptyStateTitle}>No orders here</Text>
          <Text style={styles.emptyStateText}>
            {view === 'Ready' && 'Orders ready for pickup will appear here'}
            {view === 'Accepted' && 'Orders you accept will show here'}
            {view === 'PickedUp' && 'Orders marked as picked up will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: 20,
    backgroundColor: Colors.light.surface,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: Colors.light.surface,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.light.primaryLight,
    borderRadius: 12,
    gap: 8,
  },
  statIcon: {
    fontSize: 28,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 24,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderId: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusPending: {
    backgroundColor: Colors.light.warningLight,
  },
  statusReady: {
    backgroundColor: Colors.light.successLight,
  },
  statusAccepted: {
    backgroundColor: Colors.light.infoLight,
  },
  statusPickedUp: {
    backgroundColor: Colors.light.successLight,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusTextPending: {
    color: Colors.light.warning,
  },
  statusTextReady: {
    color: Colors.light.success,
  },
  statusTextAccepted: {
    color: Colors.light.info,
  },
  statusTextPickedUp: {
    color: Colors.light.success,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginBottom: 16,
  },
  customerInfo: {
    marginBottom: 16,
  },
  customerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.primaryLight,
    borderRadius: 12,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  acceptButton: {
    height: 48,
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
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pickupButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.light.info,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.info,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pickupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deliveredButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.light.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  deliveredButtonText: {
    fontSize: 16,
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