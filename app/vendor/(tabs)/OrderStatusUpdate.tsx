// app/vendor/OrderStatusUpdate.tsx
import React, { useEffect, useState } from 'react';
import { Alert, Button, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../supabaseClient';

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

const OrderStatusUpdate: React.FC<Props> = ({ userRole, userId }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<'Order' | 'Preparing'>('Order');

  // Fetch orders
  const fetchOrders = async () => {
    try {
      let query = supabase.from('orders').select('*');

      if (userRole === 'Vendor') query = query.eq('vendor_id', userId);
      else if (userRole === 'Deliverer') query = query.eq('deliverer_id', userId);

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
          const updatedOrder = payload.new as Order;
          setOrders((prev) =>
            prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
          );
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

  // Accept / Decline an order (optimistic frontend update)
  const handleAccept = async (orderId: string) => {
    // Optimistically move order to Preparing
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: 'Preparing' } : o
      )
    );
    await updateOrderStatus(orderId, 'Preparing');
  };

  const handleDecline = async (orderId: string) => {
    // Optimistically remove order from current list
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    await updateOrderStatus(orderId, 'Declined');
  };

  // Filter orders based on current view
  const filteredOrders = orders.filter((order) => {
    if (view === 'Order') return order.status === 'Pending';
    if (view === 'Preparing') return order.status === 'Preparing';
    return false;
  });

  const renderItem = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <Text>Order ID: {item.id}</Text>
      <Text>Status: {item.status}</Text>
      <Text>Total: ₱{item.total_price}</Text>

      {view === 'Order' && (
        <View style={styles.buttonRow}>
          <Button title="Accept" onPress={() => handleAccept(item.id)} />
          <Button title="Decline" color="red" onPress={() => handleDecline(item.id)} />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Orders</Text>

      {/* Toggle between Pending and Preparing */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, view === 'Order' && styles.activeTab]}
          onPress={() => setView('Order')}
        >
          <Text style={styles.tabText}>Order</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, view === 'Preparing' && styles.activeTab]}
          onPress={() => setView('Preparing')}
        >
          <Text style={styles.tabText}>Preparing</Text>
        </TouchableOpacity>
      </View>

      {filteredOrders.length === 0 ? (
        <Text style={{ marginTop: 16 }}>No orders in this section.</Text>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={{ marginTop: 8 }}
        />
      )}
    </View>
  );
};

export default OrderStatusUpdate;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  orderCard: {
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#007bff',
  },
  tabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
