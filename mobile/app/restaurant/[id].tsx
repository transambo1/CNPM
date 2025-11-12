import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

import { app } from '../../libs/firebase';
import { useCart } from '../../libs/CartContext';

const formatCurrency = (value: number) =>
  value.toLocaleString('vi-VN', { minimumFractionDigits: 0 }) + 'đ';

type Product = {
  id: string;
  name: string;
  img: string;
  price: number;
  rating?: number;
  reviews?: number;
};

type Restaurant = {
  id: string;
  name: string;
  image: string;
  address: string;
  rating?: number;
  deliveryTime?: number;
  isOpen?: boolean;
  promoText?: string;
};

export default function RestaurantMenu() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { totalItems } = useCart();

  const [sortMode, setSortMode] = useState<'none' | 'price_asc' | 'price_desc' | 'name_az'>('none');
  const [searchQuery, setSearchQuery] = useState('');

  const db = useMemo(() => getFirestore(app), []);
  const titleText = restaurant?.name || 'Nhà hàng';

  const fetchAll = useCallback(async (options?: { silent?: boolean }) => {
    if (!id) return;
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    const restaurantId = Array.isArray(id) ? id[0] : id;

    try {
      const docRef = doc(db, 'restaurants', restaurantId);
      const rSnap = await getDoc(docRef);

      if (rSnap.exists()) {
        const r = rSnap.data() as any;
        setRestaurant({
          id: restaurantId,
          name: r.name,
          address: r.address,
          image: r.image,
          rating: r.rating ?? 4.6,
          deliveryTime: r.deliveryTime ?? r.eta ?? 20,
          isOpen: r.isOpen ?? r.open ?? true,
          promoText: r.promoText ?? r.promo ?? '',
        });
      }

      const pQuery = query(collection(db, 'products'), where('restaurantId', '==', restaurantId));
      const pSnap = await getDocs(pQuery);

      const pData = pSnap.docs.map((productDoc) => {
        const d = productDoc.data() as any;
        return {
          id: productDoc.id,
          name: d.name,
          img: d.img,
          price: Number(d.price ?? 0),
          rating: d.rating ?? undefined,
          reviews: d.reviews ?? undefined,
        } as Product;
      });

      setProducts(pData);
    } catch (error) {
      console.error('Fetch restaurant menu error:', error);
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db, id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll({ silent: true });
  }, [fetchAll]);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (searchQuery.trim().length > 0) {
      list = list.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    switch (sortMode) {
      case 'price_asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'name_az':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return list;
  }, [products, sortMode, searchQuery]);

  const renderMenuItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.menuCard}
      onPress={() =>
        router.push({ pathname: '/product/[id]', params: { id: item.id } } as never)
      }
    >
      <Image source={{ uri: item.img }} style={styles.menuImage} />
      <View style={styles.menuContent}>
        <View style={styles.menuHeader}>
          <Text style={styles.menuTitle} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.menuPrice}>{formatCurrency(item.price ?? 0)}</Text>
        </View>
        <View style={styles.menuMeta}>
          <View style={styles.metaGroup}>
            <Ionicons name="star" size={14} color="#FFC107" />
            <Text style={styles.metaText}>{(item.rating ?? 4.5).toFixed(1)}</Text>
            <Text style={styles.metaSub}>({item.reviews ?? 120})</Text>
          </View>
          <View style={styles.metaGroup}>
            <Ionicons name="flame-outline" size={14} color="#FF6B6B" />
            <Text style={styles.metaSub}>Bán chạy</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const listHeader = () => (
    <View>
      {restaurant && (
        <View style={styles.heroWrapper}>
          <Image source={{ uri: restaurant.image }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroName}>{restaurant.name}</Text>
            <Text style={styles.heroAddress} numberOfLines={1}>{restaurant.address}</Text>
            <View style={styles.heroBadges}>
              <View style={styles.badgeChip}>
                <Ionicons name="star" size={14} color="#FFC107" style={{ marginRight: 4 }} />
                <Text style={styles.badgeText}>{(restaurant.rating ?? 4.6).toFixed(1)} điểm</Text>
              </View>
              <View style={styles.badgeChip}>
                <Ionicons name="time-outline" size={14} color="#00A74F" style={{ marginRight: 4 }} />
                <Text style={styles.badgeText}>{restaurant.deliveryTime ?? 20} phút</Text>
              </View>
              <View style={styles.badgeChip}>
                <Ionicons
                  name={restaurant.isOpen ? 'checkmark-circle-outline' : 'moon-outline'}
                  size={14}
                  color="#fff"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.badgeText}>{restaurant.isOpen ? 'Đang mở cửa' : 'Đóng cửa'}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      <View style={styles.infoBanner}>
        <View style={styles.infoRow}>
          <Ionicons name="bicycle-outline" size={20} color="#00A74F" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.infoTitle}>Giao nhanh bởi Drone</Text>
            <Text style={styles.infoSubtitle}>
              Theo dõi đơn hàng trong thời gian thực ngay trên ứng dụng
            </Text>
          </View>
        </View>
        {restaurant?.promoText ? (
          <View style={styles.promoRow}>
            <Ionicons name="pricetag-outline" size={16} color="#00A74F" style={{ marginRight: 6 }} />
            <Text style={styles.promoText}>{restaurant.promoText}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Món nổi bật</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#00A74F" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View style={styles.appBar}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.push('/(tabs)'))}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>
        <Text numberOfLines={1} style={styles.appBarTitle}>{titleText}</Text>
        <TouchableOpacity
          onPress={() => router.push('/cart')}
          style={styles.cartButton}
          accessibilityLabel="Xem giỏ hàng"
        >
          <Ionicons name="cart-outline" size={24} color="#111" />
          {totalItems > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* FILTER BAR TRÊN CÙNG */}
      <View style={[styles.filterBar, { backgroundColor: '#fff', elevation: 3, zIndex: 10 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10 }}>
          {[
            { id: 'none', label: 'Tất cả' },
            { id: 'price_asc', label: 'Giá ↑' },
            { id: 'price_desc', label: 'Giá ↓' },
            { id: 'name_az', label: 'Tên A-Z' },
          ].map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.filterChip, sortMode === opt.id && styles.filterChipActive]}
              onPress={() => setSortMode(opt.id as any)}
            >
              <Text style={[styles.filterText, sortMode === opt.id && styles.filterTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm món..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* DANH SÁCH */}
      <FlatList
        data={filteredProducts}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={products.length === 0 ? styles.emptyListContent : styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="fast-food-outline" size={56} color="#A0AEC0" />
            <Text style={styles.emptyTitle}>Nhà hàng đang cập nhật menu</Text>
            <Text style={styles.emptySubtitle}>Vui lòng quay lại sau để xem thêm món hấp dẫn nhé.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A74F" colors={['#00A74F']} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F8FB' },
  appBar: {
    height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: '#E5E9F0', backgroundColor: '#fff',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F3F6',
  },
  appBarTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#111' },
  cartButton: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F3F6',
  },
  cartBadge: {
    position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  heroWrapper: { margin: 16, borderRadius: 18, overflow: 'hidden', height: 200 },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  heroContent: { position: 'absolute', bottom: 18, left: 18, right: 18 },
  heroName: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 6 },
  heroAddress: { color: '#F1F5F9', fontSize: 14 },
  heroBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  badgeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  infoBanner: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  infoSubtitle: { marginTop: 4, color: '#64748B', fontSize: 13, lineHeight: 18 },
  promoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#E6F7EF' },
  promoText: { color: '#008D4C', fontWeight: '600' },
  sectionTitle: { marginTop: 26, marginBottom: 12, marginHorizontal: 16, fontSize: 20, fontWeight: '700', color: '#111' },
  listContent: { paddingBottom: 32, paddingHorizontal: 16 },
  emptyListContent: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 32 },
  menuCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  menuImage: { width: 92, height: 92, borderRadius: 14, marginRight: 12, backgroundColor: '#F1F5F9' },
  menuContent: { flex: 1, justifyContent: 'space-between' },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  menuTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111' },
  menuPrice: { fontSize: 15, fontWeight: '700', color: '#00A74F' },
  menuMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  metaGroup: { flexDirection: 'row', alignItems: 'center' },
  metaText: { marginLeft: 6, fontSize: 13, color: '#111', fontWeight: '600' },
  metaSub: { marginLeft: 4, fontSize: 12, color: '#6B7280' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 12, color: '#111' },
  emptySubtitle: { marginTop: 4, fontSize: 14, color: '#6B7280', textAlign: 'center' },
  filterBar: { marginTop: 10, marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E5E' },

  filterChipActive: {
    backgroundColor: '#00A74F',
    borderColor: '#00A74F',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111',
  },
  filterTextActive: {
    color: '#fff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 36,
    marginHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
    color: '#111',
  },

});
