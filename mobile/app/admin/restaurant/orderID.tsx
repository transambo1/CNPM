import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    Timestamp,
    collection,
    doc,
    getFirestore,
    onSnapshot,
    query,
    updateDoc,
    where,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

import { app } from "../../../libs/firebase";
import { useAuth } from "../../../libs/AuthContext";

/* ========= TYPES ========= */
type OrderItem = { id: string; name?: string; quantity?: number; price?: number };

type OrderRecord = {
    id: string;
    status?: string;
    createdAt?: Date | null;
    customer?: { name?: string; phone?: string; address?: string };
    items?: OrderItem[];
    total?: number;
    droneId?: string | null;
    restaurantId?: string;
};

type DroneRecord = {
    id: string;
    name?: string;
    status?: string;
    battery?: number;
    currentOrderId?: string | null;
};

/* ========= UTILS ========= */
const parseTimestamp = (v: any): Date | null => {
    if (!v) return null;
    if (v instanceof Timestamp) return v.toDate();
    if (v instanceof Date) return v;
    if (typeof v === "object" && v.seconds) return new Date(v.seconds * 1000);
    return null;
};

const formatCurrency = (v?: number | null) =>
    `${Number(v ?? 0).toLocaleString("vi-VN")} đ`;

const isDelivered = (s?: string) =>
    (s ?? "").toLowerCase().includes("đã giao") ||
    (s ?? "").toLowerCase().includes("delivered");

const isDelivering = (s?: string) =>
    (s ?? "").toLowerCase().includes("đang giao") ||
    (s ?? "").toLowerCase().includes("delivering");

const isDroneIdle = (s?: string) =>
    ["rảnh", "ranh", "idle", "available", ""].includes((s ?? "").toLowerCase());

