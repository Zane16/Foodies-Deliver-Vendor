// app/vendor/order-history.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../supabaseClient';
import { styles } from '../../../styles/vendor/order-history.styles';
import { Colors } from '../../../constants/Colors';

interface OrderItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customer_id: string;
  vendor_id: string;
  deliverer_id: string | null;
  items: OrderItem[];
  total_price: number;
  delivery_fee?: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  customer_name: string | null;
  delivery_address: string | null;
  customer?: {
    full_name: string;
    profile_picture_url: string | null;
  };
}

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState<string | null>(null);

  useEffect(() => {
    const getVendorId = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error getting user:', error);
        return;
      }
      if (user) {
        setVendorId(user.id);
      }
    };
    getVendorId();
  }, []);

  const fetchCompletedOrders = async () => {
    if (!vendorId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:profiles!orders_customer_id_fkey(
            full_name,
            profile_picture_url
          )
        `)
        .eq('vendor_id', vendorId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Normalize customer data (may come as array)
      const normalizedOrders = (data || []).map(order => ({
        ...order,
        customer: Array.isArray(order.customer) ? order.customer[0] : order.customer,
      }));

      setOrders(normalizedOrders as Order[]);
    } catch (err: any) {
      console.error('Error fetching completed orders:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!vendorId) return;

    fetchCompletedOrders();

    // Subscribe to real-time updates for orders
    const subscription = supabase
      .channel('orders-history')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as Order;

          // Only process orders for this vendor
          if (newOrder.vendor_id !== vendorId) return;

          setOrders((prev) => {
            if (newOrder.status === 'completed') {
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
              // ✅ If the order is no longer completed, remove it
              return prev.filter((o) => o.id !== newOrder.id);
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [vendorId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffInDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffInDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const renderItem = ({ item }: { item: Order }) => {
    const itemCount = Array.isArray(item.items)
      ? item.items.reduce((sum, orderItem) => sum + (orderItem.quantity || 1), 0)
      : 0;

    return (
      <View style={styles.orderCard}>
        {/* Header Section */}
        <View style={styles.orderHeader}>
          <View style={styles.customerSection}>
            {item.customer?.profile_picture_url ? (
              <Image
                source={{ uri: item.customer.profile_picture_url }}
                style={styles.customerProfilePicture}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.customerIcon}>
                <Ionicons name="person" size={20} color={Colors.light.primary} />
              </View>
            )}
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{item.customer?.full_name || item.customer_name || 'Customer'}</Text>
              <Text style={styles.orderDate}>{formatDate(item.completed_at || item.created_at)}</Text>
            </View>
          </View>
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.light.success} />
            <Text style={styles.statusText}>Completed</Text>
          </View>
        </View>

        {/* Items Section */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <Ionicons name="restaurant-outline" size={16} color={Colors.light.textSecondary} />
            <Text style={styles.itemsCount}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Text>
          </View>
          <View style={styles.itemsList}>
            {Array.isArray(item.items) && item.items.slice(0, 3).map((orderItem, index) => (
              <Text key={index} style={styles.itemText} numberOfLines={1}>
                {orderItem.quantity}x {orderItem.name}
              </Text>
            ))}
            {Array.isArray(item.items) && item.items.length > 3 && (
              <Text style={styles.moreItems}>+{item.items.length - 3} more items</Text>
            )}
          </View>
        </View>

        {/* Delivery Address */}
        {item.delivery_address && (
          <View style={styles.addressSection}>
            <Ionicons name="location-outline" size={16} color={Colors.light.textSecondary} />
            <Text style={styles.addressText} numberOfLines={1}>{item.delivery_address}</Text>
          </View>
        )}

        {/* Footer Section */}
        <View style={styles.orderFooter}>
          <View style={styles.priceBreakdown}>
            <Text style={styles.priceLabel}>Total</Text>
            <Text style={styles.totalPrice}>₱{item.total_price.toFixed(2)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Order History</Text>
          <Text style={styles.subtitle}>
            {orders.length} {orders.length === 1 ? 'completed order' : 'completed orders'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.loadingText}>Loading order history...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={Colors.light.icon} />
            <Text style={styles.emptyStateTitle}>No Completed Orders</Text>
            <Text style={styles.emptyStateText}>
              Your completed orders will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

