import { router, useLocalSearchParams } from "expo-router"; // Import from expo-router
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../../constants/Colors";
import { supabase } from "../../../supabaseClient";
import { styles } from "../../../styles/deliverer/OrderDetails.styles";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  total_price: number;
  delivery_fee: number;
  status: string;
  created_at: string;
  customer_id: string;
  vendor_id: string;
  deliverer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_notes: string | null;
  customer?: {
    full_name: string;
    phone: string | null;
    delivery_address: string | null;
    delivery_notes: string | null;
    profile_picture_url: string | null;
  };
  vendor?: {
    business_name: string;
    business_address: string;
    delivery_fee: number;
    minimum_order: number;
    profile_picture_url: string | null;
  };
}

// Remove route and navigation props
const OrderDetails = () => {
  // Get orderId from URL params using useLocalSearchParams
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) {
      Alert.alert("Error", "No order ID provided");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        total_price,
        delivery_fee,
        created_at,
        items,
        customer_id,
        vendor_id,
        deliverer_id,
        customer_name,
        customer_phone,
        delivery_address,
        delivery_notes,
        customer:profiles!orders_customer_id_fkey(
          full_name,
          phone,
          delivery_address,
          delivery_notes,
          profile_picture_url
        ),
        vendor:vendors!vendor_id(
          business_name,
          business_address,
          delivery_fee,
          minimum_order
        )
      `)
      .eq("id", orderId)
      .single();

    if (error) {
      console.error("Fetch error:", error.message);
      Alert.alert("Error", error.message);
    } else {
      console.log('Raw order data:', JSON.stringify(data, null, 2));
      console.log('Vendor data type:', typeof data.vendor);
      console.log('Vendor data:', data.vendor);

      // Transform the data to match our Order interface
      // Handle vendor data - it might be an array, object, or null
      let vendorData = undefined;
      if (data.vendor) {
        if (Array.isArray(data.vendor) && data.vendor.length > 0) {
          vendorData = data.vendor[0];
        } else if (!Array.isArray(data.vendor)) {
          vendorData = data.vendor;
        }
      }

      // Fetch vendor profile picture from profiles table
      if (data.vendor_id) {
        const { data: vendorProfile } = await supabase
          .from('profiles')
          .select('profile_picture_url')
          .eq('id', data.vendor_id)
          .single();

        if (vendorProfile && vendorData) {
          vendorData = {
            ...vendorData,
            profile_picture_url: vendorProfile.profile_picture_url,
          };
        }
      }

      const transformedData = {
        ...data,
        customer: Array.isArray(data.customer) && data.customer.length > 0 ? data.customer[0] : undefined,
        vendor: vendorData,
      };

      console.log('Transformed vendor data:', transformedData.vendor);
      setOrder(transformedData as unknown as Order);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();

      const channel = supabase
        .channel(`order-${orderId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `id=eq.${orderId}`,
          },
          () => {
            fetchOrderDetails();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [orderId, fetchOrderDetails]);

  const acceptOrder = async () => {
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
      fetchOrderDetails();
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
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
      fetchOrderDetails();
    }
  };

  const getStatusProgress = (status: string) => {
    const statuses = ['Ready', 'Accepted by Deliverer', 'Picked Up', 'Delivered'];
    const currentIndex = statuses.findIndex(s =>
      status === 'Accepted' ? s === 'Accepted by Deliverer' : s === status
    );
    return currentIndex + 1;
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity
            style={styles.backToOrdersButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToOrdersText}>Back to Orders</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.headerRight}>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Tracker - Simple 3 steps */}
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <Text style={[
              styles.progressLabel,
              (order.status === 'accepted' || order.status === 'on_the_way' || order.status === 'delivered') && styles.progressLabelActive
            ]}>Accepted</Text>
          </View>
          <View style={styles.progressStep}>
            <Text style={[
              styles.progressLabel,
              (order.status === 'on_the_way' || order.status === 'delivered') && styles.progressLabelActive
            ]}>Pickup</Text>
          </View>
          <View style={styles.progressStep}>
            <Text style={[
              styles.progressLabel,
              order.status === 'delivered' && styles.progressLabelActive
            ]}>Delivery</Text>
          </View>
        </View>

        {/* Pickup Location */}
        <View style={styles.locationSection}>
          <View style={styles.locationHeaderRow}>
            <Text style={styles.locationTitle}>Pickup Location</Text>
          </View>
          <View style={styles.locationRow}>
            {order.vendor?.profile_picture_url && order.vendor.profile_picture_url.trim() !== '' ? (
              <Image
                source={{ uri: order.vendor.profile_picture_url }}
                style={styles.locationImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.locationImage, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 32, fontWeight: '700', color: '#6B7280' }}>
                  {order.vendor?.business_name?.charAt(0)?.toUpperCase() || '🏪'}
                </Text>
              </View>
            )}
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationName}>{order.vendor?.business_name || 'Vendor'}</Text>
              <Text style={styles.locationAddress}>{order.vendor?.business_address || 'Address'}</Text>
            </View>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusIndicator,
                order.status === 'preparing' && { backgroundColor: '#F59E0B' },
                order.status === 'ready' && { backgroundColor: '#6bbaa3' }
              ]} />
              <Text style={styles.statusText}>
                {order.status === 'preparing' ? 'Preparing' : 'Ready for\nPickup'}
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Location */}
        <View style={styles.locationSection}>
          <View style={styles.locationHeaderRow}>
            <Text style={styles.locationTitle}>Delivery Location</Text>
          </View>
          <View style={styles.locationRow}>
            {order.customer?.profile_picture_url && order.customer.profile_picture_url.trim() !== '' ? (
              <Image
                source={{ uri: order.customer.profile_picture_url }}
                style={styles.locationImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.locationImage, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 32 }}>👤</Text>
              </View>
            )}
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationName}>{order.customer?.full_name || order.customer_name || 'Customer'}</Text>
              <Text style={styles.locationAddress}>{order.customer?.delivery_address || order.delivery_address || 'Address'}</Text>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.orderItemsSection}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items && order.items.map((item: OrderItem, index: number) => (
            <View key={index} style={styles.simpleItemRow}>
              <Text style={styles.simpleItemText}>{item.name} (₱{item.price.toFixed(2)}) {item.quantity}x</Text>
              <Text style={styles.simpleItemPrice}>₱{(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.dividerSimple} />
          <View style={styles.totalRowSimple}>
            <Text style={styles.totalLabelSimple}>Subtotal:</Text>
            <Text style={styles.totalPriceSimple}>₱{(order.total_price - order.delivery_fee).toFixed(2)}</Text>
          </View>
          <View style={styles.totalRowSimple}>
            <Text style={styles.totalLabelSimple}>Delivery Fee:</Text>
            <Text style={styles.totalPriceSimple}>₱{order.delivery_fee.toFixed(2)}</Text>
          </View>
          <View style={styles.dividerSimple} />
          <View style={styles.totalRowSimple}>
            <Text style={[styles.totalLabelSimple, { fontWeight: '700' }]}>Total:</Text>
            <Text style={[styles.totalPriceSimple, { fontWeight: '700' }]}>₱{order.total_price.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Button */}
      <View style={styles.footer}>
        {!order.deliverer_id && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={acceptOrder}
          >
            <Text style={styles.actionButtonText}>Accept Order</Text>
          </TouchableOpacity>
        )}
        {order.deliverer_id && order.status === "preparing" && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDisabled]}
            disabled={true}
          >
            <Text style={styles.actionButtonText}>Waiting for Vendor to Mark as Ready</Text>
          </TouchableOpacity>
        )}
        {order.deliverer_id && order.status === "ready" && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => updateOrderStatus("on_the_way")}
          >
            <Text style={styles.actionButtonText}>Mark as Picked Up</Text>
          </TouchableOpacity>
        )}
        {order.status === "on_the_way" && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonNavigation]}
            onPress={() => updateOrderStatus("delivered")}
          >
            <Text style={styles.actionButtonText}>✓ Mark as Delivered</Text>
          </TouchableOpacity>
        )}
      </View>
      </View>
    </SafeAreaView>
  );
};

export default OrderDetails;