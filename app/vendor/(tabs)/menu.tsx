import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../supabaseClient';
import { styles } from '../../../styles/vendor/menu.styles';
import { Colors } from '../../../constants/Colors';

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
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [vendorInfo, setVendorInfo] = useState<{
    business_name: string;
    business_address: string;
    header_image_url?: string | null;
  } | null>(null);
  const [newFood, setNewFood] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image: null as ImagePicker.ImagePickerAsset | null,
  });
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

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

        // Fetch vendor info
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendors')
          .select('business_name, business_address, header_image_url')
          .eq('id', vendorId)
          .single();

        if (vendorError) {
          console.error('Error fetching vendor info:', vendorError);
        } else {
          setVendorInfo(vendorData);
        }

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

  // Delete category
  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${categoryName}"? Menu items in this category will not be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // First, set all menu items in this category to have no category
              const { error: updateError } = await supabase
                .from('menu_items')
                .update({ category_id: null })
                .eq('category_id', categoryId);

              if (updateError) throw updateError;

              // Then delete the category
              const { error: deleteError } = await supabase
                .from('categories')
                .delete()
                .eq('id', categoryId);

              if (deleteError) throw deleteError;

              // Update local state
              setCategories(prev => prev.filter(cat => cat.id !== categoryId));

              // If the deleted category was selected, switch to "All"
              if (selectedCategory === categoryId) {
                setSelectedCategory('All');
              }

              // Refresh menu to show updated categories
              await fetchMenu();

              Alert.alert('Success', 'Category deleted successfully!');
            } catch (error: any) {
              console.error('Error deleting category:', error);
              Alert.alert('Error', error.message || 'Failed to delete category');
            }
          }
        }
      ]
    );
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

  // Open edit modal with item data
  const openEditModal = (item: MenuItem) => {
    setIsEditMode(true);
    setEditingItem(item);
    setNewFood({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category_id: item.category_id || '',
      image: null, // Will keep existing image unless changed
    });
    setShowAddModal(true);
  };

  // Update existing menu item
  const updateFood = async () => {
    if (!editingItem) return;

    try {
      setIsAdding(true);

      if (!newFood.name || !newFood.price) {
        return Alert.alert('Error', 'Name and price are required');
      }

      let image_url = editingItem.image_url || '';

      // Only upload new image if one was selected
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

      const rowToUpdate = {
        name: newFood.name,
        description: newFood.description,
        price: parseFloat(newFood.price),
        category_id: newFood.category_id || null,
        image_url: image_url,
      };

      const { error } = await supabase
        .from('menu_items')
        .update(rowToUpdate)
        .eq('id', editingItem.id);

      if (error) throw error;

      Alert.alert('Success!', 'Food item updated successfully!');
      setNewFood({
        name: '',
        description: '',
        price: '',
        category_id: '',
        image: null
      });
      setShowAddModal(false);
      setIsEditMode(false);
      setEditingItem(null);
      fetchMenu();
    } catch (err: any) {
      console.error('Error updating food:', err);
      Alert.alert('Error', err.message || 'Failed to update food');
    } finally {
      setIsAdding(false);
    }
  };

  // Close modal and reset edit state
  const closeModal = () => {
    setShowAddModal(false);
    setIsEditMode(false);
    setEditingItem(null);
    setNewFood({
      name: '',
      description: '',
      price: '',
      category_id: '',
      image: null
    });
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
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }}>
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading your menu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }} edges={['top']}>
      <View style={styles.container}>
        {/* Vendor Header with Background Image */}
        <View style={styles.vendorHeaderContainer}>
          {vendorInfo?.header_image_url ? (
            <>
              <Image
                source={{ uri: vendorInfo.header_image_url }}
                style={styles.headerBackgroundImage}
                resizeMode="cover"
              />
              <View style={styles.headerOverlay} />
            </>
          ) : (
            <View style={styles.headerGradient} />
          )}
          <View style={styles.vendorHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.vendorName}>
                {vendorInfo?.business_name || 'Your Restaurant'}
              </Text>
              <Text style={styles.vendorDescription}>
                {vendorInfo?.business_address || 'Welcome to your menu management'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push('/vendor/(tabs)/settings')}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content Card - Contains Categories and Menu - FILLS ENTIRE SCREEN */}
        <View style={styles.contentCard}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
          {/* Featured Items Button */}
          <TouchableOpacity
            style={styles.featuredButton}
            onPress={() => router.push('/vendor/(tabs)/featured-items')}
          >
            <Ionicons name="star" size={20} color={Colors.light.primary} />
            <Text style={styles.featuredButtonText}>Manage Featured Items</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
          </TouchableOpacity>

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
              {categories.length > 0 && (
                <TouchableOpacity
                  style={styles.deleteCategoryChip}
                  onPress={() => setShowDeleteCategoryModal(true)}
                >
                  <Ionicons name="trash-outline" size={16} color={Colors.light.error} />
                  <Text style={styles.deleteCategoryText}>Delete Category</Text>
                </TouchableOpacity>
              )}
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

                  <View style={styles.menuActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => openEditModal(item)}
                    >
                      <Ionicons name="pencil-outline" size={20} color={Colors.light.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteFood(item.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color={Colors.light.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
          </ScrollView>
        </View>

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
            onPress={closeModal}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditMode ? 'Edit Food' : 'Add Food'}</Text>
              <TouchableOpacity onPress={closeModal}>
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
                <Text style={styles.label}>Food Category (Optional)</Text>
                <View style={styles.categoryPickerContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryPickerContent}
                  >
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryOption,
                          newFood.category_id === category.id && styles.categoryOptionActive
                        ]}
                        onPress={() => {
                          // Toggle behavior: if already selected, deselect it
                          if (newFood.category_id === category.id) {
                            setNewFood({ ...newFood, category_id: '' });
                          } else {
                            setNewFood({ ...newFood, category_id: category.id });
                          }
                        }}
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
                  onPress={closeModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.doneButton, isAdding && styles.doneButtonDisabled]}
                  onPress={isEditMode ? updateFood : addFood}
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.doneButtonText}>{isEditMode ? 'Update' : 'Done'}</Text>
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

      {/* Delete Category Modal */}
      <Modal
        visible={showDeleteCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDeleteCategoryModal(false)}
      >
        <View style={styles.deleteCategoryModalContainer}>
          <TouchableOpacity
            style={styles.deleteCategoryModalOverlay}
            activeOpacity={1}
            onPress={() => setShowDeleteCategoryModal(false)}
          />
          <View style={styles.deleteCategoryModalContent}>
            <View style={styles.deleteCategoryModalHeader}>
              <Text style={styles.deleteCategoryModalTitle}>Delete Category</Text>
              <TouchableOpacity onPress={() => setShowDeleteCategoryModal(false)}>
                <Ionicons name="close" size={28} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.deleteCategoryModalSubtitle}>
              Select a category to delete. Menu items in the category will not be deleted.
            </Text>

            <ScrollView style={styles.categoryListContainer} showsVerticalScrollIndicator={false}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryListItem}
                  onPress={() => {
                    setShowDeleteCategoryModal(false);
                    handleDeleteCategory(category.id, category.name);
                  }}
                >
                  <View style={styles.categoryListItemContent}>
                    <Ionicons name="pricetag-outline" size={20} color={Colors.light.text} />
                    <Text style={styles.categoryListItemText}>{category.name}</Text>
                  </View>
                  <Ionicons name="trash-outline" size={20} color={Colors.light.error} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.deleteCategoryModalCancelButton}
              onPress={() => setShowDeleteCategoryModal(false)}
            >
              <Text style={styles.deleteCategoryModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
    </SafeAreaView>
  );
}


