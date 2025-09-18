// app/vendor/order-history.tsx
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../../supabaseClient';

interface Order {
  id: string;
  customer_id: string;
  vendor_id: string;
  deliverer_id: string | null;
  items: any;
  total_price: number;
  status: string;
  created_at: string;
}

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompletedOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'Completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data as Order[]);
    } catch (err: any) {
      console.error('Error fetching completed orders:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletedOrders();

    // Subscribe to real-time updates for orders
    const subscription = supabase
      .channel('orders-history')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as Order;

          setOrders((prev) => {
            if (newOrder.status === 'Completed') {
              // ✅ Add or update the order in history
              const exists = prev.some((o) => o.id === newOrder.id);
              if (exists) {
                return prev.map((o) =>
                  o.id === newOrder.id ? newOrder : o
                );
              } else {
                return [newOrder, ...prev];
              }
            } else {
              // ✅ If the order is no longer Completed, remove it
              return prev.filter((o) => o.id !== newOrder.id);
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const renderItem = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <Text style={styles.orderId}>Order ID: {item.id}</Text>
      <Text>Total: ₱{item.total_price}</Text>
      <Text>Completed on: {new Date(item.created_at).toLocaleString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order History</Text>

      {loading ? (
        <Text>Loading...</Text>
      ) : orders.length === 0 ? (
        <Text>No completed orders yet.</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={{ marginTop: 8 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  orderCard: {
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  orderId: { fontWeight: 'bold', marginBottom: 4 },
});
