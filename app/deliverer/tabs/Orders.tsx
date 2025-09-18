
import React, { useEffect, useState } from "react";
import { Alert, Button, FlatList, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../../supabaseClient"; // adjust path

interface Order {
  id: string;
  items?: any[]; // Made optional since we're not fetching it in the query
  total_price: number;
  status: string;
  created_at?: string; // Made optional since we're not fetching it in the query
  customer: Array<{
    full_name: string;
  }>; // Using customer alias for the joined profiles table
}

const AvailableOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState<any>(null);

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

  // fetch available orders
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        total_price,
        customer:profiles!fk_orders_customer(full_name)
      `)
      .eq("status", "Pending");

    if (error) {
      console.error("Fetch error:", error.message);
    } else {
      setOrders(data || []);
    }
  };

  useEffect(() => {
    fetchOrders();

    // ✅ Subscribe to real-time changes
    const channel = supabase
      .channel("orders-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchOrders(); // refresh list on changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // accept order
  const acceptOrder = async (orderId: string) => {
    if (!user) {
      Alert.alert("Error", "You must be logged in first");
      return;
    }
  
    // 🔍 Fetch role from profiles
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
  
    // ✅ Update the order
    const { error } = await supabase
      .from("orders")
      .update({
        deliverer_id: user.id,
        status: "Accepted by Deliverer",
      })
      .eq("id", orderId)
      .is("deliverer_id", null); // prevent double-claim
  
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Order accepted!");
      fetchOrders(); // Refresh the orders list
    }
  };

  // ✨ New function to update order status
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!user) {
      Alert.alert("Error", "You must be logged in first");
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId)
      .eq("deliverer_id", user.id); // ✅ only this deliverer can update

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", `Order marked as ${newStatus}`);
      fetchOrders(); // Refresh the orders list
    }
  };
  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Available Orders</Text>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ padding: 10, borderBottomWidth: 1 }}>
              <Text>Customer: {item.customer?.[0]?.full_name || 'Unknown Customer'}</Text>
              <Text>Total: ₱{item.total_price}</Text>
              <Text>Status: {item.status}</Text>
            </View>

            {/* Buttons depending on status */}
            {item.status === "Pending" && (
              <Button title="Accept" onPress={() => acceptOrder(item.id)} />
            )}

            {item.status === "Accepted by Deliverer" && (
              <Button title="Mark as Picked Up" onPress={() => updateOrderStatus(item.id, "Picked Up")} />
            )}

            {item.status === "Picked Up" && (
              <Button title="Mark as Delivered" onPress={() => updateOrderStatus(item.id, "Delivered")} />
            )}
          </View>
        )}
      />
    </View>
  );
};

export default AvailableOrders;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  card: {
    padding: 15,
    marginVertical: 8,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
  },
});
