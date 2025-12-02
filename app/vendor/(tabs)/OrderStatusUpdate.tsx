// app/vendor/OrderStatusUpdate.tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../supabaseClient';
import { styles } from '../../../styles/vendor/OrderStatusUpdate.styles';
import { Colors } from '../../../constants/Colors';


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
  delivery_fee: number;
  created_at: string;
  items: OrderItem[];
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_notes: string | null;
  customer?: {
    full_name: string;
    phone: string | null;
    delivery_address: string | null;
    profile_picture_url: string | null;
  };
}

interface Props {
  userRole: 'Vendor' | 'Deliverer';
  userId: string;
}

const OrderStatusUpdate: React.FC<Props> = ({ userRole, userId }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [view, setView] = useState<'Incoming' | 'Active'>('Incoming');
  const [vendorInfo, setVendorInfo] = useState<{ business_name: string; business_address: string; delivery_fee: number; minimum_order: number; header_image_url?: string | null } | null>(null);

  // Fetch vendor info
  const fetchVendorInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('vendors')
        .select('business_name, business_address, delivery_fee, minimum_order, header_image_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setVendorInfo(data);
    } catch (err: any) {
      console.error('Error fetching vendor info:', err.message);
    }
  };

  // Fetch completed orders for income calculation
  const fetchCompletedOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const vendorId = user.id;

      // Fetch only completed orders for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select('total_price')
        .eq('vendor_id', vendorId)
        .eq('status', 'completed')
        .gte('created_at', today.toISOString());

      if (error) throw error;
      setCompletedOrders(data as Order[]);
    } catch (err: any) {
      console.error('Error fetching completed orders:', err.message);
    }
  };

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

      // Fetch orders for this vendor with customer details
      let query = supabase.from('orders').select(`
        *,
        customer:profiles!orders_customer_id_fkey(
          full_name,
          phone,
          delivery_address,
          profile_picture_url
        )
      `);
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
    fetchVendorInfo();
    fetchOrders();
    fetchCompletedOrders();

    // Get vendor ID for filtering real-time updates
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const vendorId = user.id;

      // Real-time subscription with vendor filtering
      const subscription = supabase
        .channel('vendor-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `vendor_id=eq.${vendorId}` // Only listen to this vendor's orders
          },
          async (payload) => {
            const newOrder = payload.new as Order;
            const oldOrder = payload.old as Order;

            // For INSERT events, fetch the order with customer details
            if (payload.eventType === 'INSERT') {
              const { data: orderWithCustomer } = await supabase
                .from('orders')
                .select(`
                  *,
                  customer:profiles!orders_customer_id_fkey(
                    full_name,
                    phone,
                    delivery_address,
                    profile_picture_url
                  )
                `)
                .eq('id', newOrder.id)
                .single();

              if (orderWithCustomer) {
                setOrders((prev) => {
                  // Only add if not completed and not already in list
                  if (orderWithCustomer.status !== 'completed' && !prev.find(o => o.id === orderWithCustomer.id)) {
                    return [orderWithCustomer as Order, ...prev];
                  }
                  return prev;
                });
              }
            } else if (payload.eventType === 'UPDATE') {
              setOrders((prev) => {
                // If updated to completed, remove from active list and refresh completed orders
                if (newOrder.status === 'completed') {
                  fetchCompletedOrders();
                  return prev.filter((o) => o.id !== newOrder.id);
                }
                // Update the order in the list
                return prev.map((o) =>
                  o.id === newOrder.id ? { ...o, ...newOrder } : o
                );
              });
            } else if (payload.eventType === 'DELETE') {
              setOrders((prev) => prev.filter((o) => o.id !== oldOrder.id));
            }
          }
        )
        .subscribe();

      return subscription;
    };

    let subscription: any;
    setupRealtimeSubscription().then(sub => {
      subscription = sub;
    });

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
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
      case 'Incoming':
        // New orders that need to be accepted
        return order.status === 'pending';
      case 'Active':
        // All accepted orders through entire delivery process (preparing, ready, on_the_way, delivered)
        return ['preparing', 'ready', 'on_the_way', 'delivered'].includes(order.status);
      default:
        return false;
    }
  });

  // Calculate stats
  const totalOrders = orders.length;
  const totalIncome = completedOrders.reduce((sum, order) => sum + parseFloat(order.total_price.toString()), 0);

  const renderItem = ({ item }: { item: Order }) => {
    // Debug logging - CHECK THIS IN YOUR CONSOLE
    console.log('=== ORDER DEBUG ===');
    console.log('Order ID:', item.id);
    console.log('Customer ID from order:', item.customer_id);
    console.log('Vendor ID from order:', item.vendor_id);
    console.log('Raw customer data:', JSON.stringify(item.customer, null, 2));
    console.log('Customer is array?', Array.isArray(item.customer));

    // Handle customer data - might be array or object
    const customerData = Array.isArray(item.customer) && item.customer.length > 0
      ? item.customer[0]
      : item.customer;

    // Get customer info from either the joined data or cached fields
    const customerName = customerData?.full_name || item.customer_name || 'Customer';
    const customerPhone = customerData?.phone || item.customer_phone;
    const deliveryAddress = customerData?.delivery_address || item.delivery_address;
    const profilePictureUrl = customerData?.profile_picture_url;

    console.log('Resolved customer name:', customerName);
    console.log('Resolved profile picture URL:', profilePictureUrl);
    console.log('==================');

    return (
    <View style={styles.orderCard}>
      {/* Compact Header with Status, Customer, Date, and Total */}
      <View style={styles.orderHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <View style={[
              styles.statusBadge,
              item.status === 'pending' && styles.statusPending,
              item.status === 'preparing' && styles.statusPreparing,
              item.status === 'ready' && styles.statusReady,
              item.status === 'on_the_way' && { backgroundColor: Colors.light.infoLight },
              item.status === 'delivered' && { backgroundColor: Colors.light.successLight },
            ]}>
              <Text style={[
                styles.statusText,
                item.status === 'pending' && styles.statusTextPending,
                item.status === 'preparing' && styles.statusTextPreparing,
                item.status === 'ready' && styles.statusTextReady,
                item.status === 'on_the_way' && { color: Colors.light.info },
                item.status === 'delivered' && { color: Colors.light.success },
              ]}>
                {item.status === 'on_the_way' ? 'Out for Delivery' :
                 item.status === 'delivered' ? 'Delivered' :
                 item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
            <Text style={styles.customerName}>• {customerName}</Text>
          </View>
          <Text style={styles.orderDate}>
            {new Date(item.created_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <Text style={styles.totalValue}>₱{item.total_price.toFixed(2)}</Text>
      </View>

      <View style={styles.divider} />

      {/* Compact Order Items - No Images */}
      <View style={styles.itemsSection}>
        {item.items.map((orderItem) => (
          <View key={orderItem.id} style={styles.itemRow}>
            <Text style={styles.itemQuantity}>{orderItem.quantity}x</Text>
            <Text style={styles.itemName}>{orderItem.name}</Text>
            <Text style={styles.itemPrice}>₱{(orderItem.price * orderItem.quantity).toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Buttons depending on status */}
      {(item.status === 'pending' || item.status === 'preparing' || item.status === 'ready' || item.status === 'on_the_way' || item.status === 'delivered') && (
        <View style={styles.divider} />
      )}

      {item.status === 'pending' && view === 'Incoming' && (
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
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
      {item.status === 'preparing' && view === 'Active' && (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => handleStatusChange(item.id, 'ready')}
        >
          <Text style={styles.primaryButtonText}>Mark Ready</Text>
        </TouchableOpacity>
      )}
      {item.status === 'ready' && view === 'Active' && (
        <View style={{
          backgroundColor: Colors.light.warningLight,
          padding: 8,
          borderRadius: 6,
        }}>
          <Text style={{ fontSize: 12, color: Colors.light.text, textAlign: 'center' }}>
            ⏳ Waiting for pickup
          </Text>
        </View>
      )}
      {item.status === 'on_the_way' && view === 'Active' && (
        <View style={{
          backgroundColor: Colors.light.infoLight,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 8,
          alignItems: 'center',
        }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.light.info }}>
            🚚 Out for Delivery
          </Text>
        </View>
      )}
      {item.status === 'delivered' && view === 'Active' && (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            Alert.alert(
              'Confirm Payment',
              'Has the customer paid for this order?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Complete Order',
                  onPress: () => handleStatusChange(item.id, 'completed'),
                  style: 'default'
                }
              ]
            );
          }}
        >
          <Text style={styles.primaryButtonText}>✓ Complete & Confirm</Text>
        </TouchableOpacity>
      )}
    </View>
    );
  };


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <View style={styles.container}>
        {/* Vendor Header with Background Image */}
        <View style={styles.vendorHeaderContainer}>
          {vendorInfo?.header_image_url ? (
            <>
              <Image
                source={{ uri: vendorInfo.header_image_url }}
                style={styles.headerBackgroundImage}
                resizeMode="cover"
              />
              <View style={styles.headerOverlay} />
            </>
          ) : (
            <View style={styles.headerGradient} />
          )}
          <View style={styles.vendorHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.vendorName, vendorInfo?.header_image_url && { color: '#FFFFFF' }]}>
                {vendorInfo?.business_name || 'Vendor'}
              </Text>
              <Text style={[styles.vendorSubtitle, vendorInfo?.header_image_url && { color: '#F0F0F0' }]}>
                {vendorInfo?.business_address || 'Food Delivery'}
              </Text>
              {vendorInfo && (
                <View style={{ flexDirection: 'row', marginTop: 6, gap: 12 }}>
                  <Text style={[{ fontSize: 12, color: Colors.light.textSecondary }, vendorInfo?.header_image_url && { color: '#E0E0E0' }]}>
                    Delivery: ₱{vendorInfo.delivery_fee.toFixed(2)}
                  </Text>
                  <Text style={[{ fontSize: 12, color: Colors.light.textSecondary }, vendorInfo?.header_image_url && { color: '#E0E0E0' }]}>
                    Min Order: ₱{vendorInfo.minimum_order.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.vendorStatusBadge}>
              <View style={styles.statusDotGreen} />
              <Text style={styles.vendorStatusText}>Available</Text>
            </View>
          </View>
        </View>

        {/* Reports Button */}
        <View style={styles.reportsButtonContainer}>
          <TouchableOpacity
            style={styles.reportsButton}
            onPress={() => router.push('/vendor/(tabs)/reports' as any)}
          >
            <View style={styles.reportsButtonContent}>
              <View style={styles.reportsIconContainer}>
                <Ionicons name="bar-chart" size={32} color={Colors.light.primary} />
              </View>
              <View style={styles.reportsTextContainer}>
                <Text style={styles.reportsButtonTitle}>View Sales Reports</Text>
                <Text style={styles.reportsButtonSubtitle}>Track your daily, weekly & monthly sales</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={Colors.light.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, view === 'Incoming' && styles.activeTab]}
          onPress={() => setView('Incoming')}
        >
          <Text style={[styles.tabText, view === 'Incoming' && styles.activeTabText]}>
            Incoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'Active' && styles.activeTab]}
          onPress={() => setView('Active')}
        >
          <Text style={[styles.tabText, view === 'Active' && styles.activeTabText]}>
            Active Orders
          </Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📦</Text>
          <Text style={styles.emptyStateTitle}>No orders</Text>
          <Text style={styles.emptyStateText}>
            {view === 'Incoming' && 'New orders will appear here'}
            {view === 'Active' && 'Accepted orders will show here'}
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
    </SafeAreaView>
  );
};

export default OrderStatusUpdate;