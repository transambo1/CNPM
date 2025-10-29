import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Table, Tag, Switch } from "antd";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase"; // 🔥 đường dẫn tới file firebase.js
import "./Orders.css";

export default function OrdersList() {
    const [orders, setOrders] = useState([]);
    const [search, setSearch] = useState("");
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
    const navigate = useNavigate();

    // 🔥 Lấy dữ liệu từ Firestore
    useEffect(() => {
        async function fetchOrders() {
            try {
                const querySnapshot = await getDocs(collection(db, "orders"));
                const data = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setOrders(data);
                console.log("✅ Firestore loaded orders:", data);
            } catch (error) {
                console.error("❌ Lỗi tải đơn hàng từ Firestore:", error);
            }
        }
        fetchOrders();
    }, []);

    useEffect(() => {
        document.body.className = darkMode ? "dark-mode" : "light-mode";
        localStorage.setItem("theme", darkMode ? "dark" : "light");
    }, [darkMode]);

    const filteredOrders = orders.filter(
        (o) =>
            o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
            o.id.toString().includes(search)
    );

    const columns = [
        { title: "Mã ĐH", dataIndex: "id", key: "id" },
        { title: "Khách hàng", dataIndex: ["customer", "name"], key: "customer" },
        { title: "SĐT", dataIndex: ["customer", "phone"], key: "phone" },
        { title: "Ngày đặt", dataIndex: "date", key: "date" },
        {
            title: "Thành tiền",
            dataIndex: "total",
            key: "total",
            render: (val) => `${val.toLocaleString()}đ`,
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            render: (status) => {
                const color = status === "Đã giao" ? "green" : status === "Đã xử lý" ? "orange" : "volcano";
                return <Tag color={color}>{status}</Tag>;
            },
        },
    ];

    return (
        <div className="orders-page">
            <div className="orders-header">
                <h1>📦 Quản lý đơn hàng</h1>
                <div className="theme-switch">
                    <span>{darkMode ? "🌙" : "☀️"}</span>
                    <Switch checked={darkMode} onChange={setDarkMode} />
                </div>
            </div>

            <Input.Search
                placeholder="Tìm theo tên hoặc mã đơn hàng..."
                style={{ width: 400, marginBottom: 20 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
            />

            <Table
                columns={columns}
                dataSource={filteredOrders}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                onRow={(record) => ({
                    onClick: () => navigate(`/admin/orders/${record.id}`),
                })}
                className="orders-table"
            />
        </div>
    );
}
