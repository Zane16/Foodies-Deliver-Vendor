import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { supabase } from '../../../supabaseClient';
import { styles } from '../../../styles/deliverer/deliverer-dashboard.styles';

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

export default function DelivererDashboard() {
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<Order[]>([]);
  const [view, setView] = useState<'Available' | 'MyDeliveries'>('Available');
  const [loading, setLoading] = useState(true);
  const [delivererId, setDelivererId] = useState<string | null>(null);
  const [delivererProfile, setDelivererProfile] = useState<{
    full_name: string;
    profile_picture_url: string | null;
    phone: string | null;
  } | null>(null);

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

      // In new schema: deliverer.id = user.id (deliverer IS a profile)
      const delivererId = user.id;
      setDelivererId(delivererId);

      // Fetch deliverer profile info
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, profile_picture_url, phone')
        .eq('id', delivererId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else {
        setDelivererProfile(profile);
      }

      await fetchOrders(delivererId);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async (delId: string) => {
    try {
      // Fetch available orders (ready status, no deliverer assigned)
      const { data: available, error: availableError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'ready')
        .is('deliverer_id', null);

      if (availableError) throw availableError;

      // Fetch my deliveries (assigned to this deliverer, not completed)
      const { data: myOrders, error: myOrdersError } = await supabase
        .from('orders')
        .select('*')
        .eq('deliverer_id', delId)
        .neq('status', 'completed');

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

          if (payload.eventType === 'INSERT' && newOrder.status === 'ready') {
            setAvailableOrders((prev) => [newOrder, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            // If order is assigned to me
            if (newOrder.deliverer_id === delivererId && newOrder.status !== 'completed') {
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
            if (newOrder.status === 'completed') {
              setMyDeliveries((prev) => prev.filter((o) => o.id !== newOrder.id));
            }
            // If order becomes available again (deliverer unassigned)
            if (newOrder.status === 'ready' && !newOrder.deliverer_id) {
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
          status: 'on_the_way'
        })
        .eq('id', orderId);

      if (error) throw error;

      // Optimistically update UI
      const order = availableOrders.find((o) => o.id === orderId);
      if (order) {
        setAvailableOrders((prev) => prev.filter((o) => o.id !== orderId));
        setMyDeliveries((prev) => [{ ...order, deliverer_id: delivererId, status: 'on_the_way' }, ...prev]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleCompleteDelivery = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
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
          <Text style={styles.orderId}>
            {item.customer_name ? `Delivery for ${item.customer_name}` : 'New Delivery Order'}
          </Text>
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
          item.status === 'ready' && styles.statusReady,
          item.status === 'on_the_way' && styles.statusDelivering,
        ]}>
          <Text style={[
            styles.statusText,
            item.status === 'ready' && styles.statusTextReady,
            item.status === 'on_the_way' && styles.statusTextDelivering,
          ]}>
            {item.status === 'on_the_way' ? 'On the Way' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
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
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }}>
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading deliveries...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayOrders = view === 'Available' ? availableOrders : myDeliveries;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {delivererProfile?.profile_picture_url ? (
              <Image
                source={{ uri: delivererProfile.profile_picture_url }}
                style={styles.profilePicture}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.profilePicturePlaceholder}>
                <Text style={styles.profilePicturePlaceholderText}>
                  {delivererProfile?.full_name?.charAt(0)?.toUpperCase() || 'D'}
                </Text>
              </View>
            )}
            <View style={styles.headerInfo}>
              <Text style={styles.delivererName}>{delivererProfile?.full_name || 'Deliverer'}</Text>
              <Text style={styles.delivererSubtitle}>
                {view === 'Available'
                  ? `${availableOrders.length} available order${availableOrders.length !== 1 ? 's' : ''}`
                  : `${myDeliveries.length} active deliver${myDeliveries.length !== 1 ? 'ies' : 'y'}`
                }
              </Text>
            </View>
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
    </SafeAreaView>
  );
}

