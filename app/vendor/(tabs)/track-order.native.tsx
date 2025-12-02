import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { supabase } from '../../../supabaseClient';

interface Order {
  id: string;
  customer_id: string;
  deliverer_id: string | null;
  status: string;
  total_price: number;
  delivery_fee: number;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  customer?: {
    full_name: string;
    phone: string | null;
    delivery_address: string | null;
  };
}

interface DelivererProfile {
  full_name: string;
  phone: string | null;
  profile_picture_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

export default function VendorTrackOrder() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [deliverer, setDeliverer] = useState<DelivererProfile | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!orderId) {
      Alert.alert('Error', 'Order ID is required');
      router.back();
      return;
    }

    fetchOrderAndDeliverer();
    const intervalId = setInterval(fetchDelivererLocation, 5000); // Update every 5 seconds

    // Real-time subscription for order status changes
    const subscription = supabase
      .channel(`vendor-track-order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const updatedOrder = payload.new as Order;
          setOrder(prev => prev ? { ...prev, ...updatedOrder } : null);

          // If order is no longer on_the_way, go back
          if (updatedOrder.status !== 'on_the_way') {
            Alert.alert('Order Status Changed', 'This order is no longer out for delivery.', [
              { text: 'OK', onPress: () => router.back() }
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(subscription);
    };
  }, [orderId]);

  const fetchOrderAndDeliverer = async () => {
    try {
      // Fetch order with customer details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          customer:profiles!orders_customer_id_fkey(
            full_name,
            phone,
            delivery_address
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData as Order);

      // Fetch deliverer location
      if (orderData.deliverer_id) {
        await fetchDelivererLocation(orderData.deliverer_id);
      }
    } catch (err: any) {
      console.error('Error fetching order:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDelivererLocation = async (delivererId?: string) => {
    try {
      const id = delivererId || order?.deliverer_id;
      if (!id) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone, profile_picture_url, latitude, longitude')
        .eq('id', id)
        .single();

      if (error) throw error;
      setDeliverer(data as DelivererProfile);

      // Auto-fit map to show both deliverer and destination
      if (data.latitude && data.longitude && order?.delivery_latitude && order?.delivery_longitude) {
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(
            [
              { latitude: data.latitude!, longitude: data.longitude! },
              { latitude: order.delivery_latitude!, longitude: order.delivery_longitude! },
            ],
            {
              edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
              animated: true,
            }
          );
        }, 500);
      }
    } catch (err: any) {
      console.error('Error fetching deliverer location:', err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={{ marginTop: 12, fontSize: 16, color: Colors.light.textSecondary }}>
            Loading order tracking...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: Colors.light.error }}>Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasDelivererLocation = deliverer?.latitude && deliverer?.longitude;
  const hasDestination = order.delivery_latitude && order.delivery_longitude;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: Colors.light.header,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 12, padding: 4 }}
        >
          <Text style={{ fontSize: 28, color: Colors.light.headerText }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.light.headerText }}>
            Track Order
          </Text>
        </View>
      </View>

      {/* Map */}
      <View style={{ flex: 1 }}>
        {hasDelivererLocation || hasDestination ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            initialRegion={{
              latitude: hasDelivererLocation ? deliverer.latitude! : order.delivery_latitude!,
              longitude: hasDelivererLocation ? deliverer.longitude! : order.delivery_longitude!,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
          >
            {/* Deliverer Location */}
            {hasDelivererLocation && (
              <Marker
                coordinate={{
                  latitude: deliverer.latitude!,
                  longitude: deliverer.longitude!,
                }}
                title="Deliverer"
                description={deliverer.full_name || 'Deliverer'}
              >
                <View style={{
                  backgroundColor: Colors.light.primary,
                  padding: 8,
                  borderRadius: 20,
                  borderWidth: 3,
                  borderColor: '#FFFFFF',
                }}>
                  <Text style={{ fontSize: 20 }}>🚗</Text>
                </View>
              </Marker>
            )}

            {/* Delivery Destination */}
            {hasDestination && (
              <Marker
                coordinate={{
                  latitude: order.delivery_latitude!,
                  longitude: order.delivery_longitude!,
                }}
                title="Delivery Address"
                description={order.customer?.delivery_address || 'Customer Location'}
              >
                <View style={{
                  backgroundColor: Colors.light.error,
                  padding: 8,
                  borderRadius: 20,
                  borderWidth: 3,
                  borderColor: '#FFFFFF',
                }}>
                  <Text style={{ fontSize: 20 }}>📍</Text>
                </View>
              </Marker>
            )}
          </MapView>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📍</Text>
            <Text style={{ fontSize: 16, color: Colors.light.textSecondary, textAlign: 'center' }}>
              Waiting for location data...
            </Text>
          </View>
        )}
      </View>

      {/* Deliverer Info Card */}
      {deliverer && (
        <View style={{
          position: 'absolute',
          bottom: 20,
          left: 16,
          right: 16,
          backgroundColor: Colors.light.surface,
          borderRadius: 16,
          padding: 20,
          shadowColor: Colors.light.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        }}>
          <Text style={{
            fontSize: 12,
            fontWeight: '700',
            color: Colors.light.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 12,
          }}>
            Deliverer Information
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {deliverer.profile_picture_url ? (
              <Image
                source={{ uri: deliverer.profile_picture_url }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  marginRight: 12,
                  borderWidth: 2,
                  borderColor: Colors.light.primary,
                }}
                resizeMode="cover"
              />
            ) : (
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: Colors.light.primaryLight,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
                borderWidth: 2,
                borderColor: Colors.light.primary,
              }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: Colors.light.primary }}>
                  {deliverer.full_name?.charAt(0)?.toUpperCase() || 'D'}
                </Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.light.text, marginBottom: 4 }}>
                {deliverer.full_name || 'Deliverer'}
              </Text>
              {deliverer.phone && (
                <Text style={{ fontSize: 14, color: Colors.light.textSecondary }}>
                  📞 {deliverer.phone}
                </Text>
              )}
            </View>

            <View style={{
              backgroundColor: Colors.light.successLight,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.light.success }}>
                En Route
              </Text>
            </View>
          </View>

          {/* Customer Info */}
          {order.customer && (
            <>
              <View style={{
                height: 1,
                backgroundColor: Colors.light.border,
                marginVertical: 16,
              }} />

              <Text style={{
                fontSize: 12,
                fontWeight: '700',
                color: Colors.light.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
              }}>
                Delivering To
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.light.text, marginBottom: 4 }}>
                {order.customer.full_name}
              </Text>
              {order.customer.delivery_address && (
                <Text style={{ fontSize: 14, color: Colors.light.textSecondary }}>
                  📍 {order.customer.delivery_address}
                </Text>
              )}
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
