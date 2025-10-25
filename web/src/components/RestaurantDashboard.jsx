// src/components/RestaurantDashboard.jsx
import React, { useEffect, useState } from "react";
import "./RestaurantDashboard.css";

export default function RestaurantDashboard() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch("http://localhost:5002/orders");
                const data = await res.json();
                setOrders(data);
            } catch (err) {
                console.error("❌ Lỗi lấy đơn:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
        const interval = setInterval(fetchOrders, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleConfirm = async (orderId) => {
        try {
            const res = await fetch(`http://localhost:5002/orders/${orderId}`);
            const order = await res.json();
            const updatedOrder = {
                ...order,
                status: "Đang giao bằng drone",
                droneId: Math.floor(Math.random() * 1000) + 1,
            };

            await fetch(`http://localhost:5002/orders/${orderId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedOrder),
            });

            setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? updatedOrder : o))
            );

            alert(`✅ Đơn hàng #${orderId} đã được xác nhận!`);
        } catch (err) {
            console.error("❌ Lỗi xác nhận đơn:", err);
            alert("Không thể xác nhận đơn, thử lại!");
        }
    };

    if (loading)
        return <p className="rdash-loading">⏳ Đang tải đơn hàng...</p>;

    return (
        <div className="rdash-container">
            <h2 className="rdash-title">🏠 Quản lý đơn hàng</h2>

            {orders.length === 0 ? (
                <p className="rdash-empty">Chưa có đơn hàng nào.</p>
            ) : (
                <div className="rdash-table-wrapper">
                    <table className="rdash-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nhà hàng</th>
                                <th>Khách hàng</th>
                                <th>Địa chỉ</th>
                                <th>Tổng tiền</th>
                                <th>Trạng thái</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.id}>
                                    <td>#{order.id}</td>
                                    <td>{order.restaurantName}</td>
                                    <td>{order.customer.name}</td>
                                    <td>{order.customer.address}</td>
                                    <td>{order.total.toLocaleString()}₫</td>
                                    <td>
                                        <span
                                            className={`rdash-status ${order.status === "Đang xử lý"
                                                    ? "pending"
                                                    : "done"
                                                }`}
                                        >
                                            {order.status}
                                        </span>
                                    </td>
                                    <td>
                                        {order.status === "Đang xử lý" ? (
                                            <button
                                                className="rdash-btn-confirm"
                                                onClick={() =>
                                                    handleConfirm(order.id)
                                                }
                                            >
                                                ✅ Xác nhận
                                            </button>
                                        ) : (
                                            <span className="rdash-done">
                                                ✅ Đã xử lý
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
