// file: app/(tabs)/payment.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PaymentScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Trang Thanh Toán</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 'bold' },
});