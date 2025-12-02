import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { supabase } from '../../../supabaseClient';
import { styles } from '../../../styles/deliverer/analytics.styles';

type TimeRange = 'day' | 'week' | 'month';

interface Order {
  id: string;
  total_price: number;
  delivery_fee: number;
  created_at: string;
  completed_at: string;
}

interface AnalyticsData {
  totalEarnings: number;
  totalDeliveries: number;
  averageEarning: number;
  completionRate: number;
}

export default function DelivererAnalytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalEarnings: 0,
    totalDeliveries: 0,
    averageEarning: 0,
    completionRate: 0,
  });
  const [delivererId, setDelivererId] = useState<string | null>(null);

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

  const fetchAnalyticsData = async () => {
    if (!delivererId) return;

    setLoading(true);
    try {
      // Calculate date range
      const now = new Date();
      let startDate = new Date();

      if (timeRange === 'day') {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'week') {
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'month') {
        startDate.setDate(now.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
      }

      console.log('Fetching deliveries for deliverer:', delivererId);
      console.log('Time range:', timeRange);
      console.log('Start date:', startDate.toISOString());

      // Fetch completed deliveries
      const { data: completedOrders, error: completedError } = await supabase
        .from('orders')
        .select('id, total_price, delivery_fee, created_at, completed_at')
        .eq('deliverer_id', delivererId)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (completedError) {
        console.error('Supabase query error (completed):', completedError);
        throw completedError;
      }

      console.log('Fetched completed deliveries:', completedOrders?.length || 0);

      // Fetch all orders assigned to deliverer for completion rate
      const { data: allOrders, error: allError } = await supabase
        .from('orders')
        .select('id, status')
        .eq('deliverer_id', delivererId)
        .gte('created_at', startDate.toISOString());

      if (allError) {
        console.error('Supabase query error (all):', allError);
        throw allError;
      }

      const orders = completedOrders as Order[];
      const totalDeliveries = orders.length;

      // Calculate total earnings (delivery fees)
      const totalEarnings = orders.reduce((sum, order) => {
        const fee = Number(order.delivery_fee) || 0;
        return sum + fee;
      }, 0);

      const averageEarning = totalDeliveries > 0 ? totalEarnings / totalDeliveries : 0;

      // Calculate completion rate
      const totalAssigned = allOrders?.length || 0;
      const completionRate = totalAssigned > 0 ? (totalDeliveries / totalAssigned) * 100 : 0;

      console.log('Calculated analytics:', {
        totalEarnings,
        totalDeliveries,
        averageEarning,
        completionRate,
      });

      setAnalyticsData({
        totalEarnings,
        totalDeliveries,
        averageEarning,
        completionRate,
      });
    } catch (err: any) {
      console.error('Error fetching analytics data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (delivererId) {
      fetchAnalyticsData();
    }
  }, [delivererId, timeRange]);

  const formatCurrency = (amount: number) => `₱${amount.toFixed(2)}`;

  const getTimeRangeLabel = () => {
    if (timeRange === 'day') return 'Today';
    if (timeRange === 'week') return 'Last 7 Days';
    return 'Last 30 Days';
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Delivery Analytics</Text>
            <Text style={styles.subtitle}>{getTimeRangeLabel()}</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === 'day' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('day')}
          >
            <Text style={[styles.timeRangeText, timeRange === 'day' && styles.timeRangeTextActive]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === 'week' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('week')}
          >
            <Text style={[styles.timeRangeText, timeRange === 'week' && styles.timeRangeTextActive]}>
              7 Days
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === 'month' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('month')}
          >
            <Text style={[styles.timeRangeText, timeRange === 'month' && styles.timeRangeTextActive]}>
              30 Days
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Earnings</Text>
                <Text style={styles.summaryValue}>{formatCurrency(analyticsData.totalEarnings)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Deliveries</Text>
                <Text style={styles.summaryValue}>{analyticsData.totalDeliveries}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Average Earning</Text>
                <Text style={styles.summaryValue}>{formatCurrency(analyticsData.averageEarning)}</Text>
              </View>
            </View>

            {/* Performance Card */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Performance</Text>
              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Completion Rate</Text>
                  <Text style={styles.detailValue}>{analyticsData.completionRate.toFixed(1)}%</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Completed Deliveries</Text>
                  <Text style={styles.detailValue}>{analyticsData.totalDeliveries}</Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabelTotal}>Avg per Delivery</Text>
                  <Text style={styles.detailValueTotal}>{formatCurrency(analyticsData.averageEarning)}</Text>
                </View>
              </View>
            </View>

            {/* Empty State */}
            {analyticsData.totalDeliveries === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="bicycle-outline" size={64} color={Colors.light.icon} />
                <Text style={styles.emptyStateTitle}>No Deliveries Yet</Text>
                <Text style={styles.emptyStateText}>
                  No completed deliveries in this time period
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
