import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../supabaseClient';

export default function Apply() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Vendor');
  const [businessName, setBusinessName] = useState('');
  const [notes, setNotes] = useState('');

  const handleApplication = async () => {
    if (!fullName || !email || !role) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    const { error } = await supabase.from('applications').insert([
      {
        full_name: fullName,
        email,
        role,
        business_name: businessName,
        notes,
        status: 'Pending', // default status for review
      },
    ]);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Your application has been submitted! We will contact you soon.');
      setFullName('');
      setEmail('');
      setBusinessName('');
      setNotes('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vendor/Deliverer Application</Text>

      <Text style={styles.label}>Full Name</Text>
      <TextInput
        value={fullName}
        onChangeText={setFullName}
        style={styles.input}
        placeholder="Enter your full name"
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        placeholder="Enter your email"
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Role</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={role} onValueChange={(value) => setRole(value)} style={styles.picker}>
          <Picker.Item label="Vendor" value="Vendor" />
          <Picker.Item label="Deliverer" value="Deliverer" />
        </Picker>
      </View>

      <Text style={styles.label}>Business Name (if Vendor)</Text>
      <TextInput
        value={businessName}
        onChangeText={setBusinessName}
        style={styles.input}
        placeholder="Enter business name"
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Notes / Additional Info</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        style={[styles.input, { height: 80 }]}
        placeholder="Anything else you’d like us to know?"
        placeholderTextColor="#999"
        multiline
      />

      <Button title="Submit Application" onPress={handleApplication} />
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
});
