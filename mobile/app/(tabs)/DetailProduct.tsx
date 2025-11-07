import React, { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, ActivityIndicator } from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../libs/firebase";
import { useLocalSearchParams } from "expo-router";

export default function DetailProduct() {
  const { id } = useLocalSearchParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      const docRef = doc(db, "products", id as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setProduct(docSnap.data());
      setLoading(false);
    };
    if (id) fetchProduct();
  }, [id]);

  if (loading)
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text>Đang tải chi tiết sản phẩm...</Text>
      </View>
    );

  if (!product)
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Không tìm thấy sản phẩm</Text>
      </View>
    );

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Image source={{ uri: product.img }} style={{ width: "100%", height: 250, borderRadius: 10 }} />
      <Text className="text-2xl font-bold mt-4">{product.name}</Text>
      <Text className="text-gray-500 mt-1">{product.category}</Text>
      <Text className="text-xl text-red-500 font-semibold mt-2">
        {product.price.toLocaleString()}đ
      </Text>
      <Text className="text-gray-700 mt-3">{product.description}</Text>

      <View className="mt-4">
        <Text className="font-semibold">Nguyên liệu:</Text>
        {product.ingredients?.map((ing: string, i: number) => (
          <Text key={i} className="ml-2">• {ing}</Text>
        ))}
      </View>

      <Text className="mt-4 text-gray-500">
        ⭐ {product.rating} ({product.reviews} đánh giá)
      </Text>
    </ScrollView>
  );
}
