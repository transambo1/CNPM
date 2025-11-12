import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, Image, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../libs/AuthContext';
import { getFirestore, collection, query, getDocs, Timestamp } from 'firebase/firestore';
import { app } from '../../libs/firebase';
import { useCart } from '../../libs/CartContext';

/** =========================
 *        TYPES
 *  ========================= */
type Category = { id: string; name: string; image: string; };
type Suggestion = { id: string; name: string; image: string; };

type Restaurant = {
  id: string;
  name: string;
  image: string;
  address: string;
  rating?: number;
  deliveryTime?: number;
  hasPromo?: boolean;
  promoText?: string;
  category?: string;
  orders?: number;
  createdAt?: any;
};

type SelectedCategory = { id: string | null; name: string | null };

type DerivedStats = {
  avgPriceTop5?: number;
  totalOrdersFromHistory: number;
};

type QuickFilterId = 'recommended' | 'top_selling' | 'value' | 'premium';

/** =========================
 *     CONSTANTS & HELPERS
 *  ========================= */
const QUICK_FILTERS: { id: QuickFilterId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'recommended', label: 'Đề xuất', icon: 'sparkles' },
  { id: 'top_selling', label: 'Bán chạy', icon: 'flame-outline' },
  { id: 'value', label: 'Giá trị xứng đáng', icon: 'star-half-outline' },
  { id: 'premium', label: 'Ăn sang', icon: 'diamond-outline' },
];

const toMillis = (v: any | undefined) => {
  if (!v) return 0;
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === 'number') return v;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
};

const recScore = (r: Restaurant, derived?: DerivedStats) => {
  const rating = typeof r.rating === 'number' ? r.rating : 0;
  const orders = (r.orders ?? 0) + (derived?.totalOrdersFromHistory ?? 0);
  return rating * 0.7 + (orders / 100) * 0.3;
};

/** =========================
 *          HEADER
 *  ========================= */
