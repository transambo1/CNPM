import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
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
};

// --- Header ---
const FoodPageHeader = () => {
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
        />
      </View>
    </SafeAreaView>
  );
};

// --- Header Content (Banner, Category, Suggestions, Filter) ---
const FoodScreenListHeader = ({ categories, suggestions }: { categories: Category[], suggestions: Suggestion[] }) => {
  const router = useRouter();

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

      <ScrollView
        horizontal
        nestedScrollEnabled={true}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={{ paddingRight: 20 }}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.categoryItem}
            onPress={() => router.push({
              pathname: "/category/[name]",
              params: { name: cat.name }
            } as never)}
          >
            <Image source={{ uri: cat.image }} style={styles.categoryImage} />
            <Text style={styles.categoryText}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        nestedScrollEnabled={true}
        showsHorizontalScrollIndicator={false}
        style={styles.suggestionScroll}
        contentContainerStyle={{ paddingRight: 15 }}
      >
        {suggestions.map((sug) => (
          <TouchableOpacity
            key={sug.id}
            style={styles.suggestionCard}
            onPress={() => router.push({
              pathname: "/category/[name]",
              params: { name: sug.name }
            } as never)}
          >
            <Image source={{ uri: sug.image }} style={styles.suggestionImage} />
            <Text style={styles.suggestionText}>{sug.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter-outline" size={20} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterSortButton}>
          <Ionicons name="swap-vertical" size={20} color="#333" style={{ marginRight: 6 }} />
          <Text style={styles.filterSortText}>Lọc theo</Text>
          <Ionicons name="chevron-down" size={16} color="#333" />
        </TouchableOpacity>
      </View>

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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const db = getFirestore(app);

      try {
        const restaurantsQuery = query(collection(db, 'restaurants'));
        const restaurantsSnapshot = await getDocs(restaurantsQuery);
        const restaurantsData = restaurantsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: data.id,
            name: data.name,
            image: data.image,
            address: data.address,
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

  const renderRestaurant = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
    onPress={() =>
  router.push({
    pathname: "/restaurant/[id]",
    params: { id: item.id },
  })
}

    >
      <Image source={{ uri: item.image }} style={styles.restaurantImage} />
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{item.name}</Text>
        <Text style={styles.restaurantAddress} numberOfLines={1}>{item.address}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FoodPageHeader />

      {loading ? (
        <ActivityIndicator size="large" color="#00A74F" style={{ marginTop: 50 }} />
      ) : (
       <FlatList
  data={restaurants}
  renderItem={renderRestaurant}
  keyExtractor={(item) => String(item.id)}
  ListHeaderComponent={
    <FoodScreenListHeader
      categories={categories}
      suggestions={suggestions}
    />
  }
  showsVerticalScrollIndicator={false}
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
    marginTop: 20,
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
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: 25,
  },
  filterButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    marginRight: 10,
  },
  filterSortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
  },
  filterSortText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginRight: 4,
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
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginHorizontal: 15,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
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
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 13,
    color: '#777',
  },
});
