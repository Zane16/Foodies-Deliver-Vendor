import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../supabaseClient";
import { styles } from "../../../styles/deliverer/MapNavigation.styles";

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface DirectionStep {
  instruction: string;
  distance: number;
  duration: number;
}

interface Order {
  id: string;
  status: string;
  delivery_address: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_id: string;
  vendor_id: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  vendor?: {
    business_name: string;
    business_address: string;
    latitude: number | null;
    longitude: number | null;
  };
}

const MapNavigation = () => {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<LocationCoords | null>(null);
  const [loading, setLoading] = useState(true);
  const [distance, setDistance] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number>(0);
  const [eta, setEta] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deliveryPhotoUrl, setDeliveryPhotoUrl] = useState<string | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<LocationCoords[]>([]);
  const [nextInstruction, setNextInstruction] = useState<DirectionStep | null>(null);

  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // Fetch order details
  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) {
      Alert.alert("Error", "No order ID provided");
      router.back();
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        delivery_address,
        customer_name,
        customer_phone,
        customer_id,
        vendor_id,
        delivery_latitude,
        delivery_longitude,
        pickup_latitude,
        pickup_longitude,
        vendor:vendors!orders_vendor_id_fkey(
          business_name,
          business_address,
          latitude,
          longitude
        )
      `)
      .eq("id", orderId)
      .single();

    if (error) {
      Alert.alert("Error", "Failed to fetch order details");
      console.error(error);
      router.back();
      return;
    }

    // Normalize vendor data (Supabase may return it as array)
    const normalizedOrder = {
      ...data,
      vendor: Array.isArray(data.vendor) ? data.vendor[0] : data.vendor,
    };

    setOrder(normalizedOrder);

    // Get delivery destination coordinates
    let deliveryLat = null;
    let deliveryLng = null;

    // Priority 1: Use coordinates from orders table (cached at order creation)
    if (data.delivery_latitude && data.delivery_longitude) {
      deliveryLat = Number(data.delivery_latitude);
      deliveryLng = Number(data.delivery_longitude);
    }
    // Priority 2: Get from customer profile
    else if (data.customer_id) {
      const { data: customerProfile } = await supabase
        .from("profiles")
        .select("latitude, longitude")
        .eq("id", data.customer_id)
        .single();

      if (customerProfile?.latitude && customerProfile?.longitude) {
        deliveryLat = Number(customerProfile.latitude);
        deliveryLng = Number(customerProfile.longitude);
      }
    }

    // Priority 3: Try geocoding the delivery address
    if (!deliveryLat || !deliveryLng) {
      if (data.delivery_address) {
        try {
          const geocoded = await Location.geocodeAsync(data.delivery_address);
          if (geocoded && geocoded.length > 0) {
            deliveryLat = geocoded[0].latitude;
            deliveryLng = geocoded[0].longitude;
          }
        } catch (geocodeError) {
          console.error("Geocoding failed:", geocodeError);
        }
      }
    }

    // Set delivery destination
    if (deliveryLat && deliveryLng) {
      setDestinationLocation({
        latitude: deliveryLat,
        longitude: deliveryLng,
      });
    } else {
      Alert.alert(
        "Location Error",
        "Could not determine delivery location. Please ensure the delivery address has coordinates.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [orderId]);

  // Fetch directions from Google Directions API
  const fetchDirections = async (origin: LocationCoords, destination: LocationCoords) => {
    try {
      const apiKey = "YOUR_GOOGLE_MAPS_API_KEY"; // Will be replaced with actual key
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];

        // Decode polyline for route
        const points = decodePolyline(route.overview_polyline.points);
        setRouteCoordinates(points);

        // Get first step instruction
        if (leg.steps && leg.steps.length > 0) {
          const firstStep = leg.steps[0];
          setNextInstruction({
            instruction: firstStep.html_instructions.replace(/<[^>]*>/g, ''),
            distance: firstStep.distance.value,
            duration: firstStep.duration.value,
          });
        }

        // Calculate ETA
        const etaMinutes = Math.ceil(leg.duration.value / 60);
        setEta(etaMinutes);
      }
    } catch (error) {
      console.error("Error fetching directions:", error);
      // Fallback to straight line
      setRouteCoordinates([origin, destination]);
    }
  };

  // Decode Google polyline
  const decodePolyline = (encoded: string): LocationCoords[] => {
    const poly: LocationCoords[] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }

    return poly;
  };

  // Request location permissions and start tracking
  const startLocationTracking = async () => {
    try {
      // Request permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== "granted") {
        setLocationError("Location permission denied");
        Alert.alert(
          "Permission Required",
          "Please enable location permissions to use navigation",
          [
            { text: "Cancel", style: "cancel", onPress: () => router.back() },
            { text: "Settings", onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
        return;
      }

      // Get initial location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const initialCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(initialCoords);
      setSpeed(location.coords.speed ? location.coords.speed * 3.6 : 0); // Convert m/s to km/h

      // Fetch directions
      if (destinationLocation) {
        await fetchDirections(initialCoords, destinationLocation);
      }

      // Start watching location
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000, // Update every 3 seconds
          distanceInterval: 10, // Or when moved 10 meters
        },
        (newLocation) => {
          const newCoords = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          };
          setCurrentLocation(newCoords);

          // Update speed (convert m/s to km/h)
          const currentSpeed = newLocation.coords.speed ? newLocation.coords.speed * 3.6 : 0;
          setSpeed(currentSpeed);

          // Calculate distance to destination
          if (destinationLocation) {
            const dist = calculateDistance(newCoords, destinationLocation);
            setDistance(dist);

            // Update ETA based on current speed
            if (currentSpeed > 0) {
              const etaMinutes = Math.ceil((dist / currentSpeed) * 60);
              setEta(etaMinutes);
            }
          }
        }
      );

      setLoading(false);
    } catch (error) {
      console.error("Error starting location tracking:", error);
      setLocationError("Failed to get location");
      Alert.alert("Error", "Failed to start location tracking");
      setLoading(false);
    }
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (coords1: LocationCoords, coords2: LocationCoords): number => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(coords2.latitude - coords1.latitude);
    const dLon = toRad(coords2.longitude - coords1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(coords1.latitude)) *
        Math.cos(toRad(coords2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  // Take delivery photo
  const takeDeliveryPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to take a delivery photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadDeliveryPhoto(result.assets[0].uri);
      }
    } catch (err: any) {
      console.error('Error taking photo:', err);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  // Upload delivery photo
  const uploadDeliveryPhoto = async (uri: string) => {
    try {
      setUploadingPhoto(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `delivery_${orderId}_${Date.now()}.${ext}`;
      const filePath = `deliveries/${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: `image/${ext}`,
        name: fileName,
      } as any);

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, formData, {
          contentType: `image/${ext}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      setDeliveryPhotoUrl(urlData.publicUrl);
      Alert.alert('Success', 'Delivery photo captured!');
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      Alert.alert('Error', err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Mark order as delivered
  const markAsDelivered = async () => {
    if (!order) return;

    if (!deliveryPhotoUrl) {
      Alert.alert(
        "Photo Required",
        "Please take a delivery photo before marking as delivered.",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Confirm Delivery",
      "Have you delivered this order to the customer?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Delivered",
          onPress: async () => {
            setUpdating(true);
            const { error } = await supabase
              .from("orders")
              .update({
                status: "delivered",
                delivered_at: new Date().toISOString()
              })
              .eq("id", order.id);

            setUpdating(false);

            if (error) {
              Alert.alert("Error", "Failed to update order status");
              console.error(error);
              return;
            }

            Alert.alert(
              "Success",
              "Order marked as delivered!",
              [{ text: "OK", onPress: () => router.replace("/deliverer/tabs/Orders") }]
            );
          },
        },
      ]
    );
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  useEffect(() => {
    if (order && destinationLocation) {
      startLocationTracking();
    }

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, destinationLocation]);

  // Auto-fit map to show both markers initially
  useEffect(() => {
    if (currentLocation && destinationLocation && mapRef.current && routeCoordinates.length === 0) {
      mapRef.current.fitToCoordinates([currentLocation, destinationLocation], {
        edgePadding: { top: 100, right: 50, bottom: 400, left: 50 },
        animated: true,
      });
    }
  }, [currentLocation, destinationLocation, routeCoordinates.length]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading navigation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (locationError || !currentLocation || !destinationLocation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {locationError || "Unable to get location data"}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={startLocationTracking}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>To: {order?.delivery_address || 'Delivery Location'}</Text>
          <Text style={styles.headerSubtitle}>
            {distance ? `${distance.toFixed(1)} KM` : 'Calculating...'}
          </Text>
        </View>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{eta ? `${eta} min` : '--'}</Text>
          <Text style={styles.statLabel}>Remaining</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {distance ? `${distance.toFixed(1)} km` : '--'}
          </Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{Math.round(speed)} km/h</Text>
          <Text style={styles.statLabel}>Speed</Text>
        </View>
      </View>

      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType="hybrid" // Satellite view like the design
        initialRegion={{
          ...currentLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={true}
        showsCompass={true}
        showsTraffic={false}
      >
        {/* Current Location Marker */}
        <Marker
          coordinate={currentLocation}
          title="Your Location"
          pinColor="#4285F4"
        />

        {/* Destination Marker */}
        <Marker
          coordinate={destinationLocation}
          title={order?.customer_name || "Delivery Location"}
          description={order?.delivery_address || ""}
          pinColor="#EA4335"
        />

        {/* Route Polyline */}
        {routeCoordinates.length > 0 ? (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#4285F4"
            strokeWidth={4}
          />
        ) : (
          <Polyline
            coordinates={[currentLocation, destinationLocation]}
            strokeColor="#4285F4"
            strokeWidth={4}
            lineDashPattern={[10, 5]}
          />
        )}
      </MapView>

      {/* Turn Instruction Card */}
      {nextInstruction && (
        <View style={styles.instructionCard}>
          <View style={styles.instructionIcon}>
            <Text style={styles.instructionIconText}>➡️</Text>
          </View>
          <View style={styles.instructionContent}>
            <Text style={styles.instructionText}>{nextInstruction.instruction}</Text>
            <Text style={styles.instructionDistance}>
              in {nextInstruction.distance < 1000
                ? `${nextInstruction.distance} meters`
                : `${(nextInstruction.distance / 1000).toFixed(1)} km`}
            </Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.photoButton, uploadingPhoto && styles.buttonDisabled]}
            onPress={takeDeliveryPhoto}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : deliveryPhotoUrl ? (
              <>
                <Text style={styles.buttonText}>✓ Photo Captured</Text>
              </>
            ) : (
              <Text style={styles.buttonText}>Take Delivery Photo</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deliveredButton, (updating || !deliveryPhotoUrl) && styles.buttonDisabled]}
            onPress={markAsDelivered}
            disabled={updating || !deliveryPhotoUrl}
          >
            {updating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Marked as Delivered</Text>
            )}
          </TouchableOpacity>
        </View>
    </View>
  );
};

export default MapNavigation;