type FoodPageHeaderProps = { searchTerm: string; onSearchChange: (v: string) => void; };
const FoodPageHeader = ({ searchTerm, onSearchChange }: FoodPageHeaderProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const { totalItems } = useCart();

  return (
    <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
      <View style={styles.addressHeader}>
        <TouchableOpacity><Ionicons name="scan-outline" size={26} color="#000" /></TouchableOpacity>
        <View style={styles.addressBox}>
          <Text style={styles.addressTitle}>GIAO TỚI</Text>
          <TouchableOpacity style={styles.addressRow}>
            <Text style={styles.addressText} numberOfLines={1}>
              {user?.address ? user.address : 'Chọn địa chỉ'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#000" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/cart')} style={styles.cartButton}>
            <Ionicons name="cart-outline" size={26} color="#000" />
            {totalItems > 0 && (
              <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{totalItems}</Text></View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <Ionicons name="person-circle-outline" size={32} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          placeholder="Bạn đang thèm gì nào?"
          style={styles.searchInput}
          placeholderTextColor="#666"
          value={searchTerm}
          onChangeText={onSearchChange}
        />
      </View>
    </SafeAreaView>
  );
};

/** =========================
 *   LIST HEADER (BANNER + FILTER + CATEGORY + SUGGESTION)
 *  ========================= */
type FoodScreenListHeaderProps = {
  categories: Category[];
  suggestions: Suggestion[];
  selectedCategory: SelectedCategory;
  onSelectCategory: (c: SelectedCategory) => void;
  activeQuickFilter: QuickFilterId;
  onQuickFilterChange: (f: QuickFilterId) => void;
  featuredRestaurant?: Restaurant | null;
};

const FoodScreenListHeader = ({
  categories, suggestions, selectedCategory, onSelectCategory,
  activeQuickFilter, onQuickFilterChange, featuredRestaurant,
}: FoodScreenListHeaderProps) => {
  const router = useRouter();

  return (
    <View style={styles.listHeaderContainer}>
      {featuredRestaurant ? (
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.bannerContainer, { padding: 0, height: 160 }]}
          onPress={() =>
            router.push({ pathname: '/restaurant/[id]', params: { id: featuredRestaurant.id } } as never)
          }
        >
          <Image source={{ uri: featuredRestaurant.image }} style={styles.bannerImage} />
          <View style={styles.bannerOverlay}>

            <Text style={styles.bannerTitle}>Nhà hàng nổi bật</Text>
            <Text style={styles.bannerSubtitle}>Order món ngay</Text>
            {!!featuredRestaurant.address && (
              <Text style={styles.bannerSubtitle} numberOfLines={1}>
                {featuredRestaurant.address}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.bannerContainer}>
          <Text style={styles.bannerTitle}>Nhà hàng nổi bật</Text>
          <Text style={styles.bannerSubtitle}>Order món ngay</Text>
        </View>
      )}


      <View style={styles.segmentContainer}>
        <TouchableOpacity style={[styles.segmentButton, styles.segmentButtonActive]}>
          <Text style={[styles.segmentText, styles.segmentTextActive]}>Giao hàng</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.segmentButton}>
          <Text style={styles.segmentText}>Đi Ăn Nhà Hàng</Text>
        </TouchableOpacity>
      </View>


      <View style={styles.quickFilterSection}>
        <Text style={styles.sectionLabel}>Thực đơn hôm nay</Text>
        {/* Categories */}
        <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll} contentContainerStyle={{ paddingRight: 20 }}>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryItem}
              onPress={() => onSelectCategory({ id: cat.id, name: cat.name })}
              onLongPress={() => router.push({ pathname: '/category/[name]', params: { name: cat.name } } as never)}
            >

              <Image source={{ uri: cat.image }} style={styles.categoryImage} />
              <Text style={styles.categoryText}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {/* Suggestions */}
      <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false}
        style={styles.suggestionScroll} contentContainerStyle={{ paddingRight: 15 }}>
        {suggestions.map((s) => (
          <TouchableOpacity
            key={s.id} style={styles.suggestionCard}
            onPress={() => onSelectCategory({ id: s.id, name: s.name })}
            onLongPress={() => router.push({ pathname: '/category/[name]', params: { name: s.name } } as never)}
          >
            <Image source={{ uri: s.image }} style={styles.suggestionImage} />
            <Text style={styles.suggestionText}>{s.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Quick filters */}
      <View style={styles.quickFilterSection}>
        <Text style={styles.sectionLabel}>Bộ lọc nổi bật</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 15 }}>
          {QUICK_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, activeQuickFilter === f.id && styles.filterChipActive]}
              onPress={() => onQuickFilterChange(f.id)}
            >
              <Ionicons
                name={f.icon}
                size={16}
                color={activeQuickFilter === f.id ? '#fff' : '#111'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.filterChipText, activeQuickFilter === f.id && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>


      <Text style={styles.sectionTitle}>Nhà hàng gần bạn</Text>
    </View>
  );
};

/** =========================
 *          MAIN
 *  ========================= */
