import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../supabaseClient';

// Configuration - Use environment variable in production
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://foodies-36h92bu6x-zane16s-projects.vercel.app';

// File size limit (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Colors - matching your signup design
const Colors = {
  light: {
    background: '#F8F9FA',
    surface: '#FFFFFF',
    primary: '#FF6B35',
    text: '#1A1A1A',
    icon: '#6B7280',
    border: '#E5E7EB',
    input: '#F9FAFB',
    placeholder: '#9CA3AF',
    success: '#10B981',
    error: '#EF4444',
  },
};

// Email validation helper
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ✅ File upload component (images only)
function FileUpload({
  label,
  role,
  uploadedFiles,
  setUploadedFiles,
}: {
  label: string;
  role: string;
  uploadedFiles: { uri: string; url?: string; progress?: number; error?: string }[];
  setUploadedFiles: React.Dispatch<
    React.SetStateAction<{ uri: string; url?: string; progress?: number; error?: string }[]>
  >;
}) {
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert('Permission denied', 'You need to allow access to your photos.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      selectionLimit: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      
      // Validate file size
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        return Alert.alert('File too large', 'Please select an image under 5MB');
      }

      // Compress image before upload
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        const files = [{ uri: compressed.uri, progress: 0 }];
        setUploadedFiles((prev) => [...prev, ...files]);
        uploadFile(files[0], uploadedFiles.length);
      } catch (error) {
        console.error('Image compression error:', error);
        Alert.alert('Error', 'Failed to process image. Please try another.');
      }
    }
  };

  const uploadFile = async (
    file: { uri: string; url?: string; progress?: number; error?: string },
    index: number
  ) => {
    try {
      setUploadedFiles((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], progress: 10, error: undefined };
        return updated;
      });

      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();

      const fileExt = file.uri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${index}.${fileExt}`;
      const filePath = `${role.toLowerCase()}s/${fileName}`;

      setUploadedFiles((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], progress: 50 };
        return updated;
      });

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, arrayBuffer, { 
          contentType: `image/${fileExt}`,
          upsert: false 
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;

      setUploadedFiles((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], url: publicUrl, progress: 100 };
        return updated;
      });
    } catch (err) {
      console.error('Upload error:', err);
      setUploadedFiles((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          progress: 0,
          error: 'Upload failed',
        };
        return updated;
      });
      Alert.alert('Upload Error', `Failed to upload ${label}. Please try again.`);
    }
  };

  const removeFile = async (index: number) => {
    const fileToRemove = uploadedFiles[index];
    
    // If file was successfully uploaded, optionally delete from Supabase
    if (fileToRemove.url) {
      try {
        const filePath = fileToRemove.url.split('/documents/')[1];
        if (filePath) {
          await supabase.storage.from('documents').remove([filePath]);
        }
      } catch (error) {
        console.error('Error removing file from storage:', error);
      }
    }
    
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
        <Ionicons name="cloud-upload-outline" size={24} color={Colors.light.primary} />
        <Text style={styles.uploadButtonText}>Select {label}</Text>
      </TouchableOpacity>
      
      {uploadedFiles.map((file, index) => (
        <View key={index} style={styles.uploadedFileCard}>
          <Image
            source={{ uri: file.url || file.uri }}
            style={styles.uploadedImage}
          />
          <View style={styles.uploadedFileInfo}>
            {file.error && (
              <View style={styles.uploadStatus}>
                <Ionicons name="close-circle" size={16} color={Colors.light.error} />
                <Text style={styles.uploadErrorText}>{file.error}</Text>
              </View>
            )}
            {file.progress !== undefined && file.progress < 100 && !file.error && (
              <View style={styles.uploadStatus}>
                <ActivityIndicator size="small" color={Colors.light.primary} />
                <Text style={styles.uploadProgressText}>Uploading {file.progress}%</Text>
              </View>
            )}
            {file.progress === 100 && (
              <View style={styles.uploadStatus}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.light.success} />
                <Text style={styles.uploadSuccessText}>Uploaded successfully</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => removeFile(index)} style={styles.removeIconButton}>
            <Ionicons name="trash-outline" size={20} color={Colors.light.error} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

export default function Apply() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Vendor');

  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [menuSummary, setMenuSummary] = useState('');
  const [organization, setOrganization] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [availability, setAvailability] = useState('');

  const [availableOrganizations, setAvailableOrganizations] = useState<string[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);

  const [vendorValidId, setVendorValidId] = useState<
    { uri: string; url?: string; progress?: number; error?: string }[]
  >([]);
  const [vendorPermit, setVendorPermit] = useState<
    { uri: string; url?: string; progress?: number; error?: string }[]
  >([]);
  const [delivererValidId, setDelivererValidId] = useState<
    { uri: string; url?: string; progress?: number; error?: string }[]
  >([]);
  const [delivererVehicleReg, setDelivererVehicleReg] = useState<
    { uri: string; url?: string; progress?: number; error?: string }[]
  >([]);

  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch organizations on component mount
  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setIsLoadingOrgs(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('organization')
        .not('organization', 'is', null)
        .neq('organization', '')
        .eq('role', 'admin');

      if (error) {
        console.error('Error fetching organizations:', error);
        return;
      }

      // Get unique organizations and sort alphabetically
      const uniqueOrgs = Array.from(
        new Set(data.map((item) => item.organization.trim()).filter(Boolean))
      ).sort();
      
      setAvailableOrganizations(uniqueOrgs);
    } catch (error) {
      console.error('Error in fetchOrganizations:', error);
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name.');
      return false;
    }

    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email.');
      return false;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return false;
    }

    if (role === 'Vendor') {
      if (!businessName.trim()) {
        Alert.alert('Validation Error', 'Please enter your business name.');
        return false;
      }
      if (!businessAddress.trim()) {
        Alert.alert('Validation Error', 'Please enter your business address.');
        return false;
      }
      if (vendorValidId.length === 0 || vendorPermit.length === 0) {
        Alert.alert('Validation Error', 'Please upload all required documents.');
        return false;
      }
    }

    if (role === 'Deliverer') {
      if (!vehicleType.trim()) {
        Alert.alert('Validation Error', 'Please enter your vehicle type.');
        return false;
      }
      if (!availability.trim()) {
        Alert.alert('Validation Error', 'Please enter your availability.');
        return false;
      }
      if (delivererValidId.length === 0 || delivererVehicleReg.length === 0) {
        Alert.alert('Validation Error', 'Please upload all required documents.');
        return false;
      }
    }

    return true;
  };

  const handleApplication = async () => {
    if (!validateForm()) return;

    const allFiles =
      role === 'Vendor'
        ? [...vendorValidId, ...vendorPermit]
        : [...delivererValidId, ...delivererVehicleReg];

    const notUploaded = allFiles.filter((f) => !f.url);
    if (notUploaded.length > 0) {
      return Alert.alert('Error', 'Please wait for all uploads to finish.');
    }

    const failedUploads = allFiles.filter((f) => f.error);
    if (failedUploads.length > 0) {
      return Alert.alert('Error', 'Some files failed to upload. Please retry or remove them.');
    }

    setIsSubmitting(true);

    try {
      const document_urls = allFiles.map((f) => f.url).filter(Boolean);
      const apiResponse = await fetch(`${API_BASE_URL}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          role: role.toLowerCase(),
          business_name: role === 'Vendor' ? businessName : null,
          business_address: role === 'Vendor' ? businessAddress : null,
          menu_summary: role === 'Vendor' ? menuSummary : null,
          vehicle_type: role === 'Deliverer' ? vehicleType : null,
          availability: role === 'Deliverer' ? availability : null,
          organization: organization || null,
          notes: notes || null,
          document_urls: document_urls,
          status: 'pending',
        }),
      });

      const data = await apiResponse.json();
      if (!apiResponse.ok) {
        throw new Error(data.error || 'Submission failed.');
      }

      Alert.alert('Success', 'Your application has been submitted!');
      // Reset form
      setFullName('');
      setEmail('');
      setBusinessName('');
      setBusinessAddress('');
      setMenuSummary('');
      setVehicleType('');
      setAvailability('');
      setOrganization('');
      setNotes('');
      setVendorValidId([]);
      setVendorPermit([]);
      setDelivererValidId([]);
      setDelivererVehicleReg([]);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Network error or server unavailable.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Application Form</Text>
          <Text style={styles.subtitle}>Join our community of vendors and deliverers</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Full Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={Colors.light.icon} style={styles.inputIcon} />
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.light.placeholder}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Email <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={Colors.light.icon} style={styles.inputIcon} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={Colors.light.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Role Selection */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              I want to apply as <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.roleContainer}>
              {['Vendor', 'Deliverer'].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleOption, role === r && styles.roleOptionSelected]}
                  onPress={() => setRole(r)}
                >
                  <Ionicons
                    name={r === 'Vendor' ? 'storefront-outline' : 'bicycle-outline'}
                    size={24}
                    color={role === r ? Colors.light.primary : Colors.light.icon}
                  />
                  <Text style={[styles.roleText, role === r && styles.roleTextSelected]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Vendor Fields */}
          {role === 'Vendor' && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Business Name <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="storefront-outline" size={20} color={Colors.light.icon} style={styles.inputIcon} />
                  <TextInput
                    value={businessName}
                    onChangeText={setBusinessName}
                    style={styles.input}
                    placeholder="Enter your business name"
                    placeholderTextColor={Colors.light.placeholder}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Business Address <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="location-outline" size={20} color={Colors.light.icon} style={styles.inputIcon} />
                  <TextInput
                    value={businessAddress}
                    onChangeText={setBusinessAddress}
                    style={styles.input}
                    placeholder="Enter your business address"
                    placeholderTextColor={Colors.light.placeholder}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Menu Summary</Text>
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <TextInput
                    value={menuSummary}
                    onChangeText={setMenuSummary}
                    style={[styles.input, styles.textArea]}
                    multiline
                    numberOfLines={4}
                    placeholder="Brief description of your menu items"
                    placeholderTextColor={Colors.light.placeholder}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <FileUpload
                label="Valid ID"
                role={role}
                uploadedFiles={vendorValidId}
                setUploadedFiles={setVendorValidId}
              />
              <FileUpload
                label="Business Permit"
                role={role}
                uploadedFiles={vendorPermit}
                setUploadedFiles={setVendorPermit}
              />
            </>
          )}

          {/* Deliverer Fields */}
          {role === 'Deliverer' && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Vehicle Type <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="car-outline" size={20} color={Colors.light.icon} style={styles.inputIcon} />
                  <TextInput
                    value={vehicleType}
                    onChangeText={setVehicleType}
                    style={styles.input}
                    placeholder="e.g., Motorcycle, Car, Bicycle"
                    placeholderTextColor={Colors.light.placeholder}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Availability <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="time-outline" size={20} color={Colors.light.icon} style={styles.inputIcon} />
                  <TextInput
                    value={availability}
                    onChangeText={setAvailability}
                    style={styles.input}
                    placeholder="e.g., Mon-Fri 9AM-5PM"
                    placeholderTextColor={Colors.light.placeholder}
                  />
                </View>
              </View>

              <FileUpload
                label="Valid ID"
                role={role}
                uploadedFiles={delivererValidId}
                setUploadedFiles={setDelivererValidId}
              />
              <FileUpload
                label="Vehicle Registration"
                role={role}
                uploadedFiles={delivererVehicleReg}
                setUploadedFiles={setDelivererVehicleReg}
              />
            </>
          )}

          {/* Organization Picker (Optional) */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Organization (Optional)</Text>
            {isLoadingOrgs ? (
              <View style={[styles.inputWrapper, styles.loadingWrapper]}>
                <ActivityIndicator size="small" color={Colors.light.primary} />
                <Text style={styles.loadingText}>Loading organizations...</Text>
              </View>
            ) : (
              <View style={[styles.inputWrapper, styles.pickerWrapper]}>
                <Ionicons name="business-outline" size={20} color={Colors.light.icon} style={styles.inputIcon} />
                <Picker
                  selectedValue={organization}
                  onValueChange={(value) => setOrganization(value)}
                  style={styles.picker}
                  dropdownIconColor={Colors.light.icon}
                >
                  <Picker.Item label="Select organization" value="" />
                  {availableOrganizations.map((org) => (
                    <Picker.Item key={org} label={org} value={org} />
                  ))}
                </Picker>
              </View>
            )}
          </View>

          {/* Additional Notes */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Additional Notes</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={4}
                placeholder="Any additional information..."
                placeholderTextColor={Colors.light.placeholder}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleApplication}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>Submitting...</Text>
              </>
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>Submit Application</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.icon,
    fontWeight: '400',
  },
  formContainer: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  required: {
    color: Colors.light.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.input,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 16,
    height: 52,
  },
  textAreaWrapper: {
    height: 120,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  pickerWrapper: {
    paddingHorizontal: 8,
  },
  loadingWrapper: {
    justifyContent: 'center',
    gap: 8,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '400',
  },
  textArea: {
    height: '100%',
  },
  picker: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 16,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.icon,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  roleOptionSelected: {
    backgroundColor: `${Colors.light.primary}10`,
    borderColor: Colors.light.primary,
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.icon,
  },
  roleTextSelected: {
    color: Colors.light.primary,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
    paddingVertical: 16,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  uploadedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  uploadedImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  uploadedFileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  uploadStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadProgressText: {
    fontSize: 14,
    color: Colors.light.icon,
    fontWeight: '500',
  },
  uploadSuccessText: {
    fontSize: 14,
    color: Colors.light.success,
    fontWeight: '500',
  },
  uploadErrorText: {
    fontSize: 14,
    color: Colors.light.error,
    fontWeight: '500',
  },
  removeIconButton: {
    padding: 8,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});