import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../../supabaseClient';

// Colors - matching your design system
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

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string | null;
  image_url?: string | null;
  categories?: Category;
}     




export default function VendorMenu() {
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newFood, setNewFood] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image: null as ImagePicker.ImagePickerAsset | null,
  });

  // Get logged-in vendor and fetch menu items
  useEffect(() => {
    let isMounted = true;

    const fetchVendorAndMenu = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user) {
          Alert.alert('Error', 'No user logged in');
          return;
        }

        // In new schema: vendor.id = user.id (vendor IS a profile)
        const vendorId = user.id;
        setVendorId(vendorId);
        
        // Fetch categories from database
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name')
          .eq('vendor_id', vendorId)
          .order('name');

        if (categoriesError) throw categoriesError;
        
        // Set categories state with the fetched data
        setCategories(categoriesData || []);

        // Fetch menu items with their categories
        const { data: menuData, error: menuError } = await supabase
          .from('menu_items')
          .select(`
            *,
            categories (
              id,
              name
            )
          `)
          .eq('vendor_id', vendorId)
          .order('created_at', { ascending: false });

        if (menuError) throw menuError;
        setMenu(menuData || []);
        
      } catch (error: any) {
        console.error('Error fetching data:', error);
        if (isMounted) {
          Alert.alert('Error', error.message || 'Failed to load data');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchVendorAndMenu();
    return () => { isMounted = false; };
  }, []);

  // Pick an image from gallery
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

  // Add new category
  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    
    if (categories.some(cat => cat.name === newCategoryName.trim())) {
      Alert.alert('Error', 'This category already exists');
      return;
    }

    if (!vendorId) {
      Alert.alert('Error', 'Vendor ID not found');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ 
          name: newCategoryName.trim(),
          vendor_id: vendorId 
        }])
        .select()
        .single();

      if (error) throw error;

      setCategories(prev => [...prev, data]);
      setNewCategoryName('');
      setShowCategoryModal(false);
      Alert.alert('Success', 'Category added successfully!');
    } catch (error: any) {
      console.error('Error adding category:', error);
      Alert.alert('Error', error.message || 'Failed to add category');
    }
  };

  // Add new menu item with image upload
  const addFood = async () => {
    try {
      setIsAdding(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('No logged-in user');

      if (!vendorId) {
        throw new Error('Vendor ID not found. Please make sure your vendor account is approved.');
      }

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
            contentType: 'image/jpeg',
          });

        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

        const { data: publicUrlData } = supabase.storage
          .from('menu-images')
          .getPublicUrl(fileName);

        image_url = publicUrlData.publicUrl;
      }

      const rowToInsert = {
        vendor_id: vendorId,
        name: newFood.name,
        description: newFood.description,
        price: parseFloat(newFood.price),
        category_id: newFood.category_id || null,
        image_url,
      };

      const { error: insertError } = await supabase.from('menu_items').insert([rowToInsert]);
      if (insertError) throw insertError;

      Alert.alert('Success!', 'Food item added successfully!');
      setNewFood({ 
        name: '', 
        description: '', 
        price: '', 
        category_id: '', 
        image: null 
      });
      setShowAddModal(false);
      fetchMenu();
    } catch (err: any) {
      console.error('Error adding food:', err);
      Alert.alert('Error', err.message || 'Failed to add food');
    } finally {
      setIsAdding(false);
    }
  };

  // Fetch menu items with categories
  const fetchMenu = async () => {
    if (!vendorId) return;
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          categories (
            id,
            name
          )
        `)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setMenu(data || []);
      
      // Fetch categories separately to ensure we have all of them
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .eq('vendor_id', vendorId)
        .order('name');

      if (categoriesError) throw categoriesError;
      
      setCategories(categoriesData || []);
    } catch (error: any) {
      console.error('Error fetching menu:', error);
      Alert.alert('Error', error.message || 'Failed to load menu');
    }
  };

  // Delete item
  const deleteFood = async (id: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this menu item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('menu_items')
                .delete()
                .eq('id', id);

              if (error) throw error;
              setMenu(prevMenu => prevMenu.filter(item => item.id !== id));
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete item');
            }
          }
        }
      ]
    );
  };

  // Filter menu by category
  const filteredMenu = selectedCategory === 'All'
    ? menu
    : menu.filter(item => item.category_id === selectedCategory);

  // Get the selected category name for display
  const selectedCategoryName = selectedCategory === 'All'
    ? 'All'
    : categories.find(cat => cat.id === selectedCategory)?.name || 'Unknown';

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading your menu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Menu</Text>
          <Text style={styles.subtitle}>Manage your food items</Text>
        </View>

        {/* Category Filter */}
        <View style={styles.categorySection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
          >
            <TouchableOpacity
              key="all"
              style={[
                styles.categoryChip,
                selectedCategory === 'All' && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategory('All')}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === 'All' && styles.categoryChipTextActive
              ]}>
                All
              </Text>
            </TouchableOpacity>

            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === category.id && styles.categoryChipActive
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === category.id && styles.categoryChipTextActive
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.addCategoryChip}
              onPress={() => setShowCategoryModal(true)}
            >
              <Ionicons name="add" size={16} color={Colors.light.primary} />
              <Text style={styles.addCategoryText}>Add Category</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Menu List */}
        {filteredMenu.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color={Colors.light.icon} />
            <Text style={styles.emptyStateTitle}>
              {selectedCategory === 'All' ? 'No menu items yet' : `No items in "${selectedCategoryName}"`}
            </Text>
            <Text style={styles.emptyStateText}>
              {selectedCategory === 'All' ? 'Add your first food item!' : 'Try selecting another category'}
            </Text>
          </View>
        ) : (
          <View style={styles.menuList}>
            {filteredMenu.map((item) => (
              <View key={item.id} style={styles.menuCard}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.menuImage} />
                ) : (
                  <View style={[styles.menuImage, styles.menuImagePlaceholder]}>
                    <Ionicons name="image-outline" size={32} color={Colors.light.icon} />
                  </View>
                )}
                <View style={styles.menuInfo}>
                  <Text style={styles.menuName}>{item.name}</Text>
                  {item.categories && (
                    <Text style={styles.menuCategory}>{item.categories.name}</Text>
                  )}
                  <Text style={styles.menuDescription} numberOfLines={2}>
                    {item.description || 'No description'}
                  </Text>
                  <Text style={styles.menuPrice}>₱{item.price.toFixed(2)}</Text>
                </View>

                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => deleteFood(item.id)}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.light.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add Food Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAddModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Food</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Food Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Name of Food*</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="fast-food-outline" size={20} color={Colors.light.icon} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter food name"
                    placeholderTextColor={Colors.light.placeholder}
                    value={newFood.name}
                    onChangeText={(text) => setNewFood({ ...newFood, name: text })}
                  />
                </View>
              </View>

              {/* Description */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Description</Text>
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter description"
                    placeholderTextColor={Colors.light.placeholder}
                    value={newFood.description}
                    onChangeText={(text) => setNewFood({ ...newFood, description: text })}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* Food Photo */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Food Photo</Text>
                <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                  {newFood.image ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: newFood.image.uri }} style={styles.imagePreview} />
                      <View style={styles.imageOverlay}>
                        <Ionicons name="camera-outline" size={24} color="#FFFFFF" />
                        <Text style={styles.imageOverlayText}>Change Image</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.imagePickerContent}>
                      <Ionicons name="camera-outline" size={32} color={Colors.light.primary} />
                      <Text style={styles.imagePickerText}>Upload an Image</Text>
                      <Text style={styles.imagePickerSubtext}>Tap to choose from gallery</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Food Category */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Food Category</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="grid-outline" size={20} color={Colors.light.icon} style={styles.inputIcon} />
                  <View style={styles.categoryPickerWrapper}>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.categoryPicker}
                    >
                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          style={[
                            styles.categoryOption,
                            newFood.category_id === category.id && styles.categoryOptionActive
                          ]}
                          onPress={() => setNewFood({ ...newFood, category_id: category.id })}
                        >
                          <Text style={[
                            styles.categoryOptionText,
                            newFood.category_id === category.id && styles.categoryOptionTextActive
                          ]}>
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </View>

              {/* Price */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Price*</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="pricetag-outline" size={20} color={Colors.light.icon} style={styles.inputIcon} />
                  <Text style={styles.currencySymbol}>₱</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor={Colors.light.placeholder}
                    keyboardType="numeric"
                    value={newFood.price}
                    onChangeText={(text) => setNewFood({ ...newFood, price: text })}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.doneButton, isAdding && styles.doneButtonDisabled]}
                  onPress={addFood}
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.doneButtonText}>Done</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.categoryModalContainer}>
          <TouchableOpacity 
            style={styles.categoryModalOverlay}
            activeOpacity={1}
            onPress={() => setShowCategoryModal(false)}
          />
          <View style={styles.categoryModalContent}>
            <Text style={styles.categoryModalTitle}>Add New Category</Text>
            <TextInput
              style={styles.categoryInput}
              placeholder="Enter category name"
              placeholderTextColor={Colors.light.placeholder}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus
            />
            <View style={styles.categoryModalActions}>
              <TouchableOpacity
                style={styles.categoryModalButton}
                onPress={() => {
                  setShowCategoryModal(false);
                  setNewCategoryName('');
                }}
              >
                <Text style={styles.categoryModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.categoryModalButton, styles.categoryModalButtonPrimary]}
                onPress={addCategory}
              >
                <Text style={styles.categoryModalButtonTextPrimary}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.light.icon,
    fontWeight: '500',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 20,
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
  categorySection: {
    paddingBottom: 16,
  },
  categoryScrollContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  addCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderStyle: 'dashed',
    gap: 4,
  },
  addCategoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.light.icon,
    textAlign: 'center',
  },
  menuList: {
    paddingHorizontal: 24,
    paddingBottom: 100,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuCard: {
    width: '47.5%',
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: 'hidden',
  },
  menuImage: {
    width: '100%',
    height: 120,
  },
  menuImagePlaceholder: {
    backgroundColor: Colors.light.input,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuInfo: {
    padding: 12,
  },
  menuName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  menuCategory: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 12,
    color: Colors.light.icon,
    marginBottom: 8,
    lineHeight: 16,
  },
  menuPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
  modalScroll: {
    padding: 24,
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.input,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  textAreaWrapper: {
    minHeight: 100,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginRight: 8,
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
  imagePickerButton: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  imagePreviewContainer: {
    position: 'relative',
    height: 200,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  imagePickerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
    marginTop: 12,
  },
  imagePickerSubtext: {
    fontSize: 14,
    color: Colors.light.icon,
    marginTop: 4,
  },
  categoryPickerWrapper: {
    flex: 1,
  },
  categoryPicker: {
    flexDirection: 'row',
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginRight: 8,
  },
  categoryOptionActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  categoryOptionTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.light.input,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  doneButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  doneButtonDisabled: {
    opacity: 0.7,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  categoryModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  categoryModalContent: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  categoryModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 16,
  },
  categoryInput: {
    backgroundColor: Colors.light.input,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 20,
  },
  categoryModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryModalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.light.input,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  categoryModalButtonPrimary: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  categoryModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  categoryModalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})
  

