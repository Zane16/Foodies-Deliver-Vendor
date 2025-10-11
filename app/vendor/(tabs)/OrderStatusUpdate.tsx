// app/vendor/OrderStatusUpdate.tsx
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../supabaseClient';


interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  image_url?: string;
  vendorName?: string;
  category_id?: string;
  orgName?: string;
  vendorId?: string;
}

interface Order {
  id: string;
  customer_id: string;
  vendor_id: string;
  deliverer_id: string | null;
  status: string;
  total_price: number;
  created_at: string;
  items: OrderItem[]; // <-- Add this
}


interface Order {
  id: string;
  customer_id: string;
  vendor_id: string;
  deliverer_id: string | null;
  status: string;
  total_price: number;
  created_at: string;
}

interface Props {
  userRole: 'Vendor' | 'Deliverer';
  userId: string;
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
    dangerLight: '#FEE2E2',
    warning: '#F59E0B',
  }
};

const OrderStatusUpdate: React.FC<Props> = ({ userRole, userId }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<'Order' | 'Preparing' | 'Ready'>('Order');

  // Fetch orders
  const fetchOrders = async () => {
    try {
      // Get the current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Not logged in');
        return;
      }

      // In new schema: vendor.id = user.id (vendor IS a profile)
      const vendorId = user.id;

      // Fetch orders for this vendor
      let query = supabase.from('orders').select('*');
      query = query.eq('vendor_id', vendorId);
      
      // Exclude completed orders (they belong in History screen)
      query = query.neq('status', 'completed');

      const { data, error } = await query;
      if (error) throw error;

      setOrders(data as Order[]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Real-time subscription
    const subscription = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as Order;
          const oldOrder = payload.old as Order;

          setOrders((prev) => {
            switch (payload.eventType) {
              case 'INSERT':
                // Only add if not completed
                return newOrder.status !== 'completed'
                  ? [newOrder, ...prev]
                  : prev;
              case 'UPDATE':
                // If updated to completed, remove from active list
                if (newOrder.status === 'completed') {
                  return prev.filter((o) => o.id !== newOrder.id);
                }
                return prev.map((o) =>
                  o.id === newOrder.id ? newOrder : o
                );
              case 'DELETE':
                return prev.filter((o) => o.id !== oldOrder.id);
              default:
                return prev;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // Accept / Decline an order
  const handleAccept = async (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'preparing' } : o))
    );
    await updateOrderStatus(orderId, 'preparing');
  };

  const handleDecline = async (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    await updateOrderStatus(orderId, 'cancelled');
  };

  // Handle status transitions (preparing -> ready -> completed)
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    // If completed, remove immediately from active list
    if (newStatus === 'completed') {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } else {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    }
    await updateOrderStatus(orderId, newStatus);
  };

  // Filter orders based on current view
  const filteredOrders = orders.filter((order) => {
    switch (view) {
      case 'Order':
        return order.status === 'pending';
      case 'Preparing':
        return order.status === 'preparing';
      case 'Ready':
        return order.status === 'ready';
      default:
        return false;
    }
  });

  const renderItem = ({ item }: { item: Order }) => (
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
          item.status === 'pending' && styles.statusPending,
          item.status === 'preparing' && styles.statusPreparing,
          item.status === 'ready' && styles.statusReady,
        ]}>
          <Text style={[
            styles.statusText,
            item.status === 'pending' && styles.statusTextPending,
            item.status === 'preparing' && styles.statusTextPreparing,
            item.status === 'ready' && styles.statusTextReady,
          ]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
  
      <View style={styles.divider} />
  
      {/* NEW: Display each ordered item */}
      <View style={{ marginBottom: 16 }}>
        {item.items.map((orderItem) => (
          <View key={orderItem.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: Colors.light.text }}>{orderItem.name} x{orderItem.quantity}</Text>
            <Text style={{ color: Colors.light.text }}>₱{(orderItem.price * orderItem.quantity).toFixed(2)}</Text>
          </View>
        ))}
      </View>
  
      <View style={styles.priceContainer}>
        <Text style={styles.priceLabel}>Total Amount</Text>
        <Text style={styles.priceValue}>₱{item.total_price.toFixed(2)}</Text>
      </View>
  
      {/* Buttons depending on status */}
      {item.status === 'pending' && view === 'Order' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.declineButton}
            onPress={() => handleDecline(item.id)}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.acceptButton}
            onPress={() => handleAccept(item.id)}
          >
            <Text style={styles.acceptButtonText}>Accept Order</Text>
          </TouchableOpacity>
        </View>
      )}
      {item.status === 'preparing' && view === 'Preparing' && (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => handleStatusChange(item.id, 'ready')}
        >
          <Text style={styles.primaryButtonText}>Mark as Ready</Text>
        </TouchableOpacity>
      )}
      {item.status === 'ready' && view === 'Ready' && (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => handleStatusChange(item.id, 'completed')}
        >
          <Text style={styles.primaryButtonText}>Complete Order</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders Management</Text>
        <Text style={styles.subtitle}>
          {filteredOrders.length} {view.toLowerCase()} order{filteredOrders.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, view === 'Order' && styles.activeTab]}
          onPress={() => setView('Order')}
        >
          <Text style={[styles.tabText, view === 'Order' && styles.activeTabText]}>
            Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'Preparing' && styles.activeTab]}
          onPress={() => setView('Preparing')}
        >
          <Text style={[styles.tabText, view === 'Preparing' && styles.activeTabText]}>
            Preparing
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'Ready' && styles.activeTab]}
          onPress={() => setView('Ready')}
        >
          <Text style={[styles.tabText, view === 'Ready' && styles.activeTabText]}>
            Ready
          </Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📦</Text>
          <Text style={styles.emptyStateTitle}>No orders yet</Text>
          <Text style={styles.emptyStateText}>
            {view === 'Order' && 'New orders will appear here'}
            {view === 'Preparing' && 'Orders being prepared will show here'}
            {view === 'Ready' && 'Ready orders will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

export default OrderStatusUpdate;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
  statusPending: {
    backgroundColor: Colors.light.warning + '20',
  },
  statusPreparing: {
    backgroundColor: Colors.light.primary + '20',
  },
  statusReady: {
    backgroundColor: Colors.light.successLight,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextPending: {
    color: Colors.light.warning,
  },
  statusTextPreparing: {
    color: Colors.light.primary,
  },
  statusTextReady: {
    color: Colors.light.success,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginBottom: 16,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.light.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.danger + '40',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.danger,
  },
  acceptButton: {
    flex: 2,
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
  primaryButton: {
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
  primaryButtonText: {
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