export default function HomePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory>({ id: null, name: null });
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilterId>('recommended');
  const [featuredRestaurant, setFeaturedRestaurant] = useState<Restaurant | null>(null);


  // Derived stats
  const [derived, setDerived] = useState<Record<string, DerivedStats>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const db = getFirestore(app);

      try {
        /** Restaurants */
        const rsSnap = await getDocs(query(collection(db, 'restaurants')));
        const rs = rsSnap.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            name: data.name,
            image: data.image,
            address: data.address,
            rating: typeof data.rating === 'number' ? data.rating : data.score,
            deliveryTime:
              typeof data.deliveryTime === 'number' ? data.deliveryTime :
                typeof data.eta === 'number' ? data.eta :
                  typeof data.time === 'number' ? data.time : undefined,
            hasPromo: Boolean(data.hasPromo ?? data.promo ?? data.discount),
            promoText: data.promoText ?? data.promo ?? data.discountText ?? '',
            category: data.category ? String(data.category) : undefined,
            orders: typeof data.orders === 'number' ? data.orders : 0,
            createdAt: data.createdAt ?? data.created_at ?? data.createdAtMs ?? undefined,
          } as Restaurant;
        });
        setRestaurants(rs);
        // 🔥 Random 1 nhà hàng nổi bật
        const available = rs.filter(r => typeof r.image === "string" && r.image.trim().length > 0);
        if (available.length > 0) {
          const randomIndex = Math.floor(Math.random() * available.length);
          setFeaturedRestaurant(available[randomIndex]);
        }

        /** Categories */
        try {
          const catSnap = await getDocs(query(collection(db, 'categories')));
          setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Category[]);
        } catch { setCategories([]); }

        /** Suggestions */
        try {
          const sugSnap = await getDocs(query(collection(db, 'suggestions')));
          setSuggestions(sugSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Suggestion[]);
        } catch { setSuggestions([]); }

        /** Derived stats */
        await buildDerivedStats(db, rs.map(r => r.id), setDerived);

      } catch (e: any) {
        console.error('Fetch restaurants failed:', e);
        Alert.alert('Lỗi', 'Không thể tải dữ liệu. Kiểm tra Firestore.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearchChange = useCallback((v: string) => setSearchTerm(v), []);
  const handleSelectCategory = useCallback((c: SelectedCategory) => {
    setSelectedCategory((prev) => (prev.id === c.id && prev.name === c.name ? { id: null, name: null } : c));
  }, []);
  const handleQuickFilterChange = useCallback((f: QuickFilterId) => {
    setActiveQuickFilter((prev) => (prev === f ? 'recommended' : f));
  }, []);

  const top5ByOrdersIds = useMemo(() => {
    const withCount = restaurants.map(r => ({
      id: r.id,
      total: (r.orders ?? 0) + (derived[r.id]?.totalOrdersFromHistory ?? 0),
    }));
    return new Set(withCount.sort((a, b) => b.total - a.total).slice(0, 5).map(x => x.id));
  }, [restaurants, derived]);

  /** =============== FILTER CORE =============== */
  const filteredAndSorted = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const selectedKey = (selectedCategory.name ?? '').toLowerCase();

    // Step 1: text + EXACT category
    let list = restaurants.filter((r) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [r.name, r.address].filter(Boolean).some(v => v.toLowerCase().includes(normalizedSearch));

      const categoryStr = String(r.category ?? '').trim().toLowerCase();
      const matchesCategory =
        !selectedKey || categoryStr === selectedKey; // EXACT STRICT

      return matchesSearch && matchesCategory;
    });

    // Step 2: quick filter
    switch (activeQuickFilter) {
      case 'recommended': {
        return [...list].sort((a, b) => (recScore(b, derived[b.id]) - recScore(a, derived[a.id])));
      }
      case 'top_selling': {
        list = list.filter(r =>
          top5ByOrdersIds.has(r.id) ||
          ((r.orders ?? 0) + (derived[r.id]?.totalOrdersFromHistory ?? 0)) >= 200
        );
        return [...list].sort((a, b) =>
        (((b.orders ?? 0) + (derived[b.id]?.totalOrdersFromHistory ?? 0)) -
          ((a.orders ?? 0) + (derived[a.id]?.totalOrdersFromHistory ?? 0)))
        );
      }
      case 'premium': {
        const PREMIUM = 70000;
        list = list.filter(r => (derived[r.id]?.avgPriceTop5 ?? 0) >= PREMIUM);
        return [...list].sort((a, b) =>
          (derived[b.id]?.avgPriceTop5 ?? 0) - (derived[a.id]?.avgPriceTop5 ?? 0)
        );
      }
      case 'value': {
        const vs = (r: Restaurant) => {
          const d = derived[r.id];
          const rating = r.rating ?? 0;
          const orders = (r.orders ?? 0) + (d?.totalOrdersFromHistory ?? 0);
          const avg = d?.avgPriceTop5 ?? NaN;
          const priceFactor = !avg || !isFinite(avg) || avg <= 0 ? 0 : (40000 / avg);
          return (rating * 0.5) + (orders / 100) * 0.2 + (priceFactor) * 0.3;
        };
        return [...list].sort((a, b) => vs(b) - vs(a));
      }
      default:
        return list;
    }
  }, [restaurants, searchTerm, selectedCategory, activeQuickFilter, derived, top5ByOrdersIds]);

  /** =============== ITEM RENDER =============== */
  const renderRestaurant = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      activeOpacity={0.88}
      onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: item.id } } as never)}
    >
      <Image source={{ uri: item.image }} style={styles.restaurantImage} />
      <View style={styles.restaurantInfo}>
        <View style={styles.restaurantHeaderRow}>
          <Text style={styles.restaurantName}>{item.name}</Text>
          {item.hasPromo ? (
            <View style={styles.promoBadge}>
              <Ionicons name="pricetag-outline" size={12} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.promoBadgeText}>Ưu đãi</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.restaurantAddress} numberOfLines={1}>{item.address}</Text>

        <View style={styles.restaurantMetaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="star" size={14} color="#FFC107" style={{ marginRight: 4 }} />
            <Text style={styles.metaPrimary}>{(item.rating ?? 4.5).toFixed(1)}</Text>
          </View>
          <View style={styles.metaSeparator} />
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
            <Text style={styles.metaSecondary}>{item.deliveryTime ?? 20} phút</Text>
          </View>
          <View style={styles.metaSeparator} />
          <View style={styles.metaItem}>
            <Ionicons name="bag-handle-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
            <Text style={styles.metaSecondary}>
              {(item.orders ?? 0) + (derived[item.id]?.totalOrdersFromHistory ?? 0)}
            </Text>
          </View>
        </View>

        {item.promoText ? (
          <View style={styles.restaurantPromoRow}>
            <Ionicons name="gift-outline" size={14} color="#00A74F" style={{ marginRight: 6 }} />
            <Text style={styles.restaurantPromoText} numberOfLines={1}>{item.promoText}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FoodPageHeader searchTerm={searchTerm} onSearchChange={handleSearchChange} />
      {loading ? (
        <ActivityIndicator size="large" color="#00A74F" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredAndSorted}
          renderItem={renderRestaurant}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            <FoodScreenListHeader
              categories={categories}
              suggestions={suggestions}
              selectedCategory={selectedCategory}
              onSelectCategory={handleSelectCategory}
              activeQuickFilter={activeQuickFilter}
              onQuickFilterChange={handleQuickFilterChange}
              featuredRestaurant={featuredRestaurant}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyFilterState}>
              <Ionicons name="compass-outline" size={48} color="#A0AEC0" />
              <Text style={styles.emptyTitle}>Chưa có nhà hàng phù hợp</Text>
              <Text style={styles.emptySubtitle}>Thử đổi bộ lọc hoặc từ khóa khác nhé.</Text>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearchTerm('');
                  setSelectedCategory({ id: null, name: null });
                  setActiveQuickFilter('recommended');
                }}
              >
                <Ionicons name="refresh" size={16} color="#00A74F" style={{ marginRight: 6 }} />
                <Text style={styles.clearFiltersText}>Đặt lại bộ lọc</Text>
              </TouchableOpacity>
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={filteredAndSorted.length === 0 ? { flexGrow: 1 } : undefined}
        />
      )}
    </View>
  );
}

