import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../libs/AuthContext';
import { getFirestore, collection, query, getDocs } from 'firebase/firestore';
import { app } from '../../libs/firebase';
import { useCart } from '../../libs/CartContext';

// --- Types ---
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
  categories?: string[];
};

type QuickFilterId = 'all' | 'promo' | 'fast' | 'rating';

const QUICK_FILTERS: { id: QuickFilterId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'all', label: 'Tất cả', icon: 'options-outline' },
  { id: 'promo', label: 'Ưu đãi', icon: 'pricetag-outline' },
  { id: 'fast', label: 'Giao nhanh', icon: 'flash-outline' },
  { id: 'rating', label: 'Đánh giá cao', icon: 'star-outline' },
];

// --- Header ---
type FoodPageHeaderProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
};

const FoodPageHeader = ({ searchTerm, onSearchChange }: FoodPageHeaderProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const { totalItems } = useCart();

  return (
    <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
      <View style={styles.addressHeader}>
        <TouchableOpacity>
          <Ionicons name="scan-outline" size={26} color="#000" />
        </TouchableOpacity>
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
          <TouchableOpacity
            onPress={() => router.push('/cart')}
            style={styles.cartButton}
            accessibilityLabel="Mở giỏ hàng"
          >
            <Ionicons name="cart-outline" size={26} color="#000" />
            {totalItems > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalItems}</Text>
              </View>
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

// --- Header Content (Banner, Category, Suggestions, Filter) ---
type SelectedCategory = { id: string | null; name: string | null };

type FoodScreenListHeaderProps = {
  categories: Category[];
  suggestions: Suggestion[];
  selectedCategory: SelectedCategory;
  onSelectCategory: (category: SelectedCategory) => void;
  activeQuickFilter: QuickFilterId;
  onQuickFilterChange: (filter: QuickFilterId) => void;
};

const FoodScreenListHeader = ({
  categories,
  suggestions,
  selectedCategory,
  onSelectCategory,
  activeQuickFilter,
  onQuickFilterChange,
}: FoodScreenListHeaderProps) => {
  const router = useRouter();
  const selectedCategoryFromList = useMemo(
    () => categories.find((cat) => cat.id === selectedCategory.id || cat.name === selectedCategory.name),
    [categories, selectedCategory.id, selectedCategory.name]
  );
  const selectedCategoryId = selectedCategory.id;
  const shouldShowClear = Boolean(selectedCategory.id || selectedCategory.name);
  const selectedCategoryLabel = selectedCategoryFromList?.name ?? selectedCategory.name ?? '';

  return (
    <View style={styles.listHeaderContainer}>
      <View style={styles.bannerContainer}>
        <Text style={styles.bannerTitle}>Deal matcha HOT</Text>
        <Text style={styles.bannerSubtitle}>Order matcha ngay</Text>
      </View>

      <View style={styles.segmentContainer}>
        <TouchableOpacity style={[styles.segmentButton, styles.segmentButtonActive]}>
          <Text style={[styles.segmentText, styles.segmentTextActive]}>Giao hàng</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.segmentButton}>
          <Text style={styles.segmentText}>Đi Ăn Nhà Hàng</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickFilterSection}>
        <Text style={styles.sectionLabel}>Bộ lọc nổi bật</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 15 }}
        >
          {QUICK_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterChip,
                activeQuickFilter === filter.id && styles.filterChipActive,
              ]}
              onPress={() => onQuickFilterChange(filter.id)}
            >
              <Ionicons
                name={filter.icon}
                size={16}
                color={activeQuickFilter === filter.id ? '#fff' : '#111'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.filterChipText,
                  activeQuickFilter === filter.id && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.categoryFilterSection}>
        <View style={styles.categoryFilterHeader}>
          <Text style={styles.sectionLabel}>Danh mục phổ biến</Text>
          {shouldShowClear ? (
            <TouchableOpacity onPress={() => onSelectCategory({ id: null, name: null })}>
              <Text style={styles.clearFilterText}>
                Bỏ lọc {selectedCategoryLabel}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 15 }}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              !selectedCategoryId && !selectedCategory.name && styles.categoryChipActive,
            ]}
            onPress={() => onSelectCategory({ id: null, name: null })}
          >
            <Text
              style={[
                styles.categoryChipText,
                !selectedCategoryId && styles.categoryChipTextActive,
              ]}
            >
              Tất cả
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              (selectedCategoryId === cat.id || selectedCategory.name === cat.name) && styles.categoryChipActive,
            ]}
            onPress={() => onSelectCategory({ id: cat.id, name: cat.name })}
              onLongPress={() =>
                router.push({ pathname: '/category/[name]', params: { name: cat.name } } as never)
              }
            >
              <Text
              style={[
                styles.categoryChipText,
                (selectedCategoryId === cat.id || selectedCategory.name === cat.name) && styles.categoryChipTextActive,
              ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={styles.filterHint}>Chạm để lọc nhanh, nhấn giữ để mở danh mục chi tiết.</Text>
      </View>

      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={{ paddingRight: 20 }}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.categoryItem}
            onPress={() => router.push({
              pathname: '/category/[name]',
              params: { name: cat.name },
            } as never)}
          >
            <Image source={{ uri: cat.image }} style={styles.categoryImage} />
            <Text style={styles.categoryText}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.suggestionScroll}
        contentContainerStyle={{ paddingRight: 15 }}
      >
        {suggestions.map((sug) => (
          <TouchableOpacity
            key={sug.id}
            style={styles.suggestionCard}
            onPress={() => onSelectCategory({ id: sug.id, name: sug.name })}
            onLongPress={() =>
              router.push({ pathname: '/category/[name]', params: { name: sug.name } } as never)
            }
          >
            <Image source={{ uri: sug.image }} style={styles.suggestionImage} />
            <Text style={styles.suggestionText}>{sug.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footerBannerContainer}>
        <Text style={styles.footerText}>Deal chớp nhoáng giảm thêm 15.000đ</Text>
      </View>

      <Text style={styles.sectionTitle}>Nhà hàng gần bạn</Text>
    </View>
  );
};

// --- MAIN PAGE ---
export default function HomePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory>({
    id: null,
    name: null,
  });
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilterId>('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const db = getFirestore(app);

      try {
        const restaurantsQuery = query(collection(db, 'restaurants'));
        const restaurantsSnapshot = await getDocs(restaurantsQuery);
        const restaurantsData = restaurantsSnapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          const categoriesField = Array.isArray(data.categories)
            ? data.categories.map((c: any) => String(c))
            : data.category
            ? [String(data.category)]
            : [];

          return {
            id: docSnap.id,
            name: data.name,
            image: data.image,
            address: data.address,
            rating: typeof data.rating === 'number' ? data.rating : data.score,
            deliveryTime:
              typeof data.deliveryTime === 'number'
                ? data.deliveryTime
                : typeof data.eta === 'number'
                ? data.eta
                : typeof data.time === 'number'
                ? data.time
                : undefined,
            hasPromo: Boolean(data.hasPromo ?? data.promo ?? data.discount),
            promoText: data.promoText ?? data.promo ?? data.discountText ?? '',
            categories: categoriesField,
          } as Restaurant;
        });
        setRestaurants(restaurantsData);

        try {
          const categoriesQuery = query(collection(db, 'categories'));
          const categoriesSnapshot = await getDocs(categoriesQuery);
          const categoriesData = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[];
          setCategories(categoriesData);
        } catch {
          setCategories([]);
        }

        try {
          const suggestionsQuery = query(collection(db, 'suggestions'));
          const suggestionsSnapshot = await getDocs(suggestionsQuery);
          const suggestionsData = suggestionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Suggestion[];
          setSuggestions(suggestionsData);
        } catch {
          setSuggestions([]);
        }

      } catch (error) {
        console.error("Lỗi khi fetch danh sách nhà hàng:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleSelectCategory = useCallback((category: SelectedCategory) => {
    setSelectedCategory((prev) => {
      if (prev.id === category.id && prev.name === category.name) {
        return { id: null, name: null };
      }
      return category;
    });
  }, []);

  const handleQuickFilterChange = useCallback((filter: QuickFilterId) => {
    setActiveQuickFilter((prev) => {
      if (filter === 'all') return 'all';
      return prev === filter ? 'all' : filter;
    });
  }, []);

  const filteredRestaurants = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return restaurants.filter((restaurant) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [restaurant.name, restaurant.address]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));

      const restaurantCategories = (restaurant.categories ?? []).map((c) => String(c).toLowerCase());
      const selectedKey = (selectedCategory.id ?? selectedCategory.name ?? '').toLowerCase();
      const matchesCategory =
        !selectedKey ||
        restaurantCategories.includes(selectedKey) ||
        restaurantCategories.includes((selectedCategory.name ?? '').toLowerCase()) ||
        restaurantCategories.includes((selectedCategory.id ?? '').toLowerCase()) ||
        restaurant.name.toLowerCase().includes(selectedKey);

      const matchesQuick = (() => {
        switch (activeQuickFilter) {
          case 'promo':
            return Boolean(restaurant.hasPromo || restaurant.promoText);
          case 'fast':
            return typeof restaurant.deliveryTime === 'number' ? restaurant.deliveryTime <= 25 : true;
          case 'rating':
            return (restaurant.rating ?? 0) >= 4.5;
          default:
            return true;
        }
      })();

      return matchesSearch && matchesCategory && matchesQuick;
    });
  }, [restaurants, searchTerm, selectedCategory, activeQuickFilter]);

  const renderRestaurant = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      activeOpacity={0.88}
      onPress={() =>
        router.push({
          pathname: '/restaurant/[id]',
          params: { id: item.id },
        } as never)
      }
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
        <Text style={styles.restaurantAddress} numberOfLines={1}>
          {item.address}
        </Text>
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
        </View>
        {item.promoText ? (
          <View style={styles.restaurantPromoRow}>
            <Ionicons name="gift-outline" size={14} color="#00A74F" style={{ marginRight: 6 }} />
            <Text style={styles.restaurantPromoText} numberOfLines={1}>
              {item.promoText}
            </Text>
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
          data={filteredRestaurants}
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
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyFilterState}>
              <Ionicons name="compass-outline" size={48} color="#A0AEC0" />
              <Text style={styles.emptyTitle}>Chưa có nhà hàng phù hợp</Text>
              <Text style={styles.emptySubtitle}>
                Thử thay đổi bộ lọc hoặc tìm kiếm khác để thấy thêm lựa chọn hấp dẫn nhé.
              </Text>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  handleSearchChange('');
                  handleSelectCategory({ id: null, name: null });
                  handleQuickFilterChange('all');
                }}
              >
                <Ionicons name="refresh" size={16} color="#00A74F" style={{ marginRight: 6 }} />
                <Text style={styles.clearFiltersText}>Đặt lại bộ lọc</Text>
              </TouchableOpacity>
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={filteredRestaurants.length === 0 ? { flexGrow: 1 } : undefined}
        />
      )}
    </View>
  );
}

