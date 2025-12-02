import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { supabase } from '../../../supabaseClient';
import { styles } from '../../../styles/deliverer/settings.styles';

export default function DelivererSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [profile, setProfile] = useState<{
    full_name: string;
    phone: string;
    profile_picture_url: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationAddress, setLocationAddress] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Not logged in');
        router.replace('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone, profile_picture_url, latitude, longitude')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
      setProfilePictureUrl(data.profile_picture_url);
      setLatitude(data.latitude ? data.latitude.toString() : '');
      setLongitude(data.longitude ? data.longitude.toString() : '');

      // Reverse geocode existing location
      if (data.latitude && data.longitude) {
        await reverseGeocode(Number(data.latitude), Number(data.longitude));
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (err: any) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploadingImage(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // Get file extension
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}_${Date.now()}.${ext}`;
      const filePath = `deliverers/${fileName}`;

      // For React Native, we need to create FormData
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: `image/${ext}`,
        name: fileName,
      } as any);

      // Upload to Supabase storage using FormData (using 'avatars' bucket)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, formData, {
          contentType: `image/${ext}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update profile with new URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfilePictureUrl(publicUrl);
      Alert.alert('Success', 'Profile picture updated!');
    } catch (err: any) {
      console.error('Error uploading image:', err);
      Alert.alert('Error', err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });

      if (result && result.length > 0) {
        const address = result[0];
        // Format address nicely
        const addressParts = [
          address.name,
          address.street,
          address.district,
          address.city,
          address.region,
        ].filter(Boolean);

        const formattedAddress = addressParts.length > 0
          ? addressParts.join(', ')
          : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

        setLocationAddress(formattedAddress);
        return formattedAddress;
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      // Fallback to coordinates
      setLocationAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setGettingLocation(true);

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to use your current location.'
        );
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const lat = location.coords.latitude;
      const lng = location.coords.longitude;

      setLatitude(lat.toString());
      setLongitude(lng.toString());

      // Reverse geocode to get address
      await reverseGeocode(lat, lng);

      Alert.alert('Success', 'Current location captured! Don\'t forget to save your changes.');
    } catch (err: any) {
      console.error('Error getting location:', err);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setGettingLocation(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // Validate coordinates if provided
      let latNum = null;
      let lngNum = null;

      if (latitude.trim()) {
        latNum = parseFloat(latitude);
        if (isNaN(latNum) || latNum < -90 || latNum > 90) {
          Alert.alert('Invalid Input', 'Latitude must be between -90 and 90');
          return;
        }
      }

      if (longitude.trim()) {
        lngNum = parseFloat(longitude);
        if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
          Alert.alert('Invalid Input', 'Longitude must be between -180 and 180');
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
          latitude: latNum,
          longitude: lngNum,
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully!');
      fetchProfile();
    } catch (err: any) {
      console.error('Error saving profile:', err);
      Alert.alert('Error', err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/auth/login');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }}>
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Profile Picture Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Picture</Text>
          <View style={styles.profileSection}>
            {profilePictureUrl ? (
              <Image
                source={{ uri: profilePictureUrl }}
                style={styles.profilePicture}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.profilePicturePlaceholder}>
                <Text style={styles.profilePicturePlaceholderText}>
                  {fullName?.charAt(0)?.toUpperCase() || 'D'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.photoButton}
              onPress={pickImage}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={Colors.light.text} />
              ) : (
                <Text style={styles.photoButtonText}>Change Photo</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor={Colors.light.icon}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter your phone number (optional)"
              placeholderTextColor={Colors.light.icon}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Location Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Location</Text>
          <Text style={styles.sectionDescription}>
            Set your default delivery location for accurate navigation and distance calculations.
          </Text>

          {locationAddress ? (
            <View style={styles.locationCard}>
              <View style={styles.locationIconCircle}>
                <Text style={styles.locationIcon}>📍</Text>
              </View>
              <View style={styles.locationTextGroup}>
                <Text style={styles.locationLabel}>Current Location</Text>
                <Text style={styles.locationText}>{locationAddress}</Text>
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.locationButton, gettingLocation && styles.locationButtonDisabled]}
            onPress={getCurrentLocation}
            disabled={gettingLocation}
          >
            {gettingLocation ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={{ fontSize: 20 }}>📍</Text>
                <Text style={styles.locationButtonText}>
                  {locationAddress ? 'Update Location' : 'Use Current Location'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {!locationAddress && (
            <Text style={styles.hint}>
              Tap the button above to automatically detect your current location
            </Text>
          )}
        </View>

        {/* Save Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
