import React, { useEffect, useMemo, useState, useCallback } from "react";
import "./RestaurantDashboard.css";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { message } from "antd";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

export default function RestaurantDashboard() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [drones, setDrones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrone, setSelectedDrone] = useState({});

  // --- FILTER STATE ---
  const [statusFilter, setStatusFilter] = useState("all");
  const [droneFilter, setDroneFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");

  // === DATA FOR DASHBOARD & CHARTS ===
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    delivering: 0,
    processing: 0,
    delivered: 0,
  });
  const [chartData, setChartData] = useState([]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);

      let ordersSnap, dronesSnap;

      if (currentUser?.role === "restaurant" && currentUser?.restaurantId) {
        const ordersQuery = query(
          collection(db, "orders"),
          where("restaurantId", "==", currentUser.restaurantId)
        );
        const dronesQuery = query(
          collection(db, "drones"),
          where("restaurantId", "==", currentUser.restaurantId)
        );
        [ordersSnap, dronesSnap] = await Promise.all([
          getDocs(ordersQuery),
          getDocs(dronesQuery),
        ]);
      } else {
        [ordersSnap, dronesSnap] = await Promise.all([
          getDocs(collection(db, "orders")),
          getDocs(collection(db, "drones")),
        ]);
      }

      const oData = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const dData = dronesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const filteredOrders =
        currentUser?.role === "restaurant"
          ? oData.filter((o) => o.restaurantId === currentUser.restaurantId)
          : oData;

      const filteredDrones =
        currentUser?.role === "restaurant"
          ? dData.filter((d) => d.restaurantId === currentUser.restaurantId)
          : dData;

      setOrders(filteredOrders);
      setDrones(filteredDrones);

      // === STATS ===
      const delivered = filteredOrders.filter((o) =>
        (o.status || "").toLowerCase().includes("đã giao")
      );
      const delivering = filteredOrders.filter((o) =>
        (o.status || "").toLowerCase().includes("đang giao")
      );
      const processing = filteredOrders.filter((o) =>
        (o.status || "").toLowerCase().includes("xử lý")
      );

      const totalRevenue = delivered.reduce(
        (sum, o) => sum + (o.total || o.totalPrice || 0),
        0
      );

      setStats({
        totalOrders: filteredOrders.length,
        totalRevenue,
        delivering: delivering.length,
        processing: processing.length,
        delivered: delivered.length,
      });

      // === CHART DATA (đã fix lỗi sắp xếp ngày) ===
      const dailyStats = {};
      delivered.forEach((o) => {
        let dateObj;
        if (o.createdAt?.seconds) {
          dateObj = new Date(o.createdAt.seconds * 1000);
        } else if (o.date) {
          const [day, month, year] = o.date.split("/").map(Number);
          dateObj = new Date(year, month - 1, day);
        } else {
          dateObj = new Date();
        }

        const dateKey = dateObj.toLocaleDateString("vi-VN");
        const timestamp = dateObj.getTime();

        if (!dailyStats[dateKey]) {
          dailyStats[dateKey] = {
            date: dateKey,
            timestamp,
            revenue: 0,
            count: 0,
          };
        }
        dailyStats[dateKey].revenue += o.total || o.totalPrice || 0;
        dailyStats[dateKey].count += 1;
      });

      setChartData(
        Object.values(dailyStats).sort((a, b) => a.timestamp - b.timestamp)
      );
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
      message.error("Không thể tải dữ liệu Dashboard");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refreshData = async () => await fetchAll();

  const findDroneById = (id) => drones.find((d) => String(d.id) === String(id));

  const toMillis = (createdAt) => {
    if (!createdAt) return null;
    if (createdAt.seconds) return createdAt.seconds * 1000;
    if (createdAt instanceof Date) return createdAt.getTime();
    const t = new Date(createdAt).getTime();
    return Number.isFinite(t) ? t : null;
  };

  // --- FILTER & PAGINATION ---
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

    const normalizeStatus = (s = "") => s.toLowerCase();
    const matchStatus = (o) => {
      if (statusFilter === "all") return true;
      const s = normalizeStatus(o.status || "");
      if (statusFilter === "processing")
        return s.includes("xử lý") || s.includes("processing") || s === "confirmed";
      if (statusFilter === "delivering")
        return s.includes("đang giao") || s.includes("delivering");
      if (statusFilter === "delivered")
        return s.includes("đã giao") || s.includes("delivered");
      if (statusFilter === "other") {
        const isProc = s.includes("xử lý") || s.includes("processing") || s === "confirmed";
        const isDeliv = s.includes("đang giao") || s.includes("delivering");
        const isDone = s.includes("đã giao") || s.includes("delivered");
        return !isProc && !isDeliv && !isDone;
      }
      return true;
    };

    const matchDrone = (o) => {
      if (droneFilter === "all") return true;
      if (!o.droneId) return false;
      return String(o.droneId) === String(droneFilter);
    };

    return orders
      .filter(inTimeRange)
      .filter(matchStatus)
      .filter(matchDrone)
      .sort((a, b) => (toMillis(b.createdAt) ?? 0) - (toMillis(a.createdAt) ?? 0));
  }, [orders, statusFilter, droneFilter, timeFilter]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  useEffect(() => setCurrentPage(1), [statusFilter, droneFilter, timeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleAssignDrone = async (orderId) => {
    const droneId = selectedDrone[orderId];
    if (!droneId) {
      alert("⚠️ Vui lòng chọn drone trước khi xác nhận giao.");
      return;
    }

    try {
      const order = orders.find((o) => String(o.id) === String(orderId));
      const drone = findDroneById(droneId);
      if (!order || !drone) {
        alert("Không tìm thấy order hoặc drone.");
        return;
      }

      await updateDoc(doc(db, "drones", drone.id), {
        status: "Đang giao",
        currentOrderId: order.id,
        restaurantId: order.restaurantId || null,
        destination: order.customer?.address || null,
      });

      await updateDoc(doc(db, "orders", order.id), {
        status: "Đang giao",
        droneId: drone.id,
      });

      alert(`✅ Đã gán ${drone.name} giao đơn #${order.id}`);
      await refreshData();
    } catch (err) {
      console.error("Lỗi khi gán drone:", err);
      alert("❌ Có lỗi khi gán drone.");
    }
  };

  const formatStatusBadge = (status) => {
    if (!status) return <span className="badge other">—</span>;
    const s = status.toLowerCase();
    if (s.includes("giao")) {
      if (s === "đang giao" || s.includes("delivering"))
        return <span className="badge delivering">Đang giao</span>;
      if (s === "đã giao" || s.includes("delivered"))
        return <span className="badge done">Đã giao</span>;
    }
    if (s === "confirmed" || s.includes("xử lý") || s.includes("processing"))
      return <span className="badge pending">Đang xử lý</span>;
    return <span className="badge other">{status}</span>;
  };

  if (loading) return <p>⏳ Đang tải dữ liệu...</p>;

  return (
    <div className="restaurant-dashboard">
      <h2>
        Dashboard Nhà hàng{" "}
        {currentUser?.role === "restaurant" && currentUser?.name
          ? `- ${currentUser.name}`
          : ""}
      </h2>

      {/* === DASHBOARD CARDS === */}
      <div className="cards">
        <div className="card purple">
          <h2>{stats.totalOrders}</h2>
          <p>Tổng đơn hàng</p>
        </div>
        <div className="card orange">
          <h2>{stats.processing}</h2>
          <p>Đang xử lý</p>
        </div>
        <div className="card green">
          <h2>{stats.delivering}</h2>
          <p>Đang giao</p>
        </div>
        <div className="card blue">
          <h2>{stats.totalRevenue.toLocaleString()}₫</h2>
          <p>Tổng doanh thu</p>
        </div>
      </div>

      {/* === CHARTS === */}
      <div className="charts">
        <div className="chart-container">
          <h3>💰 Doanh thu theo ngày</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(v) => `${v.toLocaleString()}₫`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#4f46e5"
                strokeWidth={3}
                name="Doanh thu"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>📦 Số đơn hàng theo ngày</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="count"
                fill="#10b981"
                name="Số đơn hàng"
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* === FILTER + TABLE === */}
      <div className="filter-bar">
        <div className="filter-item">
          <label>Trạng thái</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả</option>
            <option value="processing">Đang xử lý</option>
            <option value="delivering">Đang giao</option>
            <option value="delivered">Đã giao</option>
            <option value="other">Chờ xác nhận</option>
          </select>
        </div>

        <div className="filter-item">
          <label>Drone</label>
          <select
            value={droneFilter}
            onChange={(e) => setDroneFilter(e.target.value)}
          >
            <option value="all">Tất cả</option>
            {drones.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.battery}%)
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>Thời gian</label>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
          >
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

      {/* === TABLE === */}
      <div className="table-meta">
        <span>
          Hiển thị: <b>{paginatedOrders.length}</b> / {filteredOrders.length} đơn
        </span>
      </div>

      <table className="orders-table">
        <thead>
          <tr>
            <th>Mã</th>
            <th>Khách</th>
            <th>Địa chỉ</th>
            <th>Nhà hàng</th>
            <th>Thời gian</th>
            <th>Trạng thái</th>
            <th>Drone</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {paginatedOrders.map((order) => {
            const oStatus = order.status || "";
            const assignedDrone = order.droneId
              ? findDroneById(order.droneId)
              : null;
            const createdAtMs = toMillis(order.createdAt);
            const createdAtTxt = createdAtMs
              ? new Date(createdAtMs).toLocaleString()
              : "—";

            return (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>
                  <div className="cust-name">{order.customer?.name}</div>
                  <div className="small">{order.customer?.phone}</div>
                </td>
                <td>{order.customer?.address}</td>
                <td>
                  {order.restaurantName ||
                    order.items?.[0]?.restaurant ||
                    "—"}
                </td>
                <td>{createdAtTxt}</td>
                <td>{formatStatusBadge(oStatus)}</td>
                <td>
  {oStatus === "Đã giao" || oStatus === "Đang giao" ? (
    assignedDrone ? (
      <strong>{assignedDrone.name}</strong>
    ) : (
      <span>—</span>
    )
  ) : (
    <select
      value={selectedDrone[order.id] || ""}
      onChange={(e) =>
        setSelectedDrone((prev) => ({
          ...prev,
          [order.id]: e.target.value,
        }))
      }
    >
      <option value="">Chọn drone</option>
      {drones
        .filter((d) => d.status === "Rảnh")
        .map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} ({d.battery}%)
          </option>
        ))}
    </select>
  )}
</td>

                <td>
                  {oStatus === "Đã giao" ? (
                    <button className="btn disabled" disabled>
                      Đã xử lí
                    </button>
                  ) : oStatus === "Đang giao" ? (
                    <span>Đang giao</span>
                  ) : (
                    <button
                      className="btn primary"
                      onClick={() => handleAssignDrone(order.id)}
                      disabled={!selectedDrone[order.id]}
                    >
                      Giao bằng drone
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="orders-pagination">
          <button
            className="orders-page-btn"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
          >
            ← Prev
          </button>

          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              className={`orders-page-btn ${currentPage === i + 1 ? "active" : ""}`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}

          <button
            className="orders-page-btn"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
