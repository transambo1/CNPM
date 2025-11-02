// file: app/(tabs)/index.js
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

// --- Định nghĩa Types (Giữ nguyên) ---
type Category = { id: string; name: string; image: string; };
type Suggestion = { id: string; name: string; image: string; };
type Product = {
  id: string;
  name: string;
  img: string;
  price: number;
  discount?: number;
  rating?: number;
  reviews?: number;
};

// --- Header Cố định (Giữ nguyên) ---
const FoodPageHeader = () => {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
      <View style={styles.addressHeader}>
        <TouchableOpacity onPress={() => { /* Mở máy quét */ }}>
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
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
          <Ionicons name="person-circle-outline" size={32} color="#000" />
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          placeholder="Bạn đang thêm gì nào?"
          style={styles.searchInput}
          placeholderTextColor="#666"
        />
      </View>
    </SafeAreaView>
  );
}

// --- Component ListHeader (Đã thêm nút Lọc) ---
const FoodScreenListHeader = ({ categories, suggestions }: { categories: Category[], suggestions: Suggestion[] }) => {
  const router = useRouter(); // <-- 1. Thêm router

  return (
    <View style={styles.listHeaderContainer}>
      {/* ... (Banner và Segment giữ nguyên) ... */}
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

      {/* Danh mục (Cơm, Bún, Phở...) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={{ paddingRight: 20 }}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.categoryItem}
            // 2. Phục hồi onPress (với 'as never' để fix lỗi TS)
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

      {/* Gợi ý (Gần tôi, Một người ăn...) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.suggestionScroll}
        contentContainerStyle={{ paddingRight: 15 }}
      >
        {suggestions.map((sug) => (
          <TouchableOpacity
            key={sug.id}
            style={styles.suggestionCard}
            // 3. Phục hồi onPress
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

      {/* --- 4. THÊM NÚT LỌC VÀO ĐÂY --- */}
      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter-outline" size={20} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterSortButton}>
          <Ionicons name="swap-vertical" size={20} color="#333" style={{ marginRight: 6 }} />
          <Text style={styles.filterSortText}>Lọc theo</Text>
          <Ionicons name="chevron-down" size={16} color="#333" />
        </TouchableOpacity>
        {/* Bạn có thể thêm các nút lọc nhanh khác ở đây */}
      </View>
      {/* --- KẾT THÚC NÚT LỌC --- */}

      <View style={styles.footerBannerContainer}>
        <Text style={styles.footerText}>Deal chớp nhoáng giảm thêm 15.000đ</Text>
      </View>
      <Text style={styles.sectionTitle}>Khám phá mĩ vị mới</Text>
    </View>
  );
};

// --- Component Card Sản phẩm (Giữ nguyên) ---
const ProductCard = ({ item }: { item: Product }) => (
  <View style={styles.cardContainer}>
    <Image source={{ uri: item.img }} style={styles.cardImage} />
    <View style={styles.cardInfo}>
      <Text style={styles.cardTitle}>{item.name}</Text>
      <View style={styles.cardRating}>
        <Ionicons name="star" size={14} color="#FFC107" />
        <Text style={styles.cardRatingText}>{item.rating} ({item.reviews} đánh giá)</Text>
      </View>
      <Text style={styles.cardDeliveryInfo}>Miễn phí 9.000đ • 15 phút trở lên</Text>
      {item.discount && (
        <View style={styles.cardPromo}>
          <Ionicons name="pricetag" size={14} color="#E53935" style={{ marginRight: 4 }} />
          <Text style={styles.cardPromoText}>Giảm {item.discount}%</Text>
        </View>
      )}
    </View>
  </View>
);

// --- Màn hình chính (HomePage) (Giữ nguyên) ---
export default function HomePage() {
  // ... (Toàn bộ code fetch data của HomePage giữ nguyên) ...
  const [categories, setCategories] = useState<Category[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const db = getFirestore(app);

      try {
        // Fetch Products
        const productsQuery = query(collection(db, 'products'));
        const productsSnapshot = await getDocs(productsQuery);
        const productsData = productsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            img: data.img,
            price: data.price,
            discount: data.discount,
            rating: data.rating,
            reviews: data.reviews,
          } as Product;
        });
        setProducts(productsData);

        // Fetch Categories
        try {
          const categoriesQuery = query(collection(db, 'categories'));
          const categoriesSnapshot = await getDocs(categoriesQuery);
          const categoriesData = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[];
          setCategories(categoriesData);
        } catch (e) {
          console.warn("Không tìm thấy collection 'categories'");
          setCategories([]);
        }

        // Fetch Suggestions
        try {
          const suggestionsQuery = query(collection(db, 'suggestions'));
          const suggestionsSnapshot = await getDocs(suggestionsQuery);
          const suggestionsData = suggestionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Suggestion[];
          setSuggestions(suggestionsData);
        } catch (e) {
          console.warn("Không tìm thấy collection 'suggestions'");
          setSuggestions([]);
        }

      } catch (error) {
        console.error("Lỗi khi fetch dữ liệu products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <View style={styles.container}>
      <FoodPageHeader />

      {loading ? (
        <ActivityIndicator size="large" color="#00A74F" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={products}
          renderItem={({ item }) => <ProductCard item={item} />}
          keyExtractor={item => item.id}
          ListHeaderComponent={
            <FoodScreenListHeader
              categories={categories}
              suggestions={suggestions}
            />
          }
        />
      )}
    </View>
  );
}

// --- StyleSheet (Đã thêm style cho Nút lọc) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // ... (styles của header, banner, segment, category, suggestion giữ nguyên)
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

  // --- 5. STYLES CHO NÚT LỌC ---
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
    borderRadius: 20, // Bo tròn
    marginRight: 10,
  },
  filterSortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20, // Bo tròn
  },
  filterSortText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginRight: 4,
  },
  // --- KẾT THÚC STYLES LỌC ---

  footerBannerContainer: {
    backgroundColor: '#FF6F00',
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 15,
    marginTop: 25, // <-- Đã có
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

  // ... (Styles của ProductCard giữ nguyên)
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  cardImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#eee',
    marginRight: 15,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 5,
  },
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  cardRatingText: {
    marginLeft: 5,
    fontSize: 13,
    color: '#555',
  },
  cardDeliveryInfo: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
  },
  cardPriceContainer: {},
  cardPrice: {},
  cardOldPrice: {},
  cardPromo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 0,
    marginTop: 5,
  },
  cardPromoText: {
    fontSize: 13,
    color: '#E53935',
    fontWeight: '500',
  },
});