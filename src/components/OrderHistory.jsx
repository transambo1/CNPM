import React, { useEffect, useState } from "react";

function OrderHistory() {
    const [orders, setOrders] = useState([]);
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    useEffect(() => {
        if (currentUser && currentUser.id) {
            fetch(`http://localhost:5002/orders?userId=${currentUser.id}`)
                .then((res) => res.json())
                .then((data) => setOrders(data))
                .catch((err) => console.error(err));
        }
    }, [currentUser]);

    return (
        <div className="container">
            <h2>Lịch sử đơn hàng</h2>
            {orders.length === 0 ? (
                <p>Bạn chưa có đơn hàng nào</p>
            ) : (
                <ul>
                    {orders.map((order) => (
                        <li key={order.id}>
                            <p>Đơn hàng #{order.id}</p>
                            <p>Ngày: {new Date(order.date).toLocaleString()}</p>
                            <p>Tổng tiền: {order.total} VND</p>
                            <p>Trạng thái: {order.status}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default OrderHistory;
