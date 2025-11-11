// src/admin/pages/OrdersList.jsx
import { useEffect, useState, useMemo } from "react";
import { Input, Table, Tag, Select } from "antd";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import "./Orders.css";

export default function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [restaurantFilter, setRestaurantFilter] = useState("all");

  // 🔥 Fetch Orders
  useEffect(() => {
    async function fetchOrders() {
      try {
        const querySnapshot = await getDocs(collection(db, "orders"));
        const data = querySnapshot.docs.map((doc) => {
          const item = doc.data();
          return {
            id: doc.id,
            ...item,
            createdAt: item.createdAt?.seconds
              ? new Date(item.createdAt.seconds * 1000)
              : null,
          };
        });
        setOrders(data);
        console.log("✅ Firestore loaded orders:", data);
      } catch (error) {
        console.error("❌ Lỗi tải đơn hàng:", error);
      }
    }
    fetchOrders();
  }, []);

  // 🧠 Filter + sort Orders
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders
      .filter((o) => {
        const matchSearch =
          o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
          o.id.toString().includes(search);

        const matchStatus =
          statusFilter === "all" ||
          (o.status &&
            o.status.toLowerCase().includes(statusFilter.toLowerCase()));

        const matchRestaurant =
          restaurantFilter === "all" ||
          o.restaurantName === restaurantFilter ||
          o.restaurant?.name === restaurantFilter;

        // Filter by time
        let matchTime = true;
        if (timeFilter !== "all" && o.createdAt) {
          const diffHours = (now - o.createdAt) / (1000 * 60 * 60);
          if (timeFilter === "24h" && diffHours > 24) matchTime = false;
          if (timeFilter === "3d" && diffHours > 72) matchTime = false;
          if (timeFilter === "7d" && diffHours > 168) matchTime = false;
        }

        return matchSearch && matchStatus && matchRestaurant && matchTime;
      })
      .sort(
        (a, b) =>
          (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
      );
  }, [orders, search, statusFilter, timeFilter, restaurantFilter]);

  // ===== Table Columns =====
  const columns = [
    { title: "Mã ĐH", dataIndex: "id", key: "id" },
    { title: "Khách hàng", dataIndex: ["customer", "name"], key: "customer" },
    { title: "SĐT", dataIndex: ["customer", "phone"], key: "phone" },
    {
      title: "Nhà hàng",
      dataIndex: "restaurantName",
      key: "restaurantName",
      render: (_, record) =>
        record.restaurantName || record.restaurant?.name || "—",
    },
    {
      title: "Ngày đặt",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (val) => (val ? val.toLocaleString("vi-VN") : "—"),
    },
    {
      title: "Thành tiền",
      dataIndex: "total",
      key: "total",
      render: (val) => `${Number(val || 0).toLocaleString("vi-VN")}₫`,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status = "") => {
        const s = status.toLowerCase();
        let color = "blue";
        if (s.includes("đã giao")) color = "green";
        else if (s.includes("đang xử lý") || s.includes("chờ xác nhận"))
          color = "orange";
        else if (s.includes("đang giao")) color = "geekblue";
        return <Tag color={color}>{status}</Tag>;
      },
    },
  ];

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h1>📦 Quản lý đơn hàng (Admin)</h1>
      </div>

      {/* ===== Bộ lọc ===== */}
      <div className="filter-container">
        <div className="filter-item">
          <label>Tìm kiếm:</label>
          <Input
            placeholder="Nhập tên hoặc mã đơn hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </div>

        <div className="filter-item">
          <label>Trạng thái:</label>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: "Tất cả", value: "all" },
              { label: "Chờ xác nhận", value: "chờ xác nhận" },
              { label: "Đang xử lý", value: "đang xử lý" },
              { label: "Đang giao", value: "đang giao" },
              { label: "Đã giao", value: "đã giao" },
            ]}
          />
        </div>

        <div className="filter-item">
          <label>Thời gian:</label>
          <Select
            value={timeFilter}
            onChange={setTimeFilter}
            options={[
              { label: "Tất cả", value: "all" },
              { label: "24 giờ", value: "24h" },
              { label: "3 ngày", value: "3d" },
              { label: "7 ngày", value: "7d" },
            ]}
          />
        </div>

        <div className="filter-item">
          <label>Nhà hàng:</label>
          <Select
            value={restaurantFilter}
            onChange={setRestaurantFilter}
            options={[
              { label: "Tất cả", value: "all" },
              ...Array.from(
                new Set(
                  orders.map((o) => o.restaurantName || o.restaurant?.name)
                )
              )
                .filter(Boolean)
                .map((r) => ({ label: r, value: r })),
            ]}
            showSearch
            optionFilterProp="label"
          />
        </div>
      </div>

      {/* ===== Bảng đơn hàng ===== */}
      <Table
        columns={columns}
        dataSource={filteredOrders}
        rowKey="id"
        pagination={{ pageSize: 8 }}
        className="orders-table"
      />
    </div>
  );
}