// --- Styles --- (GIỮ NGUYÊN + RESTAURANT CARD)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerSafeArea: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
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
    backgroundColor: '#FF3B30',
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
    color: '#555',
    fontWeight: 'bold',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginRight: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginHorizontal: 15,
    paddingHorizontal: 15,
    height: 40,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  listHeaderContainer: {
    backgroundColor: '#fff',
  },
  bannerContainer: {
    height: 100,
    backgroundColor: '#006443',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 10,
    padding: 15,
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#fff',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#eee',
    marginHorizontal: 15,
    borderRadius: 20,
    height: 40,
    padding: 4,
    marginTop: 15,
  },
  segmentButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  segmentButtonActive: {
    backgroundColor: '#fff',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  segmentTextActive: {
    color: '#000',
  },
  categoryScroll: {
    marginTop: 16,
    paddingLeft: 15,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 15,
    width: 80,
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
    color: '#444',
  },
  suggestionScroll: {
    marginTop: 20,
    paddingLeft: 15,
  },
  suggestionCard: {
    width: 120,
    height: 160,
    marginRight: 10,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
  },
  suggestionImage: {
    width: '100%',
    height: 110,
    backgroundColor: '#eee',
  },
  suggestionText: {
    fontWeight: 'bold',
    padding: 10,
  },
  quickFilterSection: {
    marginTop: 22,
    paddingLeft: 15,
    paddingRight: 5,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    marginBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: '#00A74F',
    borderColor: '#00A74F',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  categoryFilterSection: {
    marginTop: 24,
    paddingLeft: 15,
    paddingRight: 5,
  },
  categoryFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  clearFilterText: {
    fontSize: 12,
    color: '#00A74F',
    fontWeight: '600',
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    marginRight: 10,
  },
  categoryChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#22C55E',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  categoryChipTextActive: {
    color: '#047857',
  },
  filterHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748B',
  },
  footerBannerContainer: {
    backgroundColor: '#FF6F00',
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 15,
    marginTop: 25,
  },
  footerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 25,
    marginBottom: 10,
    marginLeft: 15,
  },

  // ===== RESTAURANT CARD =====
  restaurantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 15,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  restaurantImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
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
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A74F',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  promoBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  restaurantAddress: {
    fontSize: 13,
    color: '#64748B',
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
    color: '#111',
  },
  metaSecondary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  metaSeparator: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  restaurantPromoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#F0FFF4',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  restaurantPromoText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
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
    color: '#1F2937',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  clearFiltersButton: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00A74F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E6F7EF',
  },
  clearFiltersText: {
    color: '#007A3B',
    fontSize: 13,
    fontWeight: '600',
  },
});
