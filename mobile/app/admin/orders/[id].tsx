import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    doc,
    getDoc,
    getFirestore,
    Timestamp,
} from "firebase/firestore";
import { app } from "../../../libs/firebase";

type OrderData = {
    id: string;
    status?: string;
    total?: number;
    createdAt?: any;
    deliveredAt?: any;
    customer?: {
        name?: string;
        phone?: string;
        address?: string;
    };
    items?: { name?: string; quantity?: number; price?: number }[];
    droneId?: string | null;
};

const STATUS_STYLE: any = {
    pending: { label: "Chờ xử lý", color: "#4f46e5", bg: "#eef2ff" },
    delivering: { label: "Đang giao", color: "#d97706", bg: "#fff4e5" },
    delivered: { label: "Đã giao", color: "#059669", bg: "#e8f8ef" },
    cancelled: { label: "Đã hủy", color: "#dc2626", bg: "#fdecec" },
};

function normalizeStatus(text?: string) {
    const s = (text ?? "").toLowerCase();
    if (s.includes("hủy")) return "cancelled";
    if (s.includes("đang giao")) return "delivering";
    if (s.includes("đã giao")) return "delivered";
    return "pending";
}

const formatVND = (n?: number) =>
    `${Number(n ?? 0).toLocaleString("vi-VN")} đ`;

const formatDate = (ts: any) => {
    if (!ts) return "—";
    if (ts instanceof Timestamp) ts = ts.toDate();
    return new Date(ts).toLocaleString("vi-VN");
};

export default function AdminOrderDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const db = useMemo(() => getFirestore(app), []);

    const [order, setOrder] = useState<OrderData | null>(null);
    const [loading, setLoading] = useState(true);

    const loadOrder = async () => {
        setLoading(true);
        try {
            const ref = doc(db, "orders", String(id));
            const snap = await getDoc(ref);
            if (!snap.exists()) {
                setOrder(null);
            } else {
                setOrder({
                    id: snap.id,
                    ...snap.data(),
                } as any);
            }
        } catch (err) {
            console.log("Load order failed", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrder();
    }, [id]);

    if (loading)
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#0b1f15" />
            </SafeAreaView>
        );

    if (!order)
        return (
            <SafeAreaView style={styles.center}>
                <Text>Không tìm thấy đơn hàng.</Text>
            </SafeAreaView>
        );

    const statusKey = normalizeStatus(order.status);
    const S = STATUS_STYLE[statusKey];

    return (
        <SafeAreaView style={styles.safe}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backBtn}
                >
                    <Ionicons name="chevron-back" size={24} color="#0b1f15" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Đơn #{order.id}</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                {/* STATUS */}
                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: S.bg },
                    ]}
                >
                    <Text style={[styles.statusText, { color: S.color }]}>
                        {S.label}
                    </Text>
                </View>

                {/* CUSTOMER */}
                <View style={styles.block}>
                    <Text style={styles.blockTitle}>Thông tin khách hàng</Text>
                    <Text style={styles.itemLine}>
                        Tên khách hàng: {order.customer?.name ?? "Không có tên"}
                    </Text>
                    <Text style={styles.itemLine}>
                        Số điện thoại:   {order.customer?.phone ?? "—"}
                    </Text>
                    <Text style={styles.itemLine}>
                        Địa chỉ:  {order.customer?.address ?? "Không có địa chỉ"}
                    </Text>
                </View>

                {/* ITEMS */}
                <View style={styles.block}>
                    <Text style={styles.blockTitle}>Sản phẩm</Text>
                    {order.items?.map((it, idx) => (
                        <View key={idx} style={styles.itemRow}>
                            <Text style={styles.itemName}>
                                {it.quantity} × {it.name}
                            </Text>
                            <Text style={styles.itemPrice}>
                                {formatVND(it.price)}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* TOTAL */}
                <View style={styles.block}>
                    <Text style={styles.blockTitle}>Tổng tiền</Text>
                    <Text style={styles.totalPrice}>{formatVND(order.total)}</Text>
                </View>

                {/* DRONE */}
                <View style={styles.block}>
                    <Text style={styles.blockTitle}>Drone giao hàng</Text>
                    <Text style={styles.itemLine}>
                        {order.droneId ?? "Chưa gán drone"}
                    </Text>
                </View>



                {/* TIME */}
                <View style={styles.block}>
                    <Text style={styles.blockTitle}>Thời gian</Text>
                    <Text style={styles.itemLine}>
                        Tạo đơn: {formatDate(order.createdAt)}
                    </Text>

                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

/* ----------------------- STYLES ----------------------- */
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#f6fffa" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#e4efe8",
        backgroundColor: "#fff",
        alignItems: "center",
    },
    backBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#eef7f2",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0b1f15",
    },

    container: {
        padding: 16,
        gap: 16,
        paddingBottom: 40,
    },

    statusBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: { fontWeight: "700" },

    block: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: "#d9e9df",
    },

    blockTitle: {
        fontWeight: "700",
        color: "#0b1f15",
        fontSize: 15,
        marginBottom: 8,
    },

    itemLine: {
        color: "#4b5d52",
        marginTop: 4,
    },

    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 6,
    },
    itemName: {
        color: "#0b1f15",
        fontSize: 14,
    },
    itemPrice: {
        color: "#0b1f15",
        fontWeight: "700",
    },

    totalPrice: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0b1f15",
    },
});
