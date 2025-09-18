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
  const [view, setView] = useState<'Order' | 'Preparing' | 'Ready'>('Order');

  // Fetch orders
  // Fetch orders
const fetchOrders = async () => {
  try {
    // Get the current authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'Not logged in');
      return;
    }

    // Find the vendor record that matches this logged-in user
    const { data: vendorData, error: vendorError } = await supabase
      .from('vendors')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (vendorError || !vendorData) {
      Alert.alert('Error', 'Vendor record not found');
      return;
    }

    // Now vendorData.id is the actual vendor_id in orders table
    let query = supabase.from('orders').select('*');
    query = query.eq('vendor_id', vendorData.id);
    
    // Exclude completed orders (they belong in History screen)
    query = query.neq('status', 'Completed');

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
                return newOrder.status !== 'Completed'
                  ? [newOrder, ...prev]
                  : prev;
              case 'UPDATE':
                // If updated to Completed, remove from active list
                if (newOrder.status === 'Completed') {
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
      prev.map((o) => (o.id === orderId ? { ...o, status: 'Preparing' } : o))
    );
    await updateOrderStatus(orderId, 'Preparing');
  };

  const handleDecline = async (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    await updateOrderStatus(orderId, 'Declined');
  };

  // Handle status transitions (Preparing -> Ready -> Completed)
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    // If completed, remove immediately from active list
    if (newStatus === 'Completed') {
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
        return order.status === 'Pending';
      case 'Preparing':
        return order.status === 'Preparing';
      case 'Ready':
        return order.status === 'Ready';
      default:
        return false;
    }
  });

  const renderItem = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <Text>Order ID: {item.id}</Text>
      <Text>Status: {item.status}</Text>
      <Text>Total: ₱{item.total_price}</Text>

      {/* Buttons depending on status */}
      {item.status === 'Pending' && view === 'Order' && (
        <View style={styles.buttonRow}>
          <Button title="Accept" onPress={() => handleAccept(item.id)} />
          <Button title="Decline" color="red" onPress={() => handleDecline(item.id)} />
        </View>
      )}
      {item.status === 'Preparing' && view === 'Preparing' && (
        <Button
          title="Mark Ready"
          onPress={() => handleStatusChange(item.id, 'Ready')}
        />
      )}
      {item.status === 'Ready' && view === 'Ready' && (
        <Button
          title="Complete"
          onPress={() => handleStatusChange(item.id, 'Completed')}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Orders</Text>

      {/* Toggle between views */}
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
        <TouchableOpacity
          style={[styles.tabButton, view === 'Ready' && styles.activeTab]}
          onPress={() => setView('Ready')}
        >
          <Text style={styles.tabText}>Ready</Text>
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
