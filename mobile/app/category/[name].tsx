// file: app/category/[name].js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from '../../libs/firebase';
import { useCart } from '../../libs/CartContext';

// 1. Định nghĩa kiểu Product
type Product = {
    id: string;
    name: string;
    img: string;
    price: number;
    discount?: number;
    rating?: number;
    reviews?: number;
};

// 2. Component ProductCard (Để hiển thị sản phẩm)
const ProductCard = ({ item, onPress }: { item: Product; onPress: () => void }) => (
    <TouchableOpacity style={styles.cardContainer} activeOpacity={0.9} onPress={onPress}>
        <Image source={{ uri: item.img }} style={styles.cardImagePlaceholder} />
        <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <View style={styles.cardRating}>
                <Ionicons name="star" size={14} color="#FFC107" />
                <Text style={styles.cardRatingText}>
                    {(item.rating ?? 4.5).toFixed(1)} ({item.reviews ?? 0} đánh giá)
                </Text>
            </View>
            <View style={styles.cardPriceContainer}>
                <Text style={styles.cardPrice}>{item.price.toLocaleString('vi-VN')}đ</Text>
                {item.discount && (
                    <Text style={styles.cardOldPrice}>{(item.price * (1 + item.discount / 100)).toLocaleString('vi-VN')}đ</Text>
                )}
            </View>
            {item.discount && (
                <View style={styles.cardPromo}>
                    <Text style={styles.cardPromoText}>Giảm {item.discount}%</Text>
                </View>
            )}
        </View>
    </TouchableOpacity>
);

export default function CategoryPage() {
    // 3. Lấy tên danh mục từ URL (ví dụ: "Lẩu")
    const { name } = useLocalSearchParams();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { totalItems } = useCart();

    // 4. Fetch dữ liệu khi màn hình được mở
    useEffect(() => {
        if (!name) return;

        const fetchProducts = async () => {
            setLoading(true);
            const db = getFirestore(app);

            // 5. Query: "Lấy sản phẩm NƠI CÓ category == tên từ URL"
            const q = query(
                collection(db, "products"),
                where("category", "==", name)
            );

            try {
                const querySnapshot = await getDocs(q);
                const productsData = querySnapshot.docs.map(doc => {
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
            } catch (error) {
                console.error("Lỗi khi fetch sản phẩm theo danh mục: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [name]);

    return (
        <SafeAreaView style={styles.container}>
            {/* 6. Đặt tiêu đề cho trang (ví dụ: "Danh mục: Lẩu") */}
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.topBar}>
                <TouchableOpacity
                    onPress={() => (router.canGoBack() ? router.back() : router.push('/'))}
                    style={styles.backBtn}
                    accessibilityLabel="Quay lại"
                >
                    <Ionicons name="chevron-back" size={26} color="#111" />
                </TouchableOpacity>
                <Text style={styles.topBarTitle} numberOfLines={1}>
                    {name}
                </Text>
                <TouchableOpacity
                    onPress={() => router.push('/cart')}
                    style={styles.cartButton}
                    accessibilityLabel="Đi tới giỏ hàng"
                >
                    <Ionicons name="cart-outline" size={26} color="#111" />
                    {totalItems > 0 && (
                        <View style={styles.cartBadge}>
                            <Text style={styles.cartBadgeText}>{totalItems}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#00A74F" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={products}
                    renderItem={({ item }) => (
                        <ProductCard
                            item={item}
                            onPress={() =>
                                router.push({
                                    pathname: '/product/[id]',
                                    params: { id: item.id },
                                } as never)
                            }
                        />
                    )}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            {`Không tìm thấy sản phẩm nào cho danh mục "${name}"`}
                        </Text>
                    }
                />
            )}
        </SafeAreaView>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingBottom: 8,
        paddingTop: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topBarTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '700',
        color: '#111',
        paddingHorizontal: 8,
    },
    cartButton: {
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
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
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#777',
    },
    cardContainer: {
        paddingHorizontal: 15,
        paddingTop: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingBottom: 15,
    },
    cardImagePlaceholder: {
        width: '100%',
        height: 150,
        borderRadius: 12,
        backgroundColor: '#eee',
        marginBottom: 10,
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
    cardPriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    cardPrice: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000',
        marginRight: 10,
    },
    cardOldPrice: {
        fontSize: 13,
        color: '#999',
        textDecorationLine: 'line-through',
    },
    cardPromo: {
        backgroundColor: '#FFF8E1',
        alignSelf: 'flex-start',
        paddingVertical: 3,
        paddingHorizontal: 6,
        borderRadius: 6,
        marginTop: 5,
    },
    cardPromoText: {
        fontSize: 12,
        color: '#E53935',
        fontWeight: 'bold',
    },
});