import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../supabaseClient';
import { styles } from '../../../styles/vendor/settings.styles';
import { Colors } from '../../../constants/Colors';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [minimumOrder, setMinimumOrder] = useState('');
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [tempBusinessName, setTempBusinessName] = useState('');
  const [isEditingBusinessName, setIsEditingBusinessName] = useState(false);
  const [phone, setPhone] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [businessAddress, setBusinessAddress] = useState<string | null>(null);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [tempBusinessAddress, setTempBusinessAddress] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Not logged in');
        return;
      }

      setUserId(user.id);

      // Fetch vendor settings and business info
      const { data, error } = await supabase
        .from('vendors')
        .select('delivery_fee, minimum_order, header_image_url, business_name, business_address, latitude, longitude')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setDeliveryFee(data.delivery_fee.toString());
        setMinimumOrder(data.minimum_order.toString());
        setHeaderImageUrl(data.header_image_url || null);
        setBusinessName(data.business_name || '');
        setLatitude(data.latitude ? data.latitude.toString() : '');
        setLongitude(data.longitude ? data.longitude.toString() : '');

        // Use stored address or reverse geocode
        if (data.business_address) {
          setBusinessAddress(data.business_address);
        } else if (data.latitude && data.longitude) {
          await reverseGeocode(Number(data.latitude), Number(data.longitude));
        }
      }

      // Fetch profile info (phone and profile picture)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('profile_picture_url, phone')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else if (profileData) {
        setProfilePictureUrl(profileData.profile_picture_url);
        setPhone(profileData.phone || '');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const pickHeaderImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission required', 'Please allow gallery access.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadHeaderImage(result.assets[0]);
    }
  };

  const uploadHeaderImage = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!userId) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    setUploading(true);
    try {
      // Compress image
      const compressed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Upload to Supabase Storage
      const fileName = `header_${userId}_${Date.now()}.jpg`;
      const response = await fetch(compressed.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('vendor-headers')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('vendor-headers')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      // Update database
      const { error: updateError } = await supabase
        .from('vendors')
        .update({ header_image_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setHeaderImageUrl(publicUrl);
      Alert.alert('Success', 'Header image updated successfully!');
    } catch (err: any) {
      console.error('Upload error:', err);
      Alert.alert('Error', err.message || 'Failed to upload header image');
    } finally {
      setUploading(false);
    }
  };

  const pickProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission required', 'Please allow gallery access.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadProfileImage(result.assets[0]);
    }
  };

  const uploadProfileImage = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!userId) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    setUploadingProfile(true);
    try {
      // Compress image
      const compressed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Upload to Supabase Storage
      const fileName = `profile_${userId}_${Date.now()}.jpg`;
      const filePath = `vendors/${fileName}`;
      const response = await fetch(compressed.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // Update database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setProfilePictureUrl(publicUrl);
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (err: any) {
      console.error('Upload error:', err);
      Alert.alert('Error', err.message || 'Failed to upload profile picture');
    } finally {
      setUploadingProfile(false);
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

        setBusinessAddress(formattedAddress);
        return formattedAddress;
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      // Fallback to coordinates
      setBusinessAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
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

      Alert.alert('Success', 'Business location captured! Don\'t forget to save your changes.');
    } catch (err: any) {
      console.error('Error getting location:', err);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleEditBusinessName = () => {
    setTempBusinessName(businessName);
    setIsEditingBusinessName(true);
  };

  const handleCancelBusinessNameEdit = () => {
    setTempBusinessName('');
    setIsEditingBusinessName(false);
  };

  const handleSaveBusinessName = async () => {
    if (!tempBusinessName.trim()) {
      Alert.alert('Invalid Input', 'Business name cannot be empty');
      return;
    }

    Alert.alert(
      'Confirm Change',
      `Are you sure you want to change your business name from "${businessName}" to "${tempBusinessName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Save',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                Alert.alert('Error', 'Not logged in');
                return;
              }

              const { error } = await supabase
                .from('vendors')
                .update({ business_name: tempBusinessName })
                .eq('id', user.id);

              if (error) throw error;

              setBusinessName(tempBusinessName);
              setIsEditingBusinessName(false);
              setTempBusinessName('');
              Alert.alert('Success', 'Business name updated successfully!');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
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

  const handleSave = async () => {
    // Validate inputs
    const deliveryFeeNum = parseFloat(deliveryFee);
    const minimumOrderNum = parseFloat(minimumOrder);

    if (isNaN(deliveryFeeNum) || deliveryFeeNum < 0) {
      Alert.alert('Invalid Input', 'Delivery fee must be a valid number greater than or equal to 0');
      return;
    }

    if (isNaN(minimumOrderNum) || minimumOrderNum < 0) {
      Alert.alert('Invalid Input', 'Minimum order must be a valid number greater than or equal to 0');
      return;
    }

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

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Not logged in');
        return;
      }

      // Update vendor settings (without business_name, which is handled separately)
      const { error } = await supabase
        .from('vendors')
        .update({
          delivery_fee: deliveryFeeNum,
          minimum_order: minimumOrderNum,
          business_address: businessAddress,
          latitude: latNum,
          longitude: lngNum,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update phone in profiles table
      const { error: phoneError } = await supabase
        .from('profiles')
        .update({ phone: phone })
        .eq('id', user.id);

      if (phoneError) throw phoneError;

      Alert.alert('Success', 'Settings updated successfully!');
      fetchSettings();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>
            Manage your business profile and delivery settings
          </Text>
        </View>

        {/* Profile Picture Card */}
        <View style={styles.section}>
          <View style={styles.card}>
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
                    {businessName?.charAt(0)?.toUpperCase() || 'V'}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.photoButton}
                onPress={pickProfileImage}
                disabled={uploadingProfile}
              >
                {uploadingProfile ? (
                  <ActivityIndicator size="small" color={Colors.light.text} />
                ) : (
                  <Text style={styles.photoButtonText}>Change Photo</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Personal Information Card */}
        <View style={{
          backgroundColor: Colors.light.surface,
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.light.text, marginBottom: 12 }}>
            Business Information
          </Text>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.light.text, marginBottom: 8 }}>
              Business Name
            </Text>

            {!isEditingBusinessName ? (
              <View
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  backgroundColor: Colors.light.input,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: Colors.light.border,
                  minHeight: 48,
                  justifyContent: 'space-between',
                  flexDirection: 'row',
                  alignItems: 'center',
                  opacity: 0.7,
                }}
              >
                <Text style={{ fontSize: 16, color: Colors.light.textSecondary, flex: 1 }}>
                  {businessName || 'Enter business name'}
                </Text>
                <TouchableOpacity
                  onPress={handleEditBusinessName}
                  style={{
                    padding: 4,
                  }}
                >
                  <Ionicons name="create-outline" size={20} color={Colors.light.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TextInput
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    fontSize: 16,
                    color: Colors.light.text,
                    backgroundColor: Colors.light.surface,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: Colors.light.primary,
                    marginBottom: 8,
                  }}
                  value={tempBusinessName}
                  onChangeText={setTempBusinessName}
                  placeholder="Enter your business name"
                  placeholderTextColor={Colors.light.textSecondary}
                  autoFocus
                />
                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    onPress={handleCancelBusinessNameEdit}
                    style={[styles.button, styles.buttonOutline]}
                  >
                    <Text style={[styles.buttonText, styles.buttonTextOutline]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveBusinessName}
                    style={[styles.button, styles.buttonPrimary]}
                  >
                    <Text style={[styles.buttonText, styles.buttonTextPrimary]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.light.text, marginBottom: 8 }}>
              Phone Number (Optional)
            </Text>
            <TextInput
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                fontSize: 16,
                color: Colors.light.text,
                backgroundColor: Colors.light.input,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: Colors.light.border,
              }}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter your phone number (optional)"
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Header Image Card */}
        <View style={{
          backgroundColor: Colors.light.surface,
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.light.text, marginBottom: 8 }}>
            Header Image
          </Text>
          <Text style={{ fontSize: 13, color: Colors.light.textSecondary, marginBottom: 12 }}>
            Upload a banner image for your business (16:9 aspect ratio recommended)
          </Text>

          {headerImageUrl ? (
            <View style={{ position: 'relative', marginBottom: 12 }}>
              <Image
                source={{ uri: headerImageUrl }}
                style={{
                  width: '100%',
                  height: 180,
                  borderRadius: 12,
                  backgroundColor: Colors.light.input,
                }}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  bottom: 12,
                  right: 12,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  borderRadius: 8,
                  padding: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
                onPress={pickHeaderImage}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Change</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={{
                width: '100%',
                height: 180,
                borderRadius: 12,
                backgroundColor: Colors.light.input,
                borderWidth: 2,
                borderColor: Colors.light.border,
                borderStyle: 'dashed',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={pickHeaderImage}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="large" color={Colors.light.primary} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={48} color={Colors.light.icon} />
                  <Text style={{ fontSize: 14, color: Colors.light.text, marginTop: 8, fontWeight: '600' }}>
                    Upload Header Image
                  </Text>
                  <Text style={{ fontSize: 12, color: Colors.light.textSecondary, marginTop: 4 }}>
                    Tap to select from gallery
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Delivery Fee Card */}
        <View style={{
          backgroundColor: Colors.light.surface,
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.light.text, marginBottom: 8 }}>
            Delivery Fee
          </Text>
          <Text style={{ fontSize: 13, color: Colors.light.textSecondary, marginBottom: 12 }}>
            Set the delivery fee customers will pay for orders from your restaurant
          </Text>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: Colors.light.input,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: Colors.light.border,
            paddingHorizontal: 16,
          }}>
            <Text style={{ fontSize: 16, color: Colors.light.text, marginRight: 8 }}>₱</Text>
            <TextInput
              style={{
                flex: 1,
                paddingVertical: 14,
                fontSize: 16,
                color: Colors.light.text,
              }}
              value={deliveryFee}
              onChangeText={setDeliveryFee}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={Colors.light.textSecondary}
            />
          </View>
        </View>

        {/* Minimum Order Card */}
        <View style={{
          backgroundColor: Colors.light.surface,
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.light.text, marginBottom: 8 }}>
            Minimum Order Amount
          </Text>
          <Text style={{ fontSize: 13, color: Colors.light.textSecondary, marginBottom: 12 }}>
            Set the minimum order value required for customers to place an order
          </Text>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: Colors.light.input,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: Colors.light.border,
            paddingHorizontal: 16,
          }}>
            <Text style={{ fontSize: 16, color: Colors.light.text, marginRight: 8 }}>₱</Text>
            <TextInput
              style={{
                flex: 1,
                paddingVertical: 14,
                fontSize: 16,
                color: Colors.light.text,
              }}
              value={minimumOrder}
              onChangeText={setMinimumOrder}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={Colors.light.textSecondary}
            />
          </View>
        </View>

        {/* Business Location Card */}
        <View style={{
          backgroundColor: Colors.light.surface,
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.light.text, marginBottom: 8 }}>
            Business Location
          </Text>
          <Text style={{ fontSize: 13, color: Colors.light.textSecondary, marginBottom: 16 }}>
            Set your business location for pickup navigation. This helps deliverers find your restaurant.
          </Text>

          {/* Address Display/Edit Section */}
          {!isEditingAddress ? (
            <>
              {businessAddress ? (
                <View style={styles.locationDisplay}>
                  <View style={styles.locationIconContainer}>
                    <Text style={styles.locationIcon}>📍</Text>
                  </View>
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationLabel}>Business Address</Text>
                    <Text style={styles.locationAddressText}>{businessAddress}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setTempBusinessAddress(businessAddress || '');
                      setIsEditingAddress(true);
                    }}
                    style={{
                      padding: 8,
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color={Colors.light.primary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{
                  backgroundColor: Colors.light.input,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: Colors.light.border,
                  padding: 16,
                  marginBottom: 12,
                }}>
                  <Text style={{ fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center' }}>
                    No address set. Use GPS or enter manually.
                  </Text>
                </View>
              )}

              <View style={styles.locationActions}>
                <TouchableOpacity
                  style={[styles.locationButton, styles.locationButtonPrimary]}
                  onPress={getCurrentLocation}
                  disabled={gettingLocation}
                >
                  {gettingLocation ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="location" size={20} color="#FFFFFF" />
                      <Text style={[styles.locationButtonText, styles.locationButtonTextPrimary]}>
                        Use GPS
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.locationButton, styles.locationButtonSecondary]}
                  onPress={() => {
                    setTempBusinessAddress(businessAddress || '');
                    setIsEditingAddress(true);
                  }}
                >
                  <Ionicons name="create-outline" size={20} color={Colors.light.text} />
                  <Text style={[styles.locationButtonText, styles.locationButtonTextSecondary]}>
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.light.text, marginBottom: 8 }}>
                Edit Business Address
              </Text>
              <TextInput
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  fontSize: 16,
                  color: Colors.light.text,
                  backgroundColor: Colors.light.surface,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: Colors.light.primary,
                  marginBottom: 8,
                  minHeight: 80,
                }}
                value={tempBusinessAddress}
                onChangeText={setTempBusinessAddress}
                placeholder="Enter your business address"
                placeholderTextColor={Colors.light.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                autoFocus
              />
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  onPress={() => {
                    setIsEditingAddress(false);
                    setTempBusinessAddress('');
                  }}
                  style={[styles.button, styles.buttonOutline]}
                >
                  <Text style={[styles.buttonText, styles.buttonTextOutline]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (tempBusinessAddress.trim()) {
                      setBusinessAddress(tempBusinessAddress.trim());
                      setIsEditingAddress(false);
                      Alert.alert('Success', 'Address updated! Don\'t forget to save your changes.');
                    } else {
                      Alert.alert('Error', 'Address cannot be empty');
                    }
                  }}
                  style={[styles.button, styles.buttonPrimary]}
                >
                  <Text style={[styles.buttonText, styles.buttonTextPrimary]}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {!isEditingAddress && (
            <Text style={styles.locationHint}>
              Use GPS to detect your current location or edit manually
            </Text>
          )}
        </View>

        {/* Save Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.light.surface} />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
