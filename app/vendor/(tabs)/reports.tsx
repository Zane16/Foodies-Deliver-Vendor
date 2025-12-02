import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { supabase } from '../../../supabaseClient';
import { styles } from '../../../styles/vendor/reports.styles';

type TimeRange = 'day' | 'week' | 'month';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  total_price: number;
  delivery_fee: number;
  created_at: string;
  completed_at: string;
  items: OrderItem[];
}

interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  deliveryFees: number;
  netRevenue: number;
  topSellingItems: { name: string; quantity: number; revenue: number }[];
}

export default function VendorReports() {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesData>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    deliveryFees: 0,
    netRevenue: 0,
    topSellingItems: [],
  });
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

  const fetchSalesData = async () => {
    if (!vendorId) return;

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

      console.log('Fetching orders for vendor:', vendorId);
      console.log('Time range:', timeRange);
      console.log('Start date:', startDate.toISOString());

      // Fetch completed orders - use created_at as fallback if completed_at doesn't exist
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total_price, delivery_fee, created_at, completed_at, items')
        .eq('vendor_id', vendorId)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      console.log('Fetched orders:', orders?.length || 0);
      console.log('Orders data:', orders);

      const completedOrders = orders as Order[];

      // Calculate metrics
      const totalRevenue = completedOrders.reduce((sum, order) => {
        const price = Number(order.total_price) || 0;
        return sum + price;
      }, 0);
      const totalOrders = completedOrders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const deliveryFees = completedOrders.reduce((sum, order) => {
        const fee = Number(order.delivery_fee) || 0;
        return sum + fee;
      }, 0);
      const netRevenue = totalRevenue - deliveryFees;

      console.log('Calculated metrics:', {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        deliveryFees,
        netRevenue,
      });

      // Calculate top selling items
      const itemMap: { [key: string]: { quantity: number; revenue: number } } = {};

      completedOrders.forEach(order => {
        if (Array.isArray(order.items)) {
          order.items.forEach(item => {
            if (!itemMap[item.name]) {
              itemMap[item.name] = { quantity: 0, revenue: 0 };
            }
            itemMap[item.name].quantity += item.quantity;
            itemMap[item.name].revenue += item.price * item.quantity;
          });
        }
      });

      const topSellingItems = Object.entries(itemMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 3);

      console.log('Top selling items:', topSellingItems);

      setSalesData({
        totalRevenue,
        totalOrders,
        averageOrderValue,
        deliveryFees,
        netRevenue,
        topSellingItems,
      });
    } catch (err: any) {
      console.error('Error fetching sales data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) {
      fetchSalesData();
    }
  }, [vendorId, timeRange]);

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
            <Text style={styles.title}>Sales Reports</Text>
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
            <Text style={styles.loadingText}>Loading reports...</Text>
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
                <Text style={styles.summaryLabel}>Total Revenue</Text>
                <Text style={styles.summaryValue}>{formatCurrency(salesData.totalRevenue)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Orders</Text>
                <Text style={styles.summaryValue}>{salesData.totalOrders}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Average Order</Text>
                <Text style={styles.summaryValue}>{formatCurrency(salesData.averageOrderValue)}</Text>
              </View>
            </View>

            {/* Revenue Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Revenue Details</Text>
              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Gross Revenue</Text>
                  <Text style={styles.detailValue}>{formatCurrency(salesData.totalRevenue)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Delivery Fees</Text>
                  <Text style={[styles.detailValue, styles.detailDeduction]}>
                    -{formatCurrency(salesData.deliveryFees)}
                  </Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabelTotal}>Net Revenue</Text>
                  <Text style={styles.detailValueTotal}>{formatCurrency(salesData.netRevenue)}</Text>
                </View>
              </View>
            </View>

            {/* Top Selling Items */}
            {salesData.topSellingItems.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top 3 Selling Items</Text>
                <View style={styles.topItemsCard}>
                  {salesData.topSellingItems.map((item, index) => (
                    <View key={index}>
                      <View style={styles.topItemRow}>
                        <View style={styles.topItemLeft}>
                          <View style={styles.topItemRank}>
                            <Text style={styles.topItemRankText}>{index + 1}</Text>
                          </View>
                          <View style={styles.topItemInfo}>
                            <Text style={styles.topItemName}>{item.name}</Text>
                            <Text style={styles.topItemQuantity}>{item.quantity} sold</Text>
                          </View>
                        </View>
                        <Text style={styles.topItemRevenue}>{formatCurrency(item.revenue)}</Text>
                      </View>
                      {index < salesData.topSellingItems.length - 1 && (
                        <View style={styles.topItemDivider} />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Empty State */}
            {salesData.totalOrders === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={64} color={Colors.light.icon} />
                <Text style={styles.emptyStateTitle}>No Sales Data</Text>
                <Text style={styles.emptyStateText}>
                  No completed orders in this time period
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
