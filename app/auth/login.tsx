"use client"

import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useState } from "react"
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Colors } from "../../constants/Colors"
import { styles } from "../../styles/auth/login.styles"
import { supabase } from "../../supabaseClient"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    setIsLoading(true)
    try {
      // 1️⃣ Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      const user = data.user
      if (!user) throw new Error("No user found.")

      // 2️⃣ Fetch profile info (role + status)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", user.id)
        .single()

      if (profileError) throw profileError
      if (!profile) throw new Error("Profile not found.")

      const role = profile.role?.toLowerCase()
      const status = profile.status

      // Debug: Log the actual status value
      console.log('DEBUG - Profile status:', status, 'Type:', typeof status)
      console.log('DEBUG - Full profile:', JSON.stringify(profile))

      // 3️⃣ Check status before allowing access
      if (status === "pending") {
        throw new Error("Your account is still pending approval by the admin.")
      }
      if (status === "declined") {
        throw new Error("Your application has been declined. Contact admin for details.")
      }
      if (status !== "approved") {
        throw new Error("Invalid account status. Please contact admin.")
      }

      // 4️⃣ Redirect based on role
      if (role === "vendor") {
        router.replace("/vendor/(tabs)/OrderStatusUpdate")
      } else if (role === "deliverer") {
        router.replace("/deliverer/tabs/Orders")
      } else {
        throw new Error("This app is only for Vendors and Deliverers.")
      }
    } catch (err: any) {
      Alert.alert("Login Error", err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header / Branding */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="restaurant" size={32} color={Colors.light.primary} />
          </View>
          <Text style={styles.appName}>Foodies</Text>
          <Text style={styles.tagline}>Delicious food, delivered fast</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={Colors.light.icon} style={styles.inputIcon} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={Colors.light.placeholder}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.light.icon} style={styles.inputIcon} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter your password"
                placeholderTextColor={Colors.light.placeholder}
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={Colors.light.icon} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Links */}
          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={() => router.push("/auth/apply")} style={styles.applyLink}>
              <Text style={styles.linkAlt}>
                Want to join as a Vendor or Deliverer? <Text style={styles.linkAccent}>Apply here</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