/** =========================
 *   BUILD DERIVED STATS
 *  ========================= */
async function buildDerivedStats(
  db: ReturnType<typeof getFirestore>,
  restaurantIds: string[],
  setDerived: React.Dispatch<React.SetStateAction<Record<string, DerivedStats>>>
) {
  const prodSnap = await getDocs(query(collection(db, 'products')));
  const prodByRestaurant: Record<string, { id: string; price: number }[]> = {};
  prodSnap.docs.forEach(d => {
    const data = d.data() as any;
    const rid = String(data.restaurantId ?? data.restaurant ?? '');
    if (!rid) return;
    const price = Number(data.price ?? 0);
    if (!prodByRestaurant[rid]) prodByRestaurant[rid] = [];
    prodByRestaurant[rid].push({ id: d.id, price });
  });

  const orderSnap = await getDocs(query(collection(db, 'orders')));
  const countByRestaurant: Record<string, Record<string, number>> = {};
  const ordersPerRestaurantFromHistory: Record<string, number> = {};
  orderSnap.docs.forEach(d => {
    const data = d.data() as any;
    const items: any[] = Array.isArray(data.items) ? data.items : [];
    items.forEach((it) => {
      const rid = String(it.restaurantId ?? data.restaurantId ?? '');
      if (!rid) return;
      const pid = String(it.id ?? it.productId ?? '');
      const qty = Number(it.quantity ?? 1);
      if (!countByRestaurant[rid]) countByRestaurant[rid] = {};
      countByRestaurant[rid][pid] = (countByRestaurant[rid][pid] ?? 0) + qty;
      ordersPerRestaurantFromHistory[rid] = (ordersPerRestaurantFromHistory[rid] ?? 0) + qty;
    });
  });

  const derived: Record<string, DerivedStats> = {};
  restaurantIds.forEach((rid) => {
    const productList = prodByRestaurant[rid] ?? [];
    const counts = countByRestaurant[rid] ?? {};

    const joined = productList.map(p => ({
      id: p.id,
      price: Number(p.price ?? 0),
      count: Number(counts[p.id] ?? 0),
    }));

    const top5 = joined.sort((a, b) => b.count - a.count).slice(0, 5);
    const avgPriceTop5 = top5.length > 0
      ? top5.reduce((s, x) => s + (x.price || 0), 0) / top5.length
      : undefined;

    derived[rid] = {
      avgPriceTop5,
      totalOrdersFromHistory: ordersPerRestaurantFromHistory[rid] ?? 0,
    };
  });

  setDerived((prev) => ({ ...prev, ...derived }));
}

