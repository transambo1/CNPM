// file: app/(tabs)/payment.js
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCart } from '../../libs/CartContext';

export default function PaymentScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { items, totalPrice, clearCart } = useCart();
    const rawTotal = params?.total;
    const parsedTotal = Array.isArray(rawTotal)
        ? Number(rawTotal[0])
        : rawTotal !== undefined
            ? Number(rawTotal)
            : undefined;
    const displayTotal = Number.isFinite(parsedTotal) ? parsedTotal : totalPrice;

    const handleConfirm = () => {
        Alert.alert('Đặt hàng thành công', 'GrabFood sẽ giao món đến bạn sớm nhất!', [
            {
                text: 'Tiếp tục đặt món',
                onPress: () => {
                    clearCart();
                    router.push('/(tabs)/index');
                }
            }
        ]);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Thanh toán</Text>
            <Text style={styles.subtitle}>Kiểm tra lại đơn hàng của bạn</Text>

            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                style={{ flex: 1, alignSelf: 'stretch' }}
                contentContainerStyle={{ paddingVertical: 12 }}
                renderItem={({ item }) => (
                    <View style={styles.itemRow}>
                        <View>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemQuantity}>Số lượng: {item.quantity}</Text>
                        </View>
                        <Text style={styles.itemPrice}>
                            {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                        </Text>
                    </View>
                )}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Giỏ hàng của bạn đang trống.</Text>
                }
            />

            <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tạm tính</Text>
                    <Text style={styles.summaryValue}>{displayTotal.toLocaleString('vi-VN')}đ</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Phí giao hàng</Text>
                    <Text style={styles.summaryValue}>Miễn phí</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                    <Text style={styles.summaryTotalText}>Tổng cộng</Text>
                    <Text style={styles.summaryTotalPrice}>{displayTotal.toLocaleString('vi-VN')}đ</Text>
                </View>

                <TouchableOpacity
                    style={[styles.confirmButton, items.length === 0 && { opacity: 0.5 }]}
                    onPress={handleConfirm}
                    disabled={items.length === 0}
                >
                    <Text style={styles.confirmText}>Xác nhận thanh toán</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    title: { fontSize: 24, fontWeight: 'bold', marginTop: 20, alignSelf: 'flex-start' },
    subtitle: { fontSize: 14, color: '#555', marginTop: 6, marginBottom: 12, alignSelf: 'flex-start' },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    itemName: { fontSize: 15, fontWeight: '600', color: '#111' },
    itemQuantity: { fontSize: 13, color: '#666', marginTop: 4 },
    itemPrice: { fontSize: 15, fontWeight: '700', color: '#00A74F' },
    emptyText: { textAlign: 'center', color: '#777', marginTop: 24 },
    summaryBox: {
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        marginTop: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    summaryLabel: { fontSize: 14, color: '#555' },
    summaryValue: { fontSize: 15, fontWeight: '600', color: '#111' },
    summaryTotalRow: { marginTop: 6, marginBottom: 20 },
    summaryTotalText: { fontSize: 16, fontWeight: '700', color: '#111' },
    summaryTotalPrice: { fontSize: 18, fontWeight: '800', color: '#00A74F' },
    confirmButton: {
        backgroundColor: '#00A74F',
        paddingVertical: 14,
        borderRadius: 28,
        alignItems: 'center',
    },
    confirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});