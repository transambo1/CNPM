import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RestaurantOrders.css";

export default function RestaurantOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch("http://localhost:5002/orders");
                const data = await res.json();
                setOrders(data);
            } catch (err) {
                console.error("❌ Lỗi lấy đơn hàng:", err);
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
            alert("Không thể xác nhận đơn, vui lòng thử lại!");
        }
    };

    const handleViewDetail = (orderId) => {
        navigate(`/restaurantadmin/orders/${orderId}`);
    };

    const renderStatus = (status) => {
        switch (status) {
            case "Chờ xác nhận":
                return <span className="rso-status rso-wait">🟡 {status}</span>;
            case "Đang giao bằng drone":
                return <span className="rso-status rso-shipping">🔵 {status}</span>;
            case "Đã giao":
                return <span className="rso-status rso-done">🟢 {status}</span>;
            default:
                return <span className="rso-status">{status}</span>;
        }
    };

    if (loading)
        return <p className="rso-loading">⏳ Đang tải danh sách đơn hàng...</p>;

    return (
        <div className="rso-container">
            <h2 className="rso-title">📦 Danh sách đơn hàng</h2>

            {orders.length === 0 ? (
                <p className="rso-empty">Chưa có đơn hàng nào.</p>
            ) : (
                <table className="rso-table">
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
                            <tr
                                key={order.id}
                                className="rso-row"
                                onClick={() => handleViewDetail(order.id)}
                            >
                                <td>#{order.id}</td>
                                <td>{order.restaurantName}</td>
                                <td>{order.customer.name}</td>
                                <td>{order.customer.address}</td>
                                <td>{order.total.toLocaleString()}₫</td>
                                <td>{renderStatus(order.status)}</td>
                                <td>
                                    {order.status === "Chờ xác nhận" ? (
                                        <button
                                            className="rso-btn-confirm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleConfirm(order.id);
                                            }}
                                        >
                                            Xác nhận
                                        </button>
                                    ) : (
                                        <span className="rso-processed">✅ Xong</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
