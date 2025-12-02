import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Colors } from "../../../constants/Colors";

export default function DelivererLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366F1', // TEST: Primary Purple for active tab
        tabBarInactiveTintColor: '#9CA3AF', // TEST: Light Gray for inactive tab
        tabBarStyle: {
          backgroundColor: '#FFFFFF', // TEST: White tab bar
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB', // TEST: Light Gray border
          paddingBottom: 8,
          paddingTop: 8,
          height: 68,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="Orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{
          title: "Reviews",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="star-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="deliverer-dashboard"
        options={{
          href: null, // Hidden from tab bar
          title: "Dashboard",
        }}
      />
      <Tabs.Screen
        name="OrderDetails"
        options={{
          href: null, // This hides it from the tab bar
          title: "Order Details",
        }}
      />
      <Tabs.Screen
        name="map-navigation"
        options={{
          href: null, // Hidden from tab bar
          title: "Navigation",
        }}
      />
      <Tabs.Screen
        name="message-chat"
        options={{
          href: null, // Hidden from tab bar
          title: "Chat",
        }}
      />
    </Tabs>
  );
}