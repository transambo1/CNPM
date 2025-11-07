// file: app/category/[name].js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from '../../libs/firebase';

// 1. Định nghĩa kiểu Product
type Product = {
    id: string;
    name: string;
    img: string;
    price: number;
    discount?: number;
    rating?: number;
    reviews?: number;
    restaurantId: string;
};

// 2. Component ProductCard (Để hiển thị sản phẩm)
const ProductCard = ({ item, onPress }: { item: Product; onPress: () => void }) => (
    <TouchableOpacity style={styles.cardContainer} activeOpacity={0.9} onPress={onPress}>
        <Image source={{ uri: item.img }} style={styles.cardImagePlaceholder} />
        <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <View style={styles.cardRating}>
                <Ionicons name="star" size={14} color="#FFC107" />
                <Text style={styles.cardRatingText}>{item.rating ?? '4.5'} ({item.reviews ?? 120} đánh giá)</Text>
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
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

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
                        restaurantId: data.restaurantId,
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
            <Stack.Screen options={{
                title: `Danh mục: ${name}`,
                headerBackTitle: "Trở về",
                headerShown: false
            }} />

            <View style={styles.appBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#111" />
                </TouchableOpacity>
                <Text style={styles.appBarTitle} numberOfLines={1}>{name}</Text>
                <View style={{ width: 32 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#00A74F" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={products}
                    renderItem={({ item }) => (
                        <ProductCard
                            item={item}
                            onPress={() => router.push({
                                pathname: '/product/[id]',
                                params: { id: item.id }
                            } as never)}
                        />
                    )}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Không tìm thấy sản phẩm nào cho danh mục “{name}”</Text>
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
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#777',
    },
    appBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        paddingTop: 6,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F5F6',
    },
    appBarTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '700',
        color: '#111',
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