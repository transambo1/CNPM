import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Table, Tag, Button } from "antd";
import "./OrdersDetail.css";

export default function OrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);

    useEffect(() => {
        fetch(`http://localhost:5002/orders/${id}`)
            .then((res) => res.json())
            .then((data) => setOrder(data))
            .catch((err) => console.error("Lỗi tải chi tiết:", err));
    }, [id]);

    if (!order) return <div className="loading">Đang tải chi tiết đơn hàng...</div>;

    const columns = [
        { title: "Tên sản phẩm", dataIndex: "name", key: "name" },
        { title: "Số lượng", dataIndex: "quantity", key: "quantity" },
        {
            title: "Đơn giá",
            dataIndex: "price",
            key: "price",
            render: (v) => `${v.toLocaleString()}đ`,
        },
        {
            title: "Thành tiền",
            key: "total",
            render: (_, r) => `${(r.price * r.quantity).toLocaleString()}đ`,
        },
    ];

    const statusColor = (status) => {
        switch (status) {
            case "Đã giao":
                return "green";
            case "Đang giao bằng drone":
                return "blue";
            case "Đang xử lý":
            case "Chờ xử lý":
                return "orange";
            default:
                return "volcano";
        }
    };

    return (
        <div className="order-detail-page">
            <Button onClick={() => navigate(-1)} className="back-btn">← Quay lại</Button>

            <Card title={`Chi tiết đơn hàng #${order.id}`} bordered={false} className="order-card">
                <h3> Khách hàng:</h3>
                <p><b>Tên:</b> {order.customer?.name}</p>
                <p><b> SĐT:</b> {order.customer?.phone}</p>
                <p><b> Email:</b> {order.customer?.email}</p>
                <p><b> Địa chỉ:</b> {order.customer?.address}</p>

                <h3> Nhà hàng giao:</h3>
                <p>{order.restaurantName}</p>

                {order.droneId && (
                    <>
                        <h3> Drone giao hàng:</h3>
                        <p>ID Drone: {order.droneId}</p>
                    </>
                )}

                <h3>🗓 Ngày đặt:</h3>
                <p>{order.date}</p>

                <h3>📌 Trạng thái:</h3>
                <Tag color={statusColor(order.status)}>{order.status}</Tag>

                <Table
                    columns={columns}
                    dataSource={order.items || []}
                    rowKey="id"
                    pagination={false}
                    className="order-items-table"
                    style={{ marginTop: 20 }}
                />

                <div className="total-section" style={{ marginTop: 20, fontWeight: "bold", fontSize: 16 }}>
                    Tổng cộng: <span>{order.total?.toLocaleString()}đ</span>
                </div>
            </Card>
        </div>
    );
}
