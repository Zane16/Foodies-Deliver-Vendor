import { router } from "expo-router";
import React from "react";
import {
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../../styles/deliverer/MapNavigation.styles";

export default function MapNavigation() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#1E293B',
        paddingTop: 50,
        paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 8,
          }}
        >
          <Text style={{ fontSize: 28, color: '#FFFFFF', fontWeight: '600' }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
            Navigation
          </Text>
        </View>
      </View>

      {/* Web Fallback Content */}
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 24
      }}>
        <Text style={{ fontSize: 64, marginBottom: 16 }}>🗺️</Text>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 8, textAlign: 'center' }}>
          Navigation Not Available on Web
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', maxWidth: 300 }}>
          Real-time GPS navigation requires iOS or Android. Please use the mobile app to navigate deliveries.
        </Text>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            marginTop: 32,
            backgroundColor: '#5B5FDE',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
