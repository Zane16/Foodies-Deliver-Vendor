import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert('Login Error', error.message);
      return;
    }

    const user = data.user;
    const role = user?.user_metadata?.role;

    if (!role) {
      Alert.alert('Error', 'Role not found for this user.');
      return;
    }

    if (role === 'Vendor') router.push('/vendor/(tabs)/vendor-dashboard');
    else if (role === 'Deliverer') router.push('/deliverer/tabs/deliverer-dashboard');
    else Alert.alert('Error', 'Role not recognized');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        placeholder="Enter your email"
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        placeholder="Enter your password"
        placeholderTextColor="#999"
      />

      <Button title="Login" onPress={handleLogin} />

      <Text
        style={styles.link}
        onPress={() => router.push('/auth/signup')}
      >
        Don't have an account? Sign Up
      </Text>

      <Text
        style={styles.linkAlt}
        onPress={() => router.push('/auth/apply')}
      >
        Want to join as a Vendor or Deliverer? Apply here
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 15,
    padding: 10,
    borderRadius: 5,
    color: '#000',
    backgroundColor: '#f9f9f9',
  },
  link: {
    marginTop: 15,
    textAlign: 'center',
    color: '#007BFF',
  },
  linkAlt: {
    marginTop: 10,
    textAlign: 'center',
    color: '#28a745', // green link
    fontWeight: '600',
  },
});
