import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, Image, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../libs/AuthContext';
import { getFirestore, collection, query, getDocs } from 'firebase/firestore';
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
type QuickFilterState = QuickFilterId[];

/** =========================
 *     CONSTANTS & HELPERS
 *  ========================= */
const QUICK_FILTERS: { id: QuickFilterId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'recommended', label: 'Đề xuất', icon: 'sparkles' },
  { id: 'top_selling', label: 'Bán chạy', icon: 'flame-outline' },
  { id: 'value', label: 'Giá trị xứng đáng', icon: 'star-half-outline' },
  { id: 'premium', label: 'Ăn sang', icon: 'diamond-outline' },
];

const QUICK_FILTER_LABEL: Record<QuickFilterId, string> = QUICK_FILTERS.reduce(
  (acc, cur) => ({ ...acc, [cur.id]: cur.label }),
  {} as Record<QuickFilterId, string>
);

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
  activeQuickFilters: QuickFilterState;
  onQuickFilterToggle: (f: QuickFilterId) => void;
  onClearFilters: () => void;
  featuredRestaurant?: Restaurant | null;
};

const FoodScreenListHeader = ({
  categories, suggestions, selectedCategory, onSelectCategory,
  activeQuickFilters, onQuickFilterToggle, onClearFilters, featuredRestaurant,
}: FoodScreenListHeaderProps) => {
  const router = useRouter();

  const activeFilterPills = [
    ...(selectedCategory.id
      ? [{ key: `category-${selectedCategory.id}`, label: selectedCategory.name ?? 'Danh mục', onRemove: () => onSelectCategory({ id: null, name: null }) }]
      : []),
    ...activeQuickFilters.map((f) => ({
      key: `quick-${f}`,
      label: QUICK_FILTER_LABEL[f],
      onRemove: () => onQuickFilterToggle(f),
    })),
  ];

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

      {/*
      <View style={styles.segmentContainer}>
        <TouchableOpacity style={[styles.segmentButton, styles.segmentButtonActive]}>
          <Text style={[styles.segmentText, styles.segmentTextActive]}>Giao hàng</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.segmentButton}>
          <Text style={styles.segmentText}>Đi Ăn Nhà Hàng</Text>
        </TouchableOpacity>
      </View>
*/}

   
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
              style={[styles.filterChip, activeQuickFilters.includes(f.id) && styles.filterChipActive]}
              onPress={() => onQuickFilterToggle(f.id)}
            > 
              <Ionicons
                name={f.icon}
                size={16}
                color={activeQuickFilters.includes(f.id) ? '#fff' : '#111'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.filterChipText, activeQuickFilters.includes(f.id) && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
{/* Danh mục chỉ chữ, không hình — giống Web */}
<View style={{ marginTop: 16, paddingLeft: 16 }}>
  <Text style={styles.sectionLabel}>Danh mục</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {categories.map((cat) => (
      <TouchableOpacity
        key={cat.id}
        onPress={() => onSelectCategory({ id: cat.id, name: cat.name })}
        style={{
          paddingVertical: 8,
          paddingHorizontal: 14,
          backgroundColor: selectedCategory.id === cat.id ? '#ff7a00' : '#fff',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#ffd3aa',
          marginRight: 10,
        }}
      >
        <Text
          style={{
            color: selectedCategory.id === cat.id ? '#fff' : '#222',
            fontWeight: '600',
            fontSize: 13,
          }}
        >
          {cat.name}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
</View>

      {activeFilterPills.length > 0 && (
        <View style={styles.activeFilterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12 }}>
            {activeFilterPills.map((pill) => (
              <View key={pill.key} style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>{pill.label}</Text>
                <TouchableOpacity onPress={pill.onRemove} hitSlop={8}>
                  <Ionicons name="close" size={14} color="#0f5132" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.clearAllFilters} onPress={onClearFilters}>
            <Ionicons name="trash-outline" size={16} color="#0f5132" style={{ marginRight: 6 }} />
            <Text style={styles.clearAllFiltersText}>Xóa tất cả</Text>
          </TouchableOpacity>
        </View>
      )}


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
  const [activeQuickFilters, setActiveQuickFilters] = useState<QuickFilterState>([]);
  const [featuredRestaurant, setFeaturedRestaurant] = useState<Restaurant | null>(null);
  const [categoriesByRestaurant, setCategoriesByRestaurant] = useState<Record<string, Set<string>>>({});


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

        /** Products */
        let allProducts: any[] = [];
        try {
          const prodSnap = await getDocs(query(collection(db, "products")));
          allProducts = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch { allProducts = []; }

        /** Build categoriesByRestaurant */
        const _catMap: Record<string, Set<string>> = {};
        allProducts.forEach(p => {
          const rid = p.restaurantId;
          const cat = String(p.category ?? "").trim().toLowerCase();
          if (!rid || !cat) return;
          if (!_catMap[rid]) _catMap[rid] = new Set();
          _catMap[rid].add(cat);
        });
        setCategoriesByRestaurant(_catMap);
        // 🔥 Random 1 nhà hàng nổi bật
        const available = rs.filter(r => typeof r.image === "string" && r.image.trim().length > 0);
        if (available.length > 0) {
          const randomIndex = Math.floor(Math.random() * available.length);
          setFeaturedRestaurant(available[randomIndex]);
        }

    /** Categories lấy từ products giống web */
try {
  const prodSnap = await getDocs(query(collection(db, "products")));
  const list = prodSnap.docs.map(d => d.data());

  const unique = [...new Set(list.map(p => String(p.category ?? "").trim()))]
    .filter(c => c && c !== "")
    .map((c) => ({
      id: c,
      name: c,
      image: `https://source.unsplash.com/100x100/?${encodeURIComponent(c)}`
    }));

  setCategories(unique);
} catch {
  setCategories([]);
}

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
  const handleQuickFilterToggle = useCallback((f: QuickFilterId) => {
    setActiveQuickFilters((prev) => {
      if (prev.includes(f)) {
        return prev.filter((item) => item !== f);
      }
      return [...prev, f];
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedCategory({ id: null, name: null });
    setActiveQuickFilters([]);
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
    const effectiveQuickFilters = activeQuickFilters.length > 0 ? activeQuickFilters : ['recommended'];

    // Step 1: text + EXACT category
    let list = restaurants.filter((r) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [r.name, r.address].filter(Boolean).some(v => v.toLowerCase().includes(normalizedSearch));

      const matchesCategory =
        !selectedKey || categoriesByRestaurant[r.id]?.has(selectedKey);

      return matchesSearch && matchesCategory;
    });

    // Step 2: quick filter selections
    if (effectiveQuickFilters.includes('top_selling')) {
      list = list.filter((r) =>
        top5ByOrdersIds.has(r.id) ||
        ((r.orders ?? 0) + (derived[r.id]?.totalOrdersFromHistory ?? 0)) >= 200
      );
    }

    if (effectiveQuickFilters.includes('premium')) {
      const PREMIUM = 70000;
      list = list.filter((r) => (derived[r.id]?.avgPriceTop5 ?? 0) >= PREMIUM);
    }

    const valueScore = (r: Restaurant) => {
      const d = derived[r.id];
      const rating = r.rating ?? 0;
      const orders = (r.orders ?? 0) + (d?.totalOrdersFromHistory ?? 0);
      const avg = d?.avgPriceTop5 ?? NaN;
      const priceFactor = !avg || !isFinite(avg) || avg <= 0 ? 0 : 40000 / avg;
      return rating * 0.5 + (orders / 100) * 0.2 + priceFactor * 0.3;
    };

    const sorters: ((a: Restaurant, b: Restaurant) => number)[] = [];

    if (effectiveQuickFilters.includes('recommended')) {
      sorters.push((a, b) => recScore(b, derived[b.id]) - recScore(a, derived[a.id]));
    }

    if (effectiveQuickFilters.includes('value')) {
      sorters.push((a, b) => valueScore(b) - valueScore(a));
    }

    if (effectiveQuickFilters.includes('top_selling')) {
      sorters.push(
        (a, b) =>
          ((b.orders ?? 0) + (derived[b.id]?.totalOrdersFromHistory ?? 0)) -
          ((a.orders ?? 0) + (derived[a.id]?.totalOrdersFromHistory ?? 0))
      );
    }

    if (sorters.length === 0) {
      sorters.push((a, b) => recScore(b, derived[b.id]) - recScore(a, derived[a.id]));
    }

    return [...list].sort((a, b) => {
      for (const sorter of sorters) {
        const diff = sorter(a, b);
        if (diff !== 0) return diff;
      }
      return 0;
    });
  }, [restaurants, searchTerm, selectedCategory, activeQuickFilters, derived, top5ByOrdersIds]);

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
              activeQuickFilters={activeQuickFilters}
              onQuickFilterToggle={handleQuickFilterToggle}
              onClearFilters={handleClearFilters}
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
                  handleClearFilters();
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
  /* =========================
   * ROOT / HEADER
   * ======================= */
  container: {
    flex: 1,
    backgroundColor: '#fff', // nền cam nhạt giống web
  },

  headerSafeArea: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3d7c3', // viền cam nhạt
  },

  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },

  addressBox: {
    flex: 1,
    marginHorizontal: 10,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  cartButton: {
    padding: 4,
  },

  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ff5400', // cam đậm
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  addressTitle: {
    fontSize: 12,
    color: '#888',
    fontWeight: '700',
  },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  addressText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginRight: 5,
  },

  /* =========================
   * SEARCH BAR
   * ======================= */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    height: 42,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ffe0c2', // viền cam nhạt giống web
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  searchIcon: {
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#222',
  },

  /* =========================
   * LIST HEADER (BANNER + FILTER)
   * ======================= */
  listHeaderContainer: {
    backgroundColor: '#fff',
    paddingBottom: 8,
  },

  // Banner nhà hàng nổi bật
  bannerContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: '#ff7a00',
    padding: 18,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#ff7a00',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  bannerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },

  bannerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },

  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },

  bannerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#ffeede',
    fontWeight: '500',
  },

  /* (segmentContainer cũ – vẫn giữ, nếu sau này xài lại) */
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#fbe3d1',
    marginHorizontal: 16,
    borderRadius: 22,
    height: 40,
    padding: 4,
    marginTop: 14,
  },
  segmentButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  segmentButtonActive: {
    backgroundColor: '#fff',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#a26a3f',
  },
  segmentTextActive: {
    color: '#222',
  },

  /* =========================
   * QUICK FILTER + CATEGORY
   * ======================= */
  quickFilterSection: {
    marginTop: 22,
    paddingLeft: 16,
    paddingRight: 8,
  },

  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    marginBottom: 10,
  },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffd3aa',
    backgroundColor: '#fff',
    marginRight: 10,
  },

  filterChipActive: {
    backgroundColor: '#ff7a00',
    borderColor: '#ff7a00',
  },

  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222',
  },

  filterChipTextActive: {
    color: '#fff',
  },

  activeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 14,
  },

  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffe8d4',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ffc89d',
    gap: 6,
  },

  activeFilterText: {
    color: '#8b4513',
    fontWeight: '700',
    fontSize: 13,
  },

  clearAllFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ffc89d',
  },

  clearAllFiltersText: {
    color: '#8b4513',
    fontWeight: '700',
    fontSize: 12,
  },

  /* CATEGORY CARDS */
  categoryScroll: {
    marginTop: 16,
    paddingLeft: 16,
  },

  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },

  categoryImage: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ffe0c2',
  },

  categoryText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
    color: '#444',
  },

  /* SUGGESTION CARDS */
  suggestionScroll: {
    marginTop: 20,
    paddingLeft: 16,
  },

  suggestionCard: {
    width: 130,
    height: 170,
    marginRight: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ffe0c2',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  suggestionImage: {
    width: '100%',
    height: 115,
    backgroundColor: '#f5f5f5',
  },

  suggestionText: {
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingTop: 6,
    fontSize: 13,
    color: '#222',
  },

  /* NẾU SAU NÀY DÙNG LẠI FOOTER BANNER */
  footerBannerContainer: {
    backgroundColor: '#ff7a00',
    padding: 15,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 22,
  },

  footerText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 24,
    marginBottom: 10,
    marginLeft: 16,
    color: '#222',
  },

  /* =========================
   * RESTAURANT CARD
   * ======================= */
  restaurantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ffe0c2',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  restaurantImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#f2f2f2',
    marginRight: 12,
  },

  restaurantInfo: {
    flex: 1,
  },

  restaurantHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  restaurantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    flex: 1,
    marginRight: 8,
  },

  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff5400',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },

  promoBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  restaurantAddress: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },

  restaurantMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  metaPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
  },

  metaSecondary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },

  metaSeparator: {
    width: 1,
    height: 16,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 12,
  },

  restaurantPromoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#fff3e0',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 12,
  },

  restaurantPromoText: {
    color: '#c05621',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  /* =========================
   * EMPTY FILTER STATE
   * ======================= */
  emptyFilterState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 40,
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },

  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },

  clearFiltersButton: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ff7a00',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },

  clearFiltersText: {
    color: '#ff7a00',
    fontSize: 13,
    fontWeight: '700',
  },
});
