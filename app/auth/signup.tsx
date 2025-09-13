import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../supabaseClient';

export default function Signup() {
  const allowedRoles = ['Vendor', 'Deliverer'] as const;
  type Role = (typeof allowedRoles)[number];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('Vendor');
  const [vendorName, setVendorName] = useState(''); // For Vendor business name

  const handleSignup = async () => {
    try {
      // 1️⃣ Sign up user in Supabase Auth with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: role.toLowerCase() } }, // lowercase for metadata
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned from signup.');

      const userId = authData.user.id;

      // 2️⃣ Insert role into profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: userId, role: role.toLowerCase() }]);
      if (profileError) throw profileError;

      // 3️⃣ Insert into vendors table ONLY if role is Vendor
      if (role.toLowerCase() === 'vendor') {
        if (!vendorName) return Alert.alert('Error', 'Please enter your business name.');

        // ✅ Minimal RLS-safe insertion
        const { error: vendorError } = await supabase
          .from('vendors')
          .insert([{ id: userId, name: vendorName }]);
        if (vendorError) throw vendorError;
      }

      Alert.alert('Success', 'Account created successfully!');
      router.push('/auth/login');

    } catch (err: any) {
      Alert.alert('Signup Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

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

      <Text style={styles.label}>Role</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={role}
          onValueChange={(value) => setRole(value as Role)}
          style={styles.picker}
        >
          {allowedRoles.map((r) => (
            <Picker.Item key={r} label={r} value={r} />
          ))}
        </Picker>
      </View>

      {/* Vendor business name input */}
      {role === 'Vendor' && (
        <>
          <Text style={styles.label}>Business Name</Text>
          <TextInput
            value={vendorName}
            onChangeText={setVendorName}
            style={styles.input}
            placeholder="Enter your business name"
            placeholderTextColor="#999"
          />
        </>
      )}

      <Button title="Sign Up" onPress={handleSignup} />

      <Text style={styles.link} onPress={() => router.push('/auth/login')}>
        Already have an account? Login
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#000' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 5, color: '#000' },
  input: { borderWidth: 1, borderColor: '#ccc', marginBottom: 15, padding: 10, borderRadius: 5, color: '#000', backgroundColor: '#f9f9f9' },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 15, backgroundColor: '#f9f9f9' },
  picker: { height: 50, color: '#000' },
  link: { marginTop: 15, textAlign: 'center', color: '#007BFF' },
});
