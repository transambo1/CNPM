import React, { useEffect, useState } from "react";
import './OrderHistory.css';

function OrderHistory() {
    const [orders, setOrders] = useState([]);
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    useEffect(() => {
        if (currentUser && currentUser.id) {
            fetch(`http://localhost:5002/orders?userId=${currentUser.id}`)
                .then((res) => res.json())
                .then((data) => setOrders(data.sort((a, b) => new Date(b.date) - new Date(a.date)))) // Sắp xếp đơn hàng mới nhất lên đầu
                .catch((err) => console.error(err));
        }
    }, [currentUser]); // currentUser sẽ không thay đổi, có thể bỏ đi nếu muốn chỉ fetch 1 lần

    return (
        // Thêm className cho container chính
        <div className="order-history-page">
            <h2>Lịch sử đơn hàng</h2>

            {orders.length === 0 ? (
                <p className="no-orders-message">Bạn chưa có đơn hàng nào.</p>
            ) : (
                <ul className="orders-list">
                    {orders.map((order) => (
                        // Thêm className cho mỗi thẻ đơn hàng
                        <li key={order.id} className="order-card">
                            <div className="order-header">
                                <h3>Đơn hàng #{order.id}</h3>
                                <span>{new Date(order.date).toLocaleDateString('vi-VN')}</span>
                            </div>

                            <div className="order-body">
                                <ul className="order-items-list">
                                    {order.items && order.items.map((item, index) => (
                                        <li key={index} className="order-item">
                                            <span>{item.quantity}x {item.name}</span>
                                            <span>{(item.price * item.quantity).toLocaleString()}₫</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="order-footer">
                                <div className="order-total">
                                    <strong>Tổng tiền: {order.total.toLocaleString()}₫</strong>
                                </div>
                                <div className="order-status">
                                    Trạng thái:{" "}
                                    <span className={`status-tag ${order.status.replace(/\s+/g, '-').toLowerCase()}`}>
                                        {order.status}
                                    </span>
                                </div>

                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default OrderHistory;