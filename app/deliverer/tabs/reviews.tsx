import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../supabaseClient';
import { Colors } from '../../../constants/Colors';
import { styles } from '../../../styles/deliverer/reviews.styles';

interface Rating {
  id: string;
  order_id: string;
  customer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer: {
    full_name: string;
    profile_picture_url: string | null;
  } | null;
}

export default function DelivererReviews() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [delivererId, setDelivererId] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState<number>(0);

  useEffect(() => {
    const getDelivererId = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error getting user:', error);
        return;
      }
      if (user) {
        setDelivererId(user.id);
      }
    };
    getDelivererId();
  }, []);

  const fetchRatings = async () => {
    if (!delivererId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select(`
          id,
          order_id,
          customer_id,
          rating,
          comment,
          created_at,
          customer:profiles!ratings_customer_id_fkey(
            full_name,
            profile_picture_url
          )
        `)
        .eq('rated_entity_id', delivererId)
        .eq('type', 'deliverer')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Normalize customer data
      const normalizedRatings = (data || []).map(rating => ({
        ...rating,
        customer: Array.isArray(rating.customer) ? rating.customer[0] : rating.customer,
      }));

      setRatings(normalizedRatings);

      // Calculate average rating
      if (normalizedRatings.length > 0) {
        const avg = normalizedRatings.reduce((sum, r) => sum + r.rating, 0) / normalizedRatings.length;
        setAverageRating(avg);
      }
    } catch (err: any) {
      console.error('Error fetching ratings:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (delivererId) {
      fetchRatings();
    }
  }, [delivererId]);

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={16}
            color={star <= rating ? '#F59E0B' : Colors.light.icon}
          />
        ))}
      </View>
    );
  };

  const renderRating = ({ item }: { item: Rating }) => (
    <View style={styles.ratingCard}>
      <View style={styles.ratingHeader}>
        <View style={styles.customerInfo}>
          {item.customer?.profile_picture_url ? (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.customer.full_name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.customer?.full_name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>
              {item.customer?.full_name || 'Customer'}
            </Text>
            <Text style={styles.ratingDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        {renderStars(item.rating)}
      </View>
      {item.comment && (
        <Text style={styles.comment}>{item.comment}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Reviews</Text>
        </View>

        {ratings.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryContent}>
              <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
              {renderStars(Math.round(averageRating))}
              <Text style={styles.totalRatings}>
                Based on {ratings.length} {ratings.length === 1 ? 'review' : 'reviews'}
              </Text>
            </View>
          </View>
        )}

        {ratings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="star-outline" size={64} color={Colors.light.icon} />
            <Text style={styles.emptyStateTitle}>No Reviews Yet</Text>
            <Text style={styles.emptyStateText}>
              Customer reviews for your deliveries will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={ratings}
            keyExtractor={(item) => item.id}
            renderItem={renderRating}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