/** =========================
 *          STYLES
 *  ========================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerSafeArea: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  addressHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: 10, paddingBottom: 10 },
  addressBox: { flex: 1, marginHorizontal: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cartButton: { padding: 4 },
  cartBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  addressTitle: { fontSize: 12, color: '#555', fontWeight: 'bold' },
  addressRow: { flexDirection: 'row', alignItems: 'center' },
  addressText: { fontSize: 16, fontWeight: 'bold', color: '#222', marginRight: 5 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 20, marginHorizontal: 15, paddingHorizontal: 15, height: 40, marginBottom: 15 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },

  listHeaderContainer: { backgroundColor: '#fff' },
  bannerContainer: { height: 100, backgroundColor: '#006443', marginHorizontal: 15, marginTop: 15, borderRadius: 10, padding: 15, justifyContent: 'center' },
  bannerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  bannerSubtitle: { fontSize: 14, color: '#fff' },
  segmentContainer: { flexDirection: 'row', backgroundColor: '#eee', marginHorizontal: 15, borderRadius: 20, height: 40, padding: 4, marginTop: 15 },
  segmentButton: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  segmentButtonActive: { backgroundColor: '#fff' },
  segmentText: { fontSize: 14, fontWeight: 'bold', color: '#555' },
  segmentTextActive: { color: '#000' },

  quickFilterSection: { marginTop: 22, paddingLeft: 15, paddingRight: 5 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 12 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff', marginRight: 10
  },
  filterChipActive: { backgroundColor: '#00A74F', borderColor: '#00A74F' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#111' },
  filterChipTextActive: { color: '#fff' },

  categoryScroll: { marginTop: 16, paddingLeft: 15 },
  categoryItem: { alignItems: 'center', marginRight: 15, width: 80 },
  categoryImage: { width: 60, height: 60, borderRadius: 15, backgroundColor: '#f5f5f5', marginBottom: 8 },
  categoryText: { fontSize: 12, textAlign: 'center', fontWeight: '500', color: '#444' },

  suggestionScroll: { marginTop: 20, paddingLeft: 15 },
  suggestionCard: { width: 120, height: 160, marginRight: 10, borderRadius: 10, backgroundColor: '#f5f5f5', overflow: 'hidden' },
  suggestionImage: { width: '100%', height: 110, backgroundColor: '#eee' },
  suggestionText: { fontWeight: 'bold', padding: 10 },

  footerBannerContainer: { backgroundColor: '#FF6F00', padding: 15, borderRadius: 12, marginHorizontal: 15, marginTop: 25 },
  footerText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 25, marginBottom: 10, marginLeft: 15 },

  restaurantCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14, marginHorizontal: 15, marginBottom: 12,
    borderRadius: 16, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 3
  },
  restaurantImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#f2f2f2', marginRight: 12 },
  restaurantInfo: { flex: 1 },
  restaurantHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  restaurantName: { fontSize: 16, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: 8 },
  promoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00A74F', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  promoBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  restaurantAddress: { fontSize: 13, color: '#64748B', marginTop: 4 },
  restaurantMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaPrimary: { fontSize: 13, fontWeight: '700', color: '#111' },
  metaSecondary: { fontSize: 13, fontWeight: '600', color: '#475569' },
  metaSeparator: { width: 1, height: 16, backgroundColor: '#E2E8F0', marginHorizontal: 12 },
  restaurantPromoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: '#F0FFF4', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12 },
  restaurantPromoText: { color: '#047857', fontSize: 12, fontWeight: '600', flex: 1 },

  emptyFilterState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 40 },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: '700', color: '#1F2937' },
  emptySubtitle: { marginTop: 8, fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  clearFiltersButton: { marginTop: 18, flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: '#00A74F', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#E6F7EF' },
  clearFiltersText: { color: '#007A3B', fontSize: 13, fontWeight: '600' },

  bannerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  bannerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },

});
