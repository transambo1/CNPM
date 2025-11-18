import React, { useEffect, useState } from "react";
import "./OrderHistory.css";

function OrderHistory() {
    const [orders, setOrders] = useState([]);
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    useEffect(() => {
        if (currentUser && currentUser.id) {
            fetch(`http://localhost:5005/orders?userId=${currentUser.id}`)
                .then((res) => res.json())
                .then((data) => setOrders(data))
                .catch((err) => console.error(err));
        }
    }, [currentUser]);
    const handleClaimRequest = async (order) => {
        const claimData = {
            orderId: order.id,
            userId: order.userId,
            customer: order.customer,
            items: order.items,
            total: order.total,
            date: new Date().toISOString(),
            status: "Đang chờ xử lý"
        };

        await fetch("http://localhost:5005/claims", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(claimData)
        });

        alert("✅ Gửi yêu cầu bồi thường thành công!");
    };
    return (
        <div className="container">
            <h2>Hợp đồng bảo hiểm </h2>
            {orders.length === 0 ? (
                <p>Bạn chưa có hợp đồng nào</p>
            ) : (
                <div className="container1">

                    {orders.length === 0 ? (
                        <p>Chưa có đơn hàng nào</p>
                    ) : (
                        <table border="1" cellPadding="10" style={{ width: "100%", marginTop: "20px" }}>
                            <thead>
                                <tr>
                                    <th>Mã đơn</th>
                                    <th>Thông tin khách hàng</th>
                                    <th>Số điện thoại</th>
                                    <th>Địa chỉ khách hàng</th>
                                    <th>Loại bảo hiểm</th>
                                    <th>Tổng tiền</th>
                                    <th>Tiền đền bù lên đến</th>
                                    <th>Ngày đăng kí</th>
                                    <th>Yêu cầu bồi thường</th>
                                    <th>Trạng thái</th>

                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <tr key={order.id}>
                                        <td>{order.id}</td>
                                        <td> {order.customer.name}</td>
                                        <td>{order.customer.phone}</td>
                                        <td>{order.customer.address}</td>
                                        <td>
                                            {order.items.map((item, index) => (
                                                <div key={index}>
                                                    {item.name} x {item.quantity}
                                                </div>
                                            ))}
                                        </td>
                                        <td>{order.total.toLocaleString()}đ</td>
                                        <td>
                                            {order.items.map((item, index) => (
                                                <div key={index}>
                                                    {Number(item.claim).toLocaleString()}đ
                                                </div>
                                            ))}
                                        </td>

                                        <td>{new Date(order.date).toLocaleString()}</td>
                                        <td>
                                            <button className="claim-button"
                                                onClick={() => handleClaimRequest(order)}
                                            >
                                                Gửi yêu cầu bồi thường
                                            </button>
                                        </td>
                                        <td>
                                            {order.status}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}

export default OrderHistory;
