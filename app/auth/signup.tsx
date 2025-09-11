import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../supabaseClient';
import { router } from 'expo-router'; // ✅ use expo-router instead of navigation

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Vendor'); // default role

  const handleSignup = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role }, // store role in user metadata
      },
    });

    if (error) {
      Alert.alert('Signup Error', error.message);
    } else {
      Alert.alert('Success', 'Account created! Please verify your email.');
      router.push('/auth/login'); // ✅ correct path for login
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
          onValueChange={(value) => setRole(value)}
          style={styles.picker}
        >
          <Picker.Item label="Vendor" value="Vendor" />
          <Picker.Item label="Deliverer" value="Deliverer" />
        </Picker>
      </View>

      <Button title="Sign Up" onPress={handleSignup} />

      <Text
        style={styles.link}
        onPress={() => router.push('/auth/login')} // ✅ fixed navigation
      >
        Already have an account? Login
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff', // white background
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#000',
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
    color: '#000',
  },
  link: {
    marginTop: 15,
    textAlign: 'center',
    color: '#007BFF',
  },
});
