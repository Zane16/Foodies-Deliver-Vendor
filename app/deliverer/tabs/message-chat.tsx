import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { supabase } from '../../../supabaseClient';
import { styles } from '../../../styles/deliverer/MessageChat.styles';

interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  read: boolean;
  sender?: {
    full_name: string;
    profile_picture_url: string | null;
  };
}

interface OrderInfo {
  id: string;
  customer_id: string;
  vendor_id: string;
  status: string;
  customer: {
    full_name: string;
    profile_picture_url: string | null;
  } | null;
}

const DelivererMessageChat = () => {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    initUser();
  }, []);

  const fetchOrderInfo = async () => {
    if (!customerId || !userId) return;

    try {
      // Fetch all orders between this deliverer and customer, ordered by most recent first
      const { data, error } = await supabase
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
        .eq('customer_id', customerId)
        .eq('deliverer_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.error('No orders found for this customer');
        return;
      }

      // Store all order IDs for fetching messages (most recent first)
      setOrderIds(data.map(order => order.id));

      // Use the first order for customer info (same customer across all orders)
      setOrderInfo({
        ...data[0],
        customer: Array.isArray(data[0].customer) ? data[0].customer[0] : data[0].customer,
      });
    } catch (error: any) {
      console.error('Error fetching order info:', error.message);
    }
  };

  const fetchMessages = async () => {
    if (orderIds.length === 0) return;

    try {
      // Fetch all messages from all orders with this customer
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(
            full_name,
            profile_picture_url
          )
        `)
        .in('order_id', orderIds)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const messagesWithSender = (data || []).map(msg => ({
        ...msg,
        sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
      }));

      setMessages(messagesWithSender);

      // Mark all unread messages as read
      if (userId) {
        await supabase
          .from('messages')
          .update({ read: true })
          .in('order_id', orderIds)
          .neq('sender_id', userId)
          .eq('read', false);
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error.message);
    }
  };

  useEffect(() => {
    if (customerId && userId) {
      fetchOrderInfo();
    }
  }, [customerId, userId]);

  useEffect(() => {
    if (orderIds.length > 0) {
      fetchMessages();

      // Subscribe to new messages for all orders with this customer
      const messagesSubscription = supabase
        .channel(`messages-customer-${customerId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
          },
          (payload: any) => {
            // Only refresh if message is from one of our orders
            if (orderIds.includes(payload.new?.order_id || payload.old?.order_id)) {
              fetchMessages();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesSubscription);
      };
    }
  }, [orderIds]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId || orderIds.length === 0 || loading) return;

    setLoading(true);
    try {
      // Use the most recent order (first in array since we sorted by descending date)
      const currentOrderId = orderIds[0];

      const { error } = await supabase
        .from('messages')
        .insert({
          order_id: currentOrderId,
          sender_id: userId,
          message: newMessage.trim(),
          read: false,
        });

      if (error) throw error;

      setNewMessage('');
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Error sending message:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender_id === userId;

    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer,
        ]}
      >
        {!isMyMessage && (
          <View style={styles.senderInfo}>
            {item.sender?.profile_picture_url && item.sender.profile_picture_url.trim() !== '' ? (
              <Image
                source={{ uri: item.sender.profile_picture_url }}
                style={styles.senderAvatar}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.senderAvatar, styles.senderAvatarPlaceholder]}>
                <Text style={styles.senderAvatarText}>
                  {item.sender?.full_name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble,
          ]}
        >
          {!isMyMessage && (
            <Text style={styles.senderName}>{item.sender?.full_name || 'Unknown'}</Text>
          )}
          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.theirMessageText,
            ]}
          >
            {item.message}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.theirMessageTime,
            ]}
          >
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  const getContactInfo = () => {
    if (!orderInfo) return { name: 'Loading...', image: null };

    // Show customer for deliverers (deliverer chats with customer)
    const contact = orderInfo.customer;
    return {
      name: contact?.full_name || 'Customer',
      image: contact?.profile_picture_url,
    };
  };

  const contactInfo = getContactInfo();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              {contactInfo.image && contactInfo.image.trim() !== '' ? (
                <Image
                  source={{ uri: contactInfo.image }}
                  style={styles.headerAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                  <Text style={styles.headerAvatarText}>
                    {contactInfo.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.headerName}>{contactInfo.name}</Text>
                <Text style={styles.headerSubtitle}>
                  {orderIds.length} {orderIds.length === 1 ? 'order' : 'orders'}
                </Text>
              </View>
            </View>

            <View style={{ width: 24 }} />
          </View>

          {/* Messages List */}
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>💬</Text>
              <Text style={styles.emptyStateText}>
                No messages yet. Start the conversation!
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          )}

          {/* Input Area */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={Colors.light.textSecondary}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newMessage.trim() || loading) && styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || loading}
            >
              <Ionicons
                name="send"
                size={20}
                color={!newMessage.trim() || loading ? Colors.light.textSecondary : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default DelivererMessageChat;
