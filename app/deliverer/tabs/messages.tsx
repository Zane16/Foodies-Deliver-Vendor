import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { supabase } from '../../../supabaseClient';
import { styles } from '../../../styles/deliverer/Messages.styles';

interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  read: boolean;
}

interface CustomerConversation {
  customer_id: string;
  customer: {
    full_name: string;
    profile_picture_url: string | null;
  } | null;
  orderIds: string[];
  lastMessage?: Message;
  unreadCount: number;
  lastOrderDate: string;
}

const DelivererMessages = () => {
  const [conversations, setConversations] = useState<CustomerConversation[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    initUser();
  }, []);

  const fetchConversations = async () => {
    if (!userId) return;

    try {
      // Fetch all orders with customer info
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          customer_id,
          vendor_id,
          status,
          created_at,
          customer:profiles!orders_customer_id_fkey(
            full_name,
            profile_picture_url
          )
        `)
        .eq('deliverer_id', userId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        setConversations([]);
        return;
      }

      // Group orders by customer_id
      const customerMap = new Map<string, {
        customer: any;
        orderIds: string[];
        lastOrderDate: string;
      }>();

      orders.forEach(order => {
        const customerId = order.customer_id;
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customer: Array.isArray(order.customer) ? order.customer[0] : order.customer,
            orderIds: [order.id],
            lastOrderDate: order.created_at,
          });
        } else {
          const existing = customerMap.get(customerId)!;
          existing.orderIds.push(order.id);
          // Keep the most recent order date
          if (new Date(order.created_at) > new Date(existing.lastOrderDate)) {
            existing.lastOrderDate = order.created_at;
          }
        }
      });

      // Fetch messages for all orders and group by customer
      const conversationsWithMessages = await Promise.all(
        Array.from(customerMap.entries()).map(async ([customerId, data]) => {
          // Get all messages from all orders with this customer
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .in('order_id', data.orderIds)
            .order('created_at', { ascending: false });

          if (messagesError) throw messagesError;

          const lastMessage = messages && messages.length > 0 ? messages[0] : undefined;
          const unreadCount = messages
            ? messages.filter(m => m.sender_id !== userId && !m.read).length
            : 0;

          return {
            customer_id: customerId,
            customer: data.customer,
            orderIds: data.orderIds,
            lastMessage,
            unreadCount,
            lastOrderDate: data.lastOrderDate,
          };
        })
      );

      // Sort by most recent message or order date
      conversationsWithMessages.sort((a, b) => {
        const aTime = a.lastMessage?.created_at || a.lastOrderDate;
        const bTime = b.lastMessage?.created_at || b.lastOrderDate;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(conversationsWithMessages);
    } catch (error: any) {
      console.error('Error fetching conversations:', error.message);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchConversations();

      // Subscribe to new messages
      const messagesSubscription = supabase
        .channel('deliverer-messages')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
          },
          () => {
            fetchConversations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesSubscription);
      };
    }
  }, [userId]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderConversation = ({ item }: { item: CustomerConversation }) => {
    // Show customer for deliverers (deliverers chat with customers)
    const contact = item.customer;
    const contactName = contact?.full_name || 'Customer';
    const contactImage = contact?.profile_picture_url;

    return (
      <TouchableOpacity
        style={styles.conversationCard}
        onPress={() => router.push({
          pathname: '/deliverer/tabs/message-chat',
          params: { customerId: item.customer_id }
        } as any)}
      >
        <View style={styles.conversationContent}>
          {contactImage && contactImage.trim() !== '' ? (
            <Image
              source={{ uri: contactImage }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {contactName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.conversationInfo}>
            <View style={styles.conversationHeader}>
              <Text style={styles.contactName}>{contactName}</Text>
              {item.lastMessage && (
                <Text style={styles.timestamp}>
                  {formatTime(item.lastMessage.created_at)}
                </Text>
              )}
            </View>

            <View style={styles.messagePreviewRow}>
              <Text
                style={[
                  styles.messagePreview,
                  item.unreadCount > 0 && styles.messagePreviewUnread
                ]}
                numberOfLines={1}
              >
                {item.lastMessage?.message || 'Start a conversation'}
              </Text>
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>{item.unreadCount}</Text>
                </View>
              )}
            </View>

            <Text style={styles.orderInfo}>
              {item.orderIds.length} {item.orderIds.length === 1 ? 'order' : 'orders'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>

        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>💬</Text>
            <Text style={styles.emptyStateTitle}>No Messages</Text>
            <Text style={styles.emptyStateText}>
              Messages with vendors and customers will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.customer_id}
            renderItem={renderConversation}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default DelivererMessages;
