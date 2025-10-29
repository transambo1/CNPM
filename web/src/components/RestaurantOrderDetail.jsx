// src/components/RestaurantOrderDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./RestaurantOrderDetail.css";
import { db } from "../firebase";

export default function RestaurantOrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await fetch(`http://localhost:5002/orders/${id}`);
                const data = await res.json();
                setOrder(data);
            } catch (err) {
                console.error("❌ Lỗi lấy chi tiết đơn:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    if (loading) return <p className="rsd-loading">⏳ Đang tải chi tiết đơn...</p>;
    if (!order) return <p className="rsd-error">❌ Không tìm thấy đơn hàng!</p>;

    return (
        <div className="rsd-container">
            <button onClick={() => navigate(-1)} className="rsd-btn-back">
                ⬅ Quay lại danh sách
            </button>

            <div className="rsd-card">
                <h2 className="rsd-title">📋 Chi tiết đơn hàng #{order.id}</h2>

                <div className="rsd-info">
                    <p><strong>🏠 Nhà hàng:</strong> {order.restaurantName}</p>
                    <p><strong>👤 Khách hàng:</strong> {order.customer.name} - {order.customer.phone}</p>
                    <p><strong>📍 Địa chỉ:</strong> {order.customer.address}</p>
                    <p><strong> Drone:</strong> {order.droneId}</p>
                    <p><strong>💰 Tổng tiền:</strong> {order.total.toLocaleString()}₫</p>
                    <p>
                        <strong>🚚 Trạng thái:</strong>{" "}
                        <span
                            className={`rsd-status ${order.status === "Đang xử lý"
                                ? "rsd-pending"
                                : "rsd-done"
                                }`}
                        >
                            {order.status}
                        </span>
                    </p>
                </div>

                <h3 className="rsd-subtitle">🛒 Danh sách sản phẩm</h3>
                <ul className="rsd-items">
                    {order.items.map((item) => (
                        <li key={item.id} className="rsd-item">
                            <img src={item.img} alt={item.name} className="rsd-item-img" />
                            <div className="rsd-item-info">
                                <span className="rsd-item-name">{item.name}</span>
                                <span className="rsd-item-qty">Số lượng: {item.quantity}</span>
                                <span className="rsd-item-price">
                                    {item.price.toLocaleString()}₫
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
