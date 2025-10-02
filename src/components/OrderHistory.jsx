import React, { useEffect, useState } from "react";

function OrderHistory() {
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        fetch("http://localhost:5002/orders?userId=1") // userId có thể lấy từ localStorage
            .then(res => res.json())
            .then(data => setOrders(data));
    }, []);

    return (
        <div className="order-history">
            <h2>Lịch sử đơn hàng</h2>
            {orders.length === 0 ? (
                <p>Bạn chưa có đơn hàng nào</p>
            ) : (
                orders.map(order => (
                    <div key={order.id} className="order-card">
                        <p><b>Mã đơn:</b> {order.id}</p>
                        <p><b>Ngày đặt:</b> {order.date}</p>
                        <p><b>Trạng thái:</b> {order.status}</p>
                        <p><b>Tổng tiền:</b> {order.total.toLocaleString()}đ</p>
                        <h4>Sản phẩm:</h4>
                        <ul>
                            {order.items.map((item, idx) => (
                                <li key={idx}>{item.name} x{item.quantity} - {item.price.toLocaleString()}đ</li>
                            ))}
                        </ul>
                    </div>
                ))
            )}
        </div>
    );
}

export default OrderHistory;
