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

const sortOptions = [
  { key: 'all', label: 'Tất cả' },
  { key: 'price_asc', label: 'Giá tăng dần' },
  { key: 'price_desc', label: 'Giá giảm dần' },
  { key: 'popular', label: 'Phổ biến' },
  { key: 'rating', label: 'Đánh giá cao' },
];

export default function RestaurantMenu() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { totalItems } = useCart();

  const [searchText, setSearchText] = useState('');
  const [sortFilter, setSortFilter] = useState('all');

  const db = useMemo(() => getFirestore(app), []);
  const titleText = restaurant?.name ? restaurant.name : 'Nhà hàng';

  const fetchAll = useCallback(async (options?: { silent?: boolean }) => {
    if (!id) return;
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);

    const restaurantId = Array.isArray(id) ? id[0] : id;

    try {
      const docRef = doc(db, 'restaurants', restaurantId as string);
      const rSnap = await getDoc(docRef);

      if (rSnap.exists()) {
        const r = rSnap.data() as any;
        setRestaurant({
          id: restaurantId as string,
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
    let data = products;

    if (searchText.trim()) {
      data = data.filter((p) =>
        p.name.toLowerCase().includes(searchText.trim().toLowerCase())
      );
    }

    switch (sortFilter) {
      case 'price_asc':
        data = [...data].sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        data = [...data].sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        data = [...data].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case 'popular':
        data = [...data].sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0));
        break;
    }

    return data;
  }, [products, searchText, sortFilter]);

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
          <Text style={styles.menuTitle} numberOfLines={2}>
            {item.name}
          </Text>
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
            <Text style={styles.heroAddress} numberOfLines={1}>
              {restaurant.address}
            </Text>
          </View>
        </View>
      )}

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

      {/* 🔹 HEADER + FILTER */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>

        <Text numberOfLines={1} style={styles.appBarTitle}>
          {titleText}
        </Text>

        <TouchableOpacity onPress={() => router.push('/cart')} style={styles.cartButton}>
          <Ionicons name="cart-outline" size={24} color="#111" />
          {totalItems > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 🔽 FILTER ngay dưới header */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterButton,
                sortFilter === option.key && styles.filterButtonActive,
              ]}
              onPress={() => setSortFilter(option.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  sortFilter === option.key && styles.filterTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#555" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm món ăn..."
            placeholderTextColor="#888"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* 🔹 DANH SÁCH MÓN */}
      <FlatList
        data={filteredProducts}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={filteredProducts.length === 0 ? styles.emptyListContent : styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        ListHeaderComponent={listHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A74F" colors={["#00A74F"]} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F8FB' },
  appBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomColor: '#E5E9F0',
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F0F3F6',
  },
  appBarTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 18, fontWeight: '700', color: '#111',
  },
  cartButton: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F0F3F6',
  },
  cartBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  filterBar: {
    backgroundColor: '#fff',
    borderBottomColor: '#E5E9F0',
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterButton: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  filterButtonActive: { backgroundColor: '#00A74F' },
  filterText: { fontSize: 14, color: '#111', fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '700' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111' },

  heroWrapper: {
    margin: 16, borderRadius: 18, overflow: 'hidden', height: 200,
  },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  heroContent: { position: 'absolute', bottom: 18, left: 18, right: 18 },
  heroName: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 6 },
  heroAddress: { color: '#F1F5F9', fontSize: 14 },
  sectionTitle: {
    marginTop: 26, marginBottom: 12,
    marginHorizontal: 16, fontSize: 20,
    fontWeight: '700', color: '#111',
  },
  listContent: { paddingBottom: 32, paddingHorizontal: 16 },
  emptyListContent: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 32 },
  menuCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  menuImage: {
    width: 92,
    height: 92,
    borderRadius: 14,
    marginRight: 12,
    backgroundColor: '#F1F5F9',
  },
  menuContent: { flex: 1, justifyContent: 'space-between' },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  menuTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111' },
  menuPrice: { fontSize: 15, fontWeight: '700', color: '#00A74F' },
  menuMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  metaGroup: { flexDirection: 'row', alignItems: 'center' },
  metaText: { marginLeft: 6, fontSize: 13, color: '#111', fontWeight: '600' },
  metaSub: { marginLeft: 4, fontSize: 12, color: '#6B7280' },
});