/* ========= PAGE ========= */
export default function OrderDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const db = useMemo(() => getFirestore(app), []);

    const [order, setOrder] = useState<OrderRecord | null>(null);
    const [drones, setDrones] = useState<DroneRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [marking, setMarking] = useState(false);

    /* ========= LOAD ORDER ========= */
    useEffect(() => {
        if (!id) return;

        const unsub = onSnapshot(doc(db, "orders", id), (snap) => {
            if (!snap.exists()) return;
            const raw = snap.data() as any;

            setOrder({
                id: snap.id,
                status: raw.status,
                createdAt: parseTimestamp(raw.createdAt),
                customer: raw.customer,
                items: raw.items ?? [],
                total: Number(raw.total ?? raw.totalPrice ?? 0),
                droneId: raw.droneId ?? null,
                restaurantId: raw.restaurantId,
            });
            setLoading(false);
        });

        return () => unsub();
    }, [db, id]);

    /* ========= LOAD DRONES ========= */
    useEffect(() => {
        if (!order?.restaurantId) return;

        const unsub = onSnapshot(
            query(
                collection(db, "drones"),
                where("restaurantId", "==", order.restaurantId)
            ),
            (snap) => {
                setDrones(
                    snap.docs.map((d) => {
                        const v = d.data() as any;
                        return {
                            id: d.id,
                            name: v.name,
                            status: v.status,
                            battery: v.battery,
                            currentOrderId: v.currentOrderId ?? null,
                        } as DroneRecord;
                    })
                );
            }
        );

        return () => unsub();
    }, [db, order?.restaurantId]);

    if (loading || !order) {
        return (
            <SafeAreaView style={styles.centered}>
                <ActivityIndicator size="large" color="#00A74F" />
            </SafeAreaView>
        );
    }

    const availableDrones = drones.filter(
        (d) => isDroneIdle(d.status) && !d.currentOrderId
    );

    const assignedDrone = drones.find((d) => d.id === order.droneId);

    /* ========= ACTION: ASSIGN DRONE ========= */
    const assignDrone = async (dr: DroneRecord) => {
        setAssigning(true);
        try {
            await updateDoc(doc(db, "drones", dr.id), {
                status: "Đang giao",
                currentOrderId: order.id,
                destination: order.customer?.address ?? null,
            });

            await updateDoc(doc(db, "orders", order.id), {
                status: "Đang giao",
                droneId: dr.id,
            });

            Alert.alert("Thành công", `Đã gán drone ${dr.name}`);
        } catch (err) {
            Alert.alert("Lỗi", "Không thể gán drone");
        } finally {
            setAssigning(false);
        }
    };

    /* ========= ACTION: MARK DELIVERED ========= */
    const markDelivered = async () => {
        setMarking(true);
        try {
            await updateDoc(doc(db, "orders", order.id), {
                status: "Đã giao",
            });

            if (order.droneId) {
                await updateDoc(doc(db, "drones", order.droneId), {
                    status: "Rảnh",
                    currentOrderId: null,
                    destination: null,
                });
            }

            Alert.alert("Thành công", "Đơn đã giao");
        } catch (err) {
            Alert.alert("Lỗi", "Không thể cập nhật trạng thái");
        } finally {
            setMarking(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#0b1f15" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi tiết đơn hàng </Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Mã đơn hàng</Text>
                    <Text style={styles.status}>#{order.id}</Text>
                </View>
                {/* STATUS */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Trạng thái</Text>
                    <Text style={styles.status}>{order.status}</Text>
                </View>

                {/* CUSTOMER */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Khách hàng</Text>
                    <Text style={styles.label}>Tên: {order.customer?.name}</Text>
                    <Text style={styles.sub}>Số điện thoại: {order.customer?.phone}</Text>
                    <Text style={styles.sub}>Địa chỉ: {order.customer?.address}</Text>
                </View>

                {/* ITEMS */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Danh sách món</Text>
                    {order.items?.map((it) => (
                        <View key={it.id} style={styles.itemRow}>
                            <Text style={styles.itemName}>
                                {it.name} × {it.quantity}
                            </Text>
                            <Text style={styles.itemPrice}>{formatCurrency(it.price)}</Text>
                        </View>
                    ))}

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Tổng tiền</Text>
                        <Text style={styles.totalValue}>{formatCurrency(order.total)}</Text>
                    </View>
                </View>

                {/* DRONE */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Drone giao hàng</Text>

                    {assignedDrone ? (
                        <View style={styles.droneBox}>
                            <Ionicons name="airplane-outline" size={20} color="#00A74F" />
                            <View style={{ marginLeft: 8 }}>
                                <Text style={styles.label}>{assignedDrone.name}</Text>
                                <Text style={styles.sub}>
                                    Pin: {assignedDrone.battery ?? 0}%
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.sub}>Chưa được gán drone</Text>
                    )}

                    {/* Assign Button */}
                    {!isDelivered(order.status) && !isDelivering(order.status) && (
                        <>
                            <Text style={[styles.cardTitle, { marginTop: 16 }]}>
                                Drone rảnh
                            </Text>

                            {availableDrones.length === 0 && (
                                <Text style={styles.sub}>Không có drone rảnh</Text>
                            )}

                            {availableDrones.map((dr) => (
                                <TouchableOpacity
                                    key={dr.id}
                                    style={styles.assignBtn}
                                    onPress={() => assignDrone(dr)}
                                    disabled={assigning}
                                >
                                    {assigning ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="airplane-outline" size={18} color="#fff" />
                                            <Text style={styles.assignText}>
                                                Gán {dr.name} ({dr.battery}%)
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </>
                    )}

                    {/* Mark Delivered */}
                    {isDelivering(order.status) && (
                        <TouchableOpacity
                            style={[styles.assignBtn, { backgroundColor: "#2E7D32" }]}
                            onPress={markDelivered}
                            disabled={marking}
                        >
                            {marking ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.assignText}>Đánh dấu đã giao</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

/* ========= STYLES ========= */
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#f6fffa" },

    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f6fffa",
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e4efe8",
    },

    backBtn: {
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#eef7f2",
        borderRadius: 16,
    },

    headerTitle: { fontSize: 18, fontWeight: "700", color: "#0b1f15" },

    card: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#d9e9df",
    },

    cardTitle: { fontWeight: "700", fontSize: 15, marginBottom: 8, color: "#0b1f15" },
    label: { fontWeight: "600", fontSize: 14, color: "#0b1f15" },
    sub: { fontSize: 13, color: "#6c6f75", marginTop: 2 },

    status: {
        marginTop: 4,
        fontWeight: "700",
        color: "#007045",
        fontSize: 15,
    },

    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 6,
    },
    itemName: { fontSize: 14, color: "#0b1f15" },
    itemPrice: { fontWeight: "600", color: "#0b1f15" },

    totalRow: {
        borderTopWidth: 1,
        borderTopColor: "#eee",
        marginTop: 12,
        paddingTop: 12,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    totalLabel: { fontSize: 14, color: "#6c6f75" },
    totalValue: { fontSize: 16, fontWeight: "700", color: "#0b1f15" },

    droneBox: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
    },

    assignBtn: {
        marginTop: 10,
        backgroundColor: "#00A74F",
        borderRadius: 12,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },

    assignText: { color: "#fff", fontWeight: "700" },
});
