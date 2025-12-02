import { Ionicons } from '@expo/vector-icons';
import { router } from "expo-router"; // Import router from expo-router
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../../constants/Colors";
import { supabase } from "../../../supabaseClient";
import { styles } from "../../../styles/deliverer/Orders.styles";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  total_price: number;
  status: string;
  created_at?: string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  deliverer_id: string | null;
  customer?: {
    full_name: string;
    phone: string | null;
    delivery_address: string | null;
    profile_picture_url: string | null;
  };
}

// Remove navigation prop since we're using Expo Router
const AvailableOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [delivererProfile, setDelivererProfile] = useState<{
    full_name: string;
    profile_picture_url: string | null;
  } | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error.message);
      } else {
        setUser(data.user);

        // Fetch deliverer profile info
        if (data.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('id', data.user.id)
            .single();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
          } else {
            setDelivererProfile(profile);
          }
        }
      }
    };
    getUser();
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        customer:profiles!orders_customer_id_fkey(
          full_name,
          phone,
          delivery_address,
          profile_picture_url
        )
      `)
      .or(`status.in.(preparing,ready),and(deliverer_id.eq.${user.id},status.in.(accepted,ready,on_the_way))`);

    if (error) {
      console.error("Fetch error:", error.message);
      Alert.alert("Error", error.message);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchOrders();
      const channel = supabase
        .channel("deliverer-orders")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
          },
          async (payload) => {
            const newOrder = payload.new as Order;
            const oldOrder = payload.old as Order;

            // Only react to orders that are relevant to deliverers
            const relevantStatuses = ['preparing', 'ready', 'accepted', 'on_the_way'];

            if (payload.eventType === 'INSERT' && relevantStatuses.includes(newOrder.status)) {
              // Fetch the new order with customer details
              const { data: orderWithCustomer } = await supabase
                .from("orders")
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
                  // Only add if it matches the query criteria and isn't already in list
                  const shouldAdd =
                    (orderWithCustomer.status === 'preparing' || orderWithCustomer.status === 'ready') ||
                    (orderWithCustomer.deliverer_id === user.id && relevantStatuses.includes(orderWithCustomer.status));

                  if (shouldAdd && !prev.find(o => o.id === orderWithCustomer.id)) {
                    return [orderWithCustomer as Order, ...prev];
                  }
                  return prev;
                });
              }
            } else if (payload.eventType === 'UPDATE') {
              setOrders((prev) => {
                // Check if order should be removed (completed or cancelled)
                if (!relevantStatuses.includes(newOrder.status)) {
                  return prev.filter(o => o.id !== newOrder.id);
                }

                // Check if order should be visible to this deliverer
                const shouldShow =
                  (newOrder.status === 'preparing' || newOrder.status === 'ready') ||
                  (newOrder.deliverer_id === user.id);

                if (!shouldShow) {
                  return prev.filter(o => o.id !== newOrder.id);
                }

                // Update existing order or add if not present
                const existingIndex = prev.findIndex(o => o.id === newOrder.id);
                if (existingIndex !== -1) {
                  const updated = [...prev];
                  updated[existingIndex] = { ...updated[existingIndex], ...newOrder };
                  return updated;
                } else {
                  // Fetch full order details if not in list
                  fetchOrders();
                  return prev;
                }
              });
            } else if (payload.eventType === 'DELETE') {
              setOrders((prev) => prev.filter(o => o.id !== oldOrder.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchOrders]);

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

    // Only set deliverer_id, keep the current status (preparing or ready)
    const { error } = await supabase
      .from("orders")
      .update({
        deliverer_id: user.id,
      })
      .eq("id", orderId)
      .is("deliverer_id", null);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Order accepted! Waiting for vendor to mark as ready.");
      fetchOrders();
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!user) {
      Alert.alert("Error", "You must be logged in first");
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId)
      .eq("deliverer_id", user.id);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", `Order marked as ${newStatus}`);
      fetchOrders();
    }
  };

  const renderOrderCard = ({ item }: { item: Order }) => {
    const customerName = item.customer?.full_name || item.customer_name || 'Unknown Customer';
    const deliveryAddress = item.customer?.delivery_address || item.delivery_address;

    // Get first item for display
    const firstItem = item.items && item.items.length > 0 ? item.items[0] : null;
    const itemsCount = item.items?.length || 0;

    // Debug logging
    console.log('Order ID:', item.id.slice(0, 8), 'Status:', item.status, 'Deliverer ID:', item.deliverer_id);

    return (
    <View style={styles.orderCard}>
      {/* Main Content Row */}
      <View style={styles.cardMainRow}>
        {/* Food Image */}
        {firstItem?.image_url ? (
          <Image
            source={{ uri: firstItem.image_url }}
            style={styles.foodImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.foodImagePlaceholder}>
            <Text style={styles.foodImageEmoji}>🍽️</Text>
          </View>
        )}

        {/* Order Info */}
        <View style={styles.orderInfo}>
          <Text style={styles.orderTitle}>
            {firstItem?.name || 'Order'}{itemsCount > 1 ? ` +${itemsCount - 1} more` : ''}
          </Text>
          <Text style={styles.customerNameSmall}>{customerName}</Text>
          <Text style={styles.distanceText}>📍 0.4 km</Text>
          <Text style={styles.addressText} numberOfLines={1}>
            {deliveryAddress || 'Address not provided'}
          </Text>
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>₱{item.total_price.toFixed(2)}</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => {
            router.push({
              pathname: '/deliverer/tabs/OrderDetails',
              params: { orderId: item.id }
            });
          }}
        >
          <Text style={styles.detailsButtonText}>Order Details</Text>
        </TouchableOpacity>

        {item.deliverer_id && item.status === "preparing" && (
          <TouchableOpacity
            style={[styles.acceptButton, styles.acceptButtonDisabled]}
            disabled={true}
          >
            <Text style={styles.acceptButtonText}>Waiting for Vendor</Text>
          </TouchableOpacity>
        )}
        {item.deliverer_id && item.status === "ready" && (
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => updateOrderStatus(item.id, "on_the_way")}
          >
            <Text style={styles.acceptButtonText}>Mark as Picked Up</Text>
          </TouchableOpacity>
        )}
        {!item.deliverer_id && (item.status === "preparing" || item.status === "ready") && (
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => acceptOrder(item.id)}
          >
            <Text style={styles.acceptButtonText}>Accept Order</Text>
          </TouchableOpacity>
        )}
        {item.status === "on_the_way" && (
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() => updateOrderStatus(item.id, "delivered")}
          >
            <Text style={styles.navigateButtonText}>✓ Mark as Delivered</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Separate orders by status
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.profileSection}>
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
            <View style={styles.profileInfo}>
              <Text style={styles.delivererGreeting}>Hi, {delivererProfile?.full_name?.split(' ')[0] || 'Deliverer'}! 👋</Text>
              <View style={styles.statusBadgeOnline}>
                <View style={styles.statusDotGreen} />
                <Text style={styles.statusTextOnline}>Available for deliveries</Text>
              </View>
            </View>
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
              New orders will appear here when they&apos;re ready for pickup
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
    </SafeAreaView>
  );
};

export default AvailableOrders;