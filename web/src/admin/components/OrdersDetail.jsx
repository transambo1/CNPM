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

    return (
        <div className="order-detail-page">
            <Button onClick={() => navigate(-1)} className="back-btn">← Quay lại</Button>

            <Card title={`Chi tiết đơn hàng #${order.id}`} bordered={false} className="order-card">
                <p><b>Khách hàng:</b> {order.customer?.name}</p>
                <p><b>Số điện thoại:</b> {order.customer?.phone}</p>
                <p><b>Ngày đặt:</b> {order.date}</p>
                <p>
                    <b>Trạng thái:</b>{" "}
                    <Tag color={order.status === "Đã giao" ? "green" : order.status === "Đã xử lý" ? "orange" : "volcano"}>
                        {order.status}
                    </Tag>
                </p>

                <Table
                    columns={columns}
                    dataSource={order.items || []}
                    rowKey="name"
                    pagination={false}
                    className="order-items-table"
                />

                <div className="total-section">
                    <b>Tổng cộng:</b> <span>{order.total?.toLocaleString()}đ</span>
                </div>
            </Card>
        </div>
    );
}
