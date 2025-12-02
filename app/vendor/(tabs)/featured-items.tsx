import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../supabaseClient';
import { styles } from '../../../styles/vendor/featured-items.styles';
import { Colors } from '../../../constants/Colors';

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string | null;
  image_url?: string | null;
  is_best_seller: boolean;
  is_recommended: boolean;
  categories?: Category;
}

export default function FeaturedItems() {
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Get logged-in vendor and fetch menu items
  useEffect(() => {
    let isMounted = true;

    const fetchVendorAndMenu = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user) {
          Alert.alert('Error', 'No user logged in');
          return;
        }

        const vendorId = user.id;
        setVendorId(vendorId);

        // Fetch menu items with their categories and featured flags
        const { data: menuData, error: menuError } = await supabase
          .from('menu_items')
          .select(`
            *,
            categories (
              id,
              name
            )
          `)
          .eq('vendor_id', vendorId)
          .order('name');

        if (menuError) throw menuError;
        setMenuItems(menuData || []);

      } catch (error: any) {
        console.error('Error fetching data:', error);
        if (isMounted) {
          Alert.alert('Error', error.message || 'Failed to load data');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchVendorAndMenu();
    return () => { isMounted = false; };
  }, []);

  // Count how many items are marked as best sellers and recommended
  const bestSellerCount = menuItems.filter(item => item.is_best_seller).length;
  const recommendedCount = menuItems.filter(item => item.is_recommended).length;

  // Toggle best seller status
  const toggleBestSeller = async (itemId: string, currentValue: boolean) => {
    if (!vendorId) {
      Alert.alert('Error', 'Vendor ID not found');
      return;
    }

    // Check if trying to enable and already at limit
    if (!currentValue && bestSellerCount >= 2) {
      Alert.alert(
        'Limit Reached',
        'You can only mark up to 2 items as Best Sellers. Please unmark one first.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_best_seller: !currentValue })
        .eq('id', itemId)
        .eq('vendor_id', vendorId); // Security: ensure vendor can only update their own items

      if (error) throw error;

      // Update local state
      setMenuItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, is_best_seller: !currentValue } : item
        )
      );
    } catch (error: any) {
      console.error('Error updating best seller:', error);
      Alert.alert('Error', error.message || 'Failed to update best seller status');
    } finally {
      setIsUpdating(false);
    }
  };

  // Toggle recommended status
  const toggleRecommended = async (itemId: string, currentValue: boolean) => {
    if (!vendorId) {
      Alert.alert('Error', 'Vendor ID not found');
      return;
    }

    // Check if trying to enable and already at limit
    if (!currentValue && recommendedCount >= 2) {
      Alert.alert(
        'Limit Reached',
        'You can only mark up to 2 items as Recommended. Please unmark one first.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_recommended: !currentValue })
        .eq('id', itemId)
        .eq('vendor_id', vendorId); // Security: ensure vendor can only update their own items

      if (error) throw error;

      // Update local state
      setMenuItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, is_recommended: !currentValue } : item
        )
      );
    } catch (error: any) {
      console.error('Error updating recommended:', error);
      Alert.alert('Error', error.message || 'Failed to update recommended status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }}>
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading menu items...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Featured Items</Text>
            <Text style={styles.subtitle}>
              Highlight your best items to customers
            </Text>
          </View>
        </View>

        {/* Main Content */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={Colors.light.primary} />
            <Text style={styles.infoText}>
              Select up to 2 items for each category to feature in your customer app
            </Text>
          </View>

          {/* Best Sellers Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="star" size={22} color={Colors.light.primary} />
                <Text style={styles.sectionTitle}>Best Sellers</Text>
              </View>
              <View style={styles.counterBadge}>
                <Text style={styles.counterText}>{bestSellerCount}/2</Text>
              </View>
            </View>
            <Text style={styles.sectionDescription}>
              These items will appear in the "Popular" section of the customer app
            </Text>

            {menuItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="restaurant-outline" size={48} color={Colors.light.icon} />
                <Text style={styles.emptyStateText}>
                  No menu items yet. Add items in the Menu tab first.
                </Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {menuItems.map((item) => (
                  <View
                    key={`best-${item.id}`}
                    style={[
                      styles.itemCard,
                      item.is_best_seller && styles.itemCardActive
                    ]}
                  >
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                    ) : (
                      <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                        <Ionicons name="image-outline" size={24} color={Colors.light.icon} />
                      </View>
                    )}
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {item.categories && (
                        <Text style={styles.itemCategory}>{item.categories.name}</Text>
                      )}
                      <Text style={styles.itemPrice}>₱{item.price.toFixed(2)}</Text>
                    </View>
                    <Switch
                      value={item.is_best_seller}
                      onValueChange={() => toggleBestSeller(item.id, item.is_best_seller)}
                      trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
                      thumbColor={item.is_best_seller ? '#FFFFFF' : '#f4f3f4'}
                      ios_backgroundColor={Colors.light.border}
                      disabled={isUpdating}
                    />
                    {item.is_best_seller && (
                      <View style={styles.activeBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={Colors.light.primary} />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Recommended Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="thumbs-up" size={22} color={Colors.light.primary} />
                <Text style={styles.sectionTitle}>Recommended Items</Text>
              </View>
              <View style={styles.counterBadge}>
                <Text style={styles.counterText}>{recommendedCount}/2</Text>
              </View>
            </View>
            <Text style={styles.sectionDescription}>
              These items will appear in the "Recommended" section of the customer app
            </Text>

            {menuItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="restaurant-outline" size={48} color={Colors.light.icon} />
                <Text style={styles.emptyStateText}>
                  No menu items yet. Add items in the Menu tab first.
                </Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {menuItems.map((item) => (
                  <View
                    key={`rec-${item.id}`}
                    style={[
                      styles.itemCard,
                      item.is_recommended && styles.itemCardActive
                    ]}
                  >
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                    ) : (
                      <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                        <Ionicons name="image-outline" size={24} color={Colors.light.icon} />
                      </View>
                    )}
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {item.categories && (
                        <Text style={styles.itemCategory}>{item.categories.name}</Text>
                      )}
                      <Text style={styles.itemPrice}>₱{item.price.toFixed(2)}</Text>
                    </View>
                    <Switch
                      value={item.is_recommended}
                      onValueChange={() => toggleRecommended(item.id, item.is_recommended)}
                      trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
                      thumbColor={item.is_recommended ? '#FFFFFF' : '#f4f3f4'}
                      ios_backgroundColor={Colors.light.border}
                      disabled={isUpdating}
                    />
                    {item.is_recommended && (
                      <View style={styles.activeBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={Colors.light.primary} />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
