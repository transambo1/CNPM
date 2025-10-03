import React, { useEffect, useState } from "react";

function SellerOrders() {
    const [orders, setOrders] = useState([]);

    // Lấy tất cả đơn hàng
    useEffect(() => {
        fetch("http://localhost:5002/orders")
            .then((res) => res.json())
            .then((data) => setOrders(data))
            .catch((err) => console.error(err));
    }, []);

    // Hàm cập nhật trạng thái đơn hàng
    const updateStatus = (orderId, newStatus) => {
        fetch(`http://localhost:5002/orders/${orderId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        })
            .then((res) => res.json())
            .then((updatedOrder) => {
                setOrders((prev) =>
                    prev.map((order) =>
                        order.id === updatedOrder.id ? updatedOrder : order
                    )
                );
            })
            .catch((err) => console.error(err));
    };

    return (
        <div className="container">
            <h2>Quản lý đơn hàng</h2>
            {orders.length === 0 ? (
                <p>Chưa có đơn hàng nào</p>
            ) : (
                <table border="1" cellPadding="10" style={{ width: "100%", marginTop: "20px" }}>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Khách hàng</th>
                            <th>Sản phẩm</th>
                            <th>Tổng tiền</th>
                            <th>Ngày đặt</th>
                            <th>Trạng thái</th>

                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => (
                            <tr key={order.id}>
                                <td>{order.id}</td>
                                <td> {order.customer.name}</td>
                                <td>
                                    {order.items.map((item, index) => (
                                        <div key={index}>
                                            {item.name} x {item.quantity}
                                        </div>
                                    ))}
                                </td>
                                <td>{order.total.toLocaleString()}đ</td>
                                <td>{new Date(order.date).toLocaleString()}</td>

                                <td>
                                    <select
                                        value={order.status}
                                        onChange={(e) => updateStatus(order.id, e.target.value)}
                                    >
                                        <option value="Đang xử lý">Đang xử lý</option>
                                        <option value="Đã xử lý">Đã xử lý</option>
                                        <option value="Đang giao">Đang giao</option>
                                        <option value="Đã giao">Đã giao</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default SellerOrders;
