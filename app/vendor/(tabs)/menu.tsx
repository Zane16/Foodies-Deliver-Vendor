import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../../../supabaseClient';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
}

export default function VendorMenu() {
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [newFood, setNewFood] = useState({
    name: '',
    description: '',
    price: '',
    image: null as ImagePicker.ImagePickerAsset | null,
  });

  // 1️⃣ Get logged-in vendor and fetch menu items
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user) {
          Alert.alert('Error', 'No user logged in');
          return;
        }

        if (isMounted) {
          setVendorId(user.id);
          const { data, error: fetchError } = await supabase
            .from('menuitems')
            .select('*')
            .eq('vendor_id', user.id)
            .order('created_at', { ascending: false });

          if (fetchError) throw fetchError;
          setMenu(data || []);
        }
      } catch (error: any) {
        if (isMounted) Alert.alert('Error', error.message || 'Failed to load menu');
      }
    };

    initialize();
    return () => { isMounted = false; };
  }, []);

  // 3️⃣ Pick an image from gallery
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission required', 'Please allow gallery access.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setNewFood({ ...newFood, image: result.assets[0] });
    }
  };

  // 4️⃣ Add new menu item with image upload
  const addFood = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('No active session');

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('No logged-in user');

      if (!newFood.name || !newFood.price) {
        return Alert.alert('Error', 'Name and price are required');
      }

      let image_url = '';
      if (newFood.image) {
        const fileName = `food_${Date.now()}.jpg`;
        const response = await fetch(newFood.image.uri);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);

        const arrayBuffer = await response.arrayBuffer();
        const fileBytes = new Uint8Array(arrayBuffer);

        const { error: uploadError } = await supabase.storage
          .from('menu-images')
          .upload(fileName, fileBytes, {
            contentType: 'image/jpeg'
          });

        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

        const { data: publicUrlData } = supabase.storage
          .from('menu-images')
          .getPublicUrl(fileName);

        image_url = publicUrlData.publicUrl;
      }

      const rowToInsert = {
        vendor_id: user.id,
        name: newFood.name,
        description: newFood.description,
        price: parseFloat(newFood.price),
        image_url,
      };

      const { error: insertError } = await supabase
        .from('menuitems')
        .insert([rowToInsert]);

      if (insertError) throw insertError;

      Alert.alert('Success!', 'Food item added successfully!');
      setNewFood({ name: '', description: '', price: '', image: null });
      fetchMenu();

    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add food');
    }
  };

  // 5️⃣ Fetch menu items
  const fetchMenu = async () => {
    if (!vendorId) return;
    try {
      const { data, error } = await supabase
        .from('menuitems')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMenu(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load menu');
    }
  };

  // 6️⃣ Delete item
  const deleteFood = async (id: string) => {
    try {
      const { error } = await supabase
        .from('menuitems')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMenu(prevMenu => prevMenu.filter(item => item.id !== id));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete item');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Menu</Text>

      <FlatList
        data={menu}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            {item.image_url && <Image source={{ uri: item.image_url }} style={styles.image} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.foodName}>{item.name} - ₱{item.price}</Text>
              <Text>{item.description}</Text>
            </View>
            <Button title="Delete" color="red" onPress={() => deleteFood(item.id)} />
          </View>
        )}
      />

      <Text style={styles.subtitle}>Add New Food</Text>
      <TextInput
        style={styles.input}
        placeholder="Food Name"
        value={newFood.name}
        onChangeText={(text) => setNewFood({ ...newFood, name: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="Description"
        value={newFood.description}
        onChangeText={(text) => setNewFood({ ...newFood, description: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="Price"
        keyboardType="numeric"
        value={newFood.price}
        onChangeText={(text) => setNewFood({ ...newFood, price: text })}
      />
      <Button title="Pick Image" onPress={pickImage} />
      {newFood.image && <Text>Selected: {newFood.image.uri.split('/').pop()}</Text>}
      <Button title="Add Food" onPress={addFood} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 5 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  foodName: { fontSize: 18, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginVertical: 5, borderRadius: 5 },
  image: { width: 60, height: 60, borderRadius: 5, marginRight: 10 },
});
