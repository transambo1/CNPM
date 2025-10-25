import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./WaitingForConfirmation.css";

export default function WaitingForConfirmation() {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchOrder = async () => {
        try {
            const res = await fetch(`http://localhost:5002/orders/${orderId}`);
            const data = await res.json();
            setOrder(data);
        } catch (error) {
            console.error("Lỗi khi lấy đơn:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
        const interval = setInterval(fetchOrder, 3000); // Realtime
        return () => clearInterval(interval);
    }, [orderId]);

    const handleReceived = async () => {
        try {
            const updatedOrder = { ...order, status: "Đã giao" };
            await fetch(`http://localhost:5002/orders/${orderId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedOrder),
            });
            setOrder(updatedOrder);
            alert("✅ Bạn đã nhận hàng!");
        } catch (err) {
            console.error("Lỗi cập nhật đơn:", err);
            alert("❌ Không thể cập nhật trạng thái, thử lại!");
        }
    };

    if (loading) return <div className="loading">⏳ Đang tải đơn hàng...</div>;
    if (!order) return <p>Không tìm thấy đơn hàng #{orderId}</p>;

    return (
        <div className="waiting-page">
            <h2>🚀 Theo dõi đơn hàng #{order.id}</h2>

            {/* Thông tin khách hàng & đơn hàng */}
            <div className="order-info">
                <div><strong>Nhà hàng:</strong> {order.restaurantName}</div>
                <div><strong>Khách hàng:</strong> {order.customer.name}</div>
                <div><strong>Điện thoại:</strong> {order.customer.phone}</div>
                <div><strong>Email:</strong> {order.customer.email}</div>
                <div><strong>Địa chỉ:</strong> {order.customer.address}</div>
                <div><strong>Ngày đặt:</strong> {order.date}</div>
            </div>

            {/* Danh sách món */}
            <div className="order-items">
                <h3>🛒 Chi tiết món đã đặt</h3>
                {order.items.map(item => (
                    <div key={item.id} className="order-item">
                        <img src={item.img} alt={item.name} />
                        <div className="item-info">
                            <p className="item-name">{item.name}</p>
                            <p>Số lượng: {item.quantity}</p>
                            <p>Đơn giá: {item.price.toLocaleString()}₫</p>
                            <p>Tổng: {(item.price * item.quantity).toLocaleString()}₫</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tổng tiền */}
            <div className="order-total">
                <strong>Tổng cộng:</strong> {order.total.toLocaleString()}₫
            </div>

            {/* Trạng thái đơn hàng */}
            <div className="order-status">
                {order.status === "Đang xử lý" && (
                    <p className="status pending">🕒 Đang chờ nhà hàng xác nhận...</p>
                )}
                {order.status === "Đang giao bằng drone" && (
                    <p className="status flying">🚁 Drone #{order.droneId} đang giao hàng!</p>
                )}
                {order.status === "Đã giao" && (
                    <p className="status delivered">✅ Đơn hàng đã giao thành công!</p>
                )}
            </div>

            {/* Bản đồ + nút chỉ khi drone đang giao */}
            {order.status === "Đang giao bằng drone" && (
                <div className="drone-section">
                    <div className="drone-map">
                        <h3>📍 Theo dõi Drone</h3>
                        <iframe
                            title="Drone Map"
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(
                                order.customer.address
                            )}&z=14&output=embed`}
                        ></iframe>
                    </div>
                    <button className="btn-received" onClick={handleReceived}>
                        ✅ Đã nhận hàng
                    </button>
                </div>
            )}
        </div>
    );
}
