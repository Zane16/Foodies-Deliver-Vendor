import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../../supabaseClient';

interface Order {
  id: string;
  customer_id: string;
  vendor_id: string;
  deliverer_id: string | null;
  status: string;
  total_price: number;
  created_at: string;
  delivery_address?: string;
  customer_name?: string;
  customer_phone?: string;
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
    danger: '#EF4444',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
  }
};

export default function DelivererDashboard() {
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<Order[]>([]);
  const [view, setView] = useState<'Available' | 'MyDeliveries'>('Available');
  const [loading, setLoading] = useState(true);
  const [delivererId, setDelivererId] = useState<string | null>(null);

  useEffect(() => {
    initializeDeliverer();
  }, []);

  const initializeDeliverer = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Not logged in');
        return;
      }

      // Get deliverer record
      const { data: delivererData, error: delivererError } = await supabase
        .from('deliverers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (delivererError || !delivererData) {
        Alert.alert('Error', 'Deliverer record not found');
        return;
      }

      setDelivererId(delivererData.id);
      await fetchOrders(delivererData.id);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async (delId: string) => {
    try {
      // Fetch available orders (Ready status, no deliverer assigned)
      const { data: available, error: availableError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'Ready')
        .is('deliverer_id', null);

      if (availableError) throw availableError;

      // Fetch my deliveries (assigned to this deliverer, not completed)
      const { data: myOrders, error: myOrdersError } = await supabase
        .from('orders')
        .select('*')
        .eq('deliverer_id', delId)
        .neq('status', 'Completed');

      if (myOrdersError) throw myOrdersError;

      setAvailableOrders(available as Order[] || []);
      setMyDeliveries(myOrders as Order[] || []);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  useEffect(() => {
    if (!delivererId) return;

    // Real-time subscription
    const subscription = supabase
      .channel('deliverer_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as Order;
          const oldOrder = payload.old as Order;

          if (payload.eventType === 'INSERT' && newOrder.status === 'Ready') {
            setAvailableOrders((prev) => [newOrder, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            // If order is assigned to me
            if (newOrder.deliverer_id === delivererId && newOrder.status !== 'Completed') {
              setMyDeliveries((prev) => {
                const exists = prev.find((o) => o.id === newOrder.id);
                if (exists) {
                  return prev.map((o) => (o.id === newOrder.id ? newOrder : o));
                }
                return [newOrder, ...prev];
              });
              // Remove from available
              setAvailableOrders((prev) => prev.filter((o) => o.id !== newOrder.id));
            }
            // If order is completed, remove from my deliveries
            if (newOrder.status === 'Completed') {
              setMyDeliveries((prev) => prev.filter((o) => o.id !== newOrder.id));
            }
            // If order becomes available again (deliverer unassigned)
            if (newOrder.status === 'Ready' && !newOrder.deliverer_id) {
              setAvailableOrders((prev) => {
                const exists = prev.find((o) => o.id === newOrder.id);
                if (!exists) return [newOrder, ...prev];
                return prev;
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setAvailableOrders((prev) => prev.filter((o) => o.id !== oldOrder.id));
            setMyDeliveries((prev) => prev.filter((o) => o.id !== oldOrder.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [delivererId]);

  const handleAcceptOrder = async (orderId: string) => {
    if (!delivererId) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          deliverer_id: delivererId,
          status: 'Out for Delivery' 
        })
        .eq('id', orderId);

      if (error) throw error;

      // Optimistically update UI
      const order = availableOrders.find((o) => o.id === orderId);
      if (order) {
        setAvailableOrders((prev) => prev.filter((o) => o.id !== orderId));
        setMyDeliveries((prev) => [{ ...order, deliverer_id: delivererId, status: 'Out for Delivery' }, ...prev]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleCompleteDelivery = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'Completed' })
        .eq('id', orderId);

      if (error) throw error;

      // Remove from my deliveries
      setMyDeliveries((prev) => prev.filter((o) => o.id !== orderId));
      Alert.alert('Success', 'Delivery completed!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/auth/login');
  };

  const renderOrderCard = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
          <Text style={styles.orderDate}>
            {new Date(item.created_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          item.status === 'Ready' && styles.statusReady,
          item.status === 'Out for Delivery' && styles.statusDelivering,
        ]}>
          <Text style={[
            styles.statusText,
            item.status === 'Ready' && styles.statusTextReady,
            item.status === 'Out for Delivery' && styles.statusTextDelivering,
          ]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {item.delivery_address && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📍 Delivery Address:</Text>
          <Text style={styles.infoValue}>{item.delivery_address}</Text>
        </View>
      )}

      {item.customer_name && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>👤 Customer:</Text>
          <Text style={styles.infoValue}>{item.customer_name}</Text>
        </View>
      )}

      {item.customer_phone && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📱 Phone:</Text>
          <Text style={styles.infoValue}>{item.customer_phone}</Text>
        </View>
      )}

      <View style={styles.priceContainer}>
        <Text style={styles.priceLabel}>Order Total</Text>
        <Text style={styles.priceValue}>₱{item.total_price.toFixed(2)}</Text>
      </View>

      {/* Action buttons */}
      {view === 'Available' && (
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptOrder(item.id)}
        >
          <Text style={styles.acceptButtonText}>Accept Delivery</Text>
        </TouchableOpacity>
      )}

      {view === 'MyDeliveries' && (
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => handleCompleteDelivery(item.id)}
        >
          <Text style={styles.completeButtonText}>Complete Delivery</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading deliveries...</Text>
      </View>
    );
  }

  const displayOrders = view === 'Available' ? availableOrders : myDeliveries;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🚚 Deliverer Dashboard</Text>
          <Text style={styles.subtitle}>
            {view === 'Available' 
              ? `${availableOrders.length} available order${availableOrders.length !== 1 ? 's' : ''}`
              : `${myDeliveries.length} active deliver${myDeliveries.length !== 1 ? 'ies' : 'y'}`
            }
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📦</Text>
          <View style={styles.statInfo}>
            <Text style={styles.statValue}>{availableOrders.length}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🚴</Text>
          <View style={styles.statInfo}>
            <Text style={styles.statValue}>{myDeliveries.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, view === 'Available' && styles.activeTab]}
          onPress={() => setView('Available')}
        >
          <Text style={[styles.tabText, view === 'Available' && styles.activeTabText]}>
            Available Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'MyDeliveries' && styles.activeTab]}
          onPress={() => setView('MyDeliveries')}
        >
          <Text style={[styles.tabText, view === 'MyDeliveries' && styles.activeTabText]}>
            My Deliveries
          </Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {displayOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>
            {view === 'Available' ? '📦' : '🚴'}
          </Text>
          <Text style={styles.emptyStateTitle}>
            {view === 'Available' ? 'No available orders' : 'No active deliveries'}
          </Text>
          <Text style={styles.emptyStateText}>
            {view === 'Available' 
              ? 'New orders ready for pickup will appear here'
              : 'Orders you accept will show here'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.light.input,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
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
    padding: 16,
    backgroundColor: Colors.light.primaryLight,
    borderRadius: 12,
    gap: 12,
  },
  statIcon: {
    fontSize: 32,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
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
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.light.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 14,
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
  statusReady: {
    backgroundColor: Colors.light.successLight,
  },
  statusDelivering: {
    backgroundColor: Colors.light.infoLight,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextReady: {
    color: Colors.light.success,
  },
  statusTextDelivering: {
    color: Colors.light.info,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.light.text,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
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
  completeButton: {
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
  completeButtonText: {
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