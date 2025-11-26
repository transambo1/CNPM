import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  updateDoc,
  where
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

import { app } from '../libs/firebase';
import { useAuth } from '../libs/AuthContext';

type ProductRecord = {
  id: string;
  name?: string;
  price?: number;
  img?: string;
  isActive?: boolean;   // ← dùng để ẩn khỏi menu
  category?: string | null;
  description?: string;
};

export default function RestaurantAdminProducts() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const db = useMemo(() => getFirestore(app), []);

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // tìm kiếm
  const [search, setSearch] = useState('');

  // edit/create modal
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [modalMode, setModalMode] = useState<'edit' | 'create'>('edit');
  const [formVisible, setFormVisible] = useState(false);

  // form input
  const [nameInput, setNameInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [descInput, setDescInput] = useState('');

  // ================================
  // 📌 Lấy sản phẩm của nhà hàng
  // ================================
  const fetchProducts = useCallback(async () => {
    if (!user?.restaurantId) {
      setProducts([]);
      setPageLoading(false);
      setRefreshing(false);
      return;
    }

    setRefreshing(true);

    try {
      const snap = await getDocs(
        query(collection(db, 'products'), where('restaurantId', '==', user.restaurantId))
      );

      const data = snap.docs.map(d => {
        const val: any = d.data();
        return {
          id: d.id,
          name: val.name ?? '',
          price: Number(val.price ?? 0),
          img: val.img ?? '',
          isActive: val.isActive ?? true,   // ← trạng thái hiển thị
          category: val.category ?? null,
          description: val.description ?? ''
        };
      });

      // sắp xếp: sản phẩm đang mở bán → lên trước
      data.sort((a, b) => {
        if (a.isActive === b.isActive) return (b.price ?? 0) - (a.price ?? 0);
        return Number(b.isActive) - Number(a.isActive);
      });

      setProducts(data);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải danh sách sản phẩm.');
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  }, [db, user?.restaurantId]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    if (user.role !== 'restaurant') {
      router.replace('/');
      return;
    }

    fetchProducts();
  }, [loading, user]);

  // ================================
  // 📌 Lọc sản phẩm theo tìm kiếm
  // ================================
  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter(p => {
      if (!term) return true;
      return (
        p.name?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    });
  }, [products, search]);

  // ================================
  // 📌 Ẩn / hiện khỏi menu (FIX LOGIC)
  // ================================
  const handleToggleActive = useCallback(async (product: ProductRecord) => {
    try {
      const next = !product.isActive;

      await updateDoc(doc(db, 'products', product.id), {
        isActive: next
      });

      Alert.alert(
        'Thành công',
        next ? 'Sản phẩm đã được mở bán trở lại.' : 'Sản phẩm đã bị ẩn khỏi menu.'
      );

      fetchProducts();
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái.');
    }
  }, [db, fetchProducts]);

  // ================================
  // 📌 Mở modal chỉnh sửa
  // ================================
  const openEditProduct = (product: ProductRecord) => {
    setModalMode('edit');
    setEditingProduct(product);
    setNameInput(product.name ?? '');
    setPriceInput(String(product.price ?? ''));
    setCategoryInput(product.category ?? '');
    setDescInput(product.description ?? '');
    setFormVisible(true);
  };

  // ================================
  // 📌 Mở modal tạo mới
  // ================================
  const openCreateProduct = () => {
    setModalMode('create');
    setEditingProduct(null);
    setNameInput('');
    setPriceInput('');
    setCategoryInput('');
    setDescInput('');
    setFormVisible(true);
  };

  // ================================
  // 📌 Lưu sản phẩm
  // ================================
  const handleSaveProduct = async () => {
    const name = nameInput.trim();
    const desc = descInput.trim();
    const category = categoryInput.trim();
    const price = Number(priceInput);

    if (!name) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên sản phẩm.');
      return;
    }
    if (isNaN(price) || price < 0) {
      Alert.alert('Sai giá', 'Giá phải là số ≥ 0.');
      return;
    }

    try {
      if (modalMode === 'edit' && editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), {
          name,
          price,
          category: category || null,
          description: desc
        });

        Alert.alert('Đã lưu', 'Cập nhật sản phẩm thành công.');
      } else {
        await addDoc(collection(db, 'products'), {
          restaurantId: user?.restaurantId,
          name,
          price,
          category: category || null,
          description: desc,
          isActive: true,
          createdAt: Date.now()
        });

        Alert.alert('Thành công', 'Đã thêm sản phẩm mới.');
      }

      setFormVisible(false);
      fetchProducts();
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể lưu sản phẩm.');
    }
  };

  // ================================
  // 📌 Xóa sản phẩm
  // ================================
  const handleDeleteProduct = (product: ProductRecord) => {
    Alert.alert('Xóa sản phẩm', `Bạn có chắc muốn xóa "${product.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'products', product.id));
            fetchProducts();
          } catch (err) {
            Alert.alert('Lỗi', 'Không thể xóa sản phẩm.');
          }
        }
      }
    ]);
  };

  if (loading || pageLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#00A74F" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0b1f15" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Sản phẩm của nhà hàng</Text>
          <Text style={styles.subtitle}>Quản lý giá, mô tả và trạng thái hiển thị.</Text>
        </View>
      </View>

      {/* ================= THANH TÌM KIẾM ================= */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color="#4b5563" />
        <TextInput
          placeholder="Tìm sản phẩm theo tên, mô tả, danh mục..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />

        <TouchableOpacity onPress={fetchProducts} style={styles.refreshButton}>
          <Ionicons name="refresh" size={16} color="#0b1f15" />
        </TouchableOpacity>

        <TouchableOpacity onPress={openCreateProduct} style={styles.addButton}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.addButtonText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      {/* ================= LIST ================= */}
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          filteredProducts.length === 0 ? styles.emptyList : { paddingBottom: 50 }
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Không có sản phẩm</Text>
            <Text style={styles.emptySubtitle}>Thêm sản phẩm để bắt đầu kinh doanh.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.productCard}>
            <View style={styles.productHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productCategory}>
                  {item.category || 'Chưa có danh mục'}
                </Text>
              </View>

              {/* Trạng thái hiển thị */}
              <View
                style={[
                  styles.statusTag,
                  item.isActive ? styles.statusActive : styles.statusInactive
                ]}
              >
                <Text
                  style={
                    item.isActive ? styles.statusTextActive : styles.statusTextInactive
                  }
                >
                  {item.isActive ? 'Đang bán' : 'Đã ẩn'}
                </Text>
              </View>
            </View>

            <View style={styles.productMetaRow}>
              <Ionicons name="pricetag-outline" size={16} color="#4b5563" />
              <Text style={styles.productPrice}>
                {item.price?.toLocaleString('vi-VN')}₫
              </Text>
            </View>

            {item.description ? (
              <Text style={styles.productDesc}>{item.description}</Text>
            ) : null}

            <View style={styles.actionRow}>
              {/* CHỈNH SỬA */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => openEditProduct(item)}
              >
                <Ionicons
                  name="create-outline"
                  size={16}
                  color="#0b1f15"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.secondaryText}>Sửa</Text>
              </TouchableOpacity>

              {/* ẨN/HIỆN */}
              <TouchableOpacity
                style={[styles.primaryButton, !item.isActive && styles.outlineButton]}
                onPress={() => handleToggleActive(item)}
              >
                <Ionicons
                  name={item.isActive ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color={item.isActive ? '#fff' : '#0b1f15'}
                  style={{ marginRight: 6 }}
                />

                <Text
                  style={[styles.primaryText, !item.isActive && styles.outlineText]}
                >
                  {item.isActive ? 'Ẩn khỏi menu' : 'Bán trở lại'}
                </Text>
              </TouchableOpacity>

              {/* XOÁ */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteProduct(item)}
              >
                <Ionicons name="trash-outline" size={16} color="#B91C1C" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* =============== MODAL SỬA/TẠO =============== */}
      <Modal visible={formVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalMode === 'edit' ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}
            </Text>

            <Text style={styles.modalSubtitle}>
              {modalMode === 'edit'
                ? editingProduct?.name
                : 'Nhập thông tin sản phẩm mới'}
            </Text>

            <TextInput
              style={styles.modalInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Tên sản phẩm"
            />

            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={priceInput}
              onChangeText={setPriceInput}
              placeholder="Giá (VNĐ)"
            />

            <TextInput
              style={styles.modalInput}
              value={categoryInput}
              onChangeText={setCategoryInput}
              placeholder="Danh mục"
            />

            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              value={descInput}
              onChangeText={setDescInput}
              placeholder="Mô tả"
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setFormVisible(false)}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSave} onPress={handleSaveProduct}>
                <Text style={styles.modalSaveText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F7FA' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#0b1f15' },
  subtitle: { color: '#4b5563', marginTop: 4 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#00A74F',
    gap: 6,
  },
  addButtonText: { color: '#fff', fontWeight: '700' },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  productHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  productName: { fontSize: 16, fontWeight: '700', color: '#0b1f15' },
  productCategory: { color: '#6b7280', marginTop: 4 },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusActive: { backgroundColor: '#E6F4EA' },
  statusInactive: { backgroundColor: '#F3F4F6' },
  statusTextActive: { color: '#0f5132', fontWeight: '700' },
  statusTextInactive: { color: '#6b7280', fontWeight: '700' },
  productMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  productPrice: { fontSize: 16, fontWeight: '800', color: '#0b1f15' },
  productDesc: { color: '#4b5563', marginBottom: 12 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flex: 1,
    justifyContent: 'center',
  },
  secondaryText: { color: '#0b1f15', fontWeight: '700' },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#00A74F',
    flex: 1,
    justifyContent: 'center',
  },
  outlineButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#00A74F',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  outlineText: { color: '#0b1f15' },
  deleteButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#FBC5BF',
    justifyContent: 'center',
  },
  emptyList: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyState: { alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0b1f15' },
  emptySubtitle: { color: '#6b7280', textAlign: 'center', paddingHorizontal: 20 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0b1f15' },
  modalSubtitle: { color: '#4b5563' },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
  modalCancel: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: { color: '#111827', fontWeight: '700' },
  modalSave: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#00A74F',
  },
  modalSaveText: { color: '#fff', fontWeight: '800' },
});
