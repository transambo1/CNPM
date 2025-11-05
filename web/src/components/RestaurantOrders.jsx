import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "./RestaurantOrders.css";

export default function RestaurantOrders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [droneFilter, setDroneFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");

  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const snap = await getDocs(collection(db, "orders"));
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setOrders(data);
  };

  // Convert createdAt → milliseconds
  const toMillis = (createdAt) => {
    if (!createdAt) return null;
    if (createdAt.seconds) return createdAt.seconds * 1000; // Firestore Timestamp
    if (createdAt instanceof Date) return createdAt.getTime(); // Date object
    const t = new Date(createdAt).getTime(); // String/Number
    return Number.isFinite(t) ? t : null;
  };

  // === FILTER ORDERS ===
  const filteredOrders = useMemo(() => {
    const now = Date.now();

    const inTimeRange = (o) => {
      if (timeFilter === "all") return true;
      const ms = toMillis(o.createdAt);
      if (!ms) return false;

      if (timeFilter === "24h") return ms >= now - 24 * 60 * 60 * 1000;
      if (timeFilter === "3d") return ms >= now - 3 * 24 * 60 * 60 * 1000;
      if (timeFilter === "7d") return ms >= now - 7 * 24 * 60 * 60 * 1000;

      return true;
    };

    let result = [...orders];

    // 1️⃣ Status Filter
    if (statusFilter !== "all") {
      result = result.filter((o) => o.status === statusFilter);
    }

    // 2️⃣ Drone Filter
    if (droneFilter === "withDrone") result = result.filter((o) => o.droneId);
    if (droneFilter === "noDrone") result = result.filter((o) => !o.droneId);

    // 3️⃣ Time Filter (giống file 1)
    result = result.filter(inTimeRange);

    return result;
  }, [orders, statusFilter, droneFilter, timeFilter]);

  const handleViewDetail = (orderId) =>
    navigate(`/restaurantadmin/orders/${orderId}`);

  const renderStatus = (status) => {
    switch (status) {
      case "Chờ xác nhận":
        return <span className="rso-status rso-wait">🟡 {status}</span>;
      case "Đang giao":
        return <span className="rso-status rso-shipping">🔵 {status}</span>;
      case "Đã giao":
        return <span className="rso-status rso-done">🟢 {status}</span>;
      default:
        return <span className="rso-status">{status}</span>;
    }
  };

  return (
    <div className="rso-container">
      <h2 className="rso-title">📦 Danh sách đơn hàng</h2>

      {/* 🔥 FILTER UI giống file 1 */}
      <div className="filter-bar">
        <div className="filter-item">
          <label>Trạng thái</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="Chờ xác nhận">Chờ xác nhận</option>
            <option value="Đang giao">Đang giao</option>
            <option value="Đã giao">Đã giao</option>
          </select>
        </div>

        <div className="filter-item">
          <label>Drone</label>
          <select value={droneFilter} onChange={(e) => setDroneFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="withDrone">Có drone</option>
            <option value="noDrone">Chưa có drone</option>
          </select>
        </div>

        <div className="filter-item">
          <label>Thời gian</label>
          <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="24h">24 giờ qua</option>
            <option value="3d">3 ngày qua</option>
            <option value="7d">7 ngày qua</option>
          </select>
        </div>

        <button
          className="btn reset"
          onClick={() => {
            setStatusFilter("all");
            setDroneFilter("all");
            setTimeFilter("all");
          }}
        >
          Xóa lọc
        </button>
      </div>

      {/* Meta line giống file 1 */}
      <div className="table-meta">
        <span>
          Hiển thị: <b>{filteredOrders.length}</b> / {orders.length} đơn
        </span>
      </div>

      {filteredOrders.length === 0 ? (
        <p className="rso-empty">Không có đơn hàng nào phù hợp.</p>
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
              <th>Drone</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr
                key={order.id}
                className="rso-row"
                onClick={() => handleViewDetail(order.id)}
              >
                <td>#{order.id}</td>
                <td>{order.restaurantName}</td>
                <td>{order.customer?.name}</td>
                <td>{order.customer?.address}</td>
                <td>{order.total?.toLocaleString()}₫</td>
                <td>{renderStatus(order.status)}</td>
                <td>{order.droneId ? `Drone #${order.droneId}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
