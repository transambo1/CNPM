import React, { useEffect, useMemo, useState, useCallback } from "react";
import "./RestaurantDashboard.css";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function RestaurantDashboard() {
  const [orders, setOrders] = useState([]);
  const [drones, setDrones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrone, setSelectedDrone] = useState({});

  // --- FILTER STATE ---
  const [statusFilter, setStatusFilter] = useState("all"); // all | processing | delivering | delivered | other
  const [droneFilter, setDroneFilter] = useState("all");   // all | droneId
  const [timeFilter, setTimeFilter] = useState("all");   // all | 24h | 3d | 7d

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [ordersSnap, dronesSnap] = await Promise.all([
        getDocs(collection(db, "orders")),
        getDocs(collection(db, "drones")),
      ]);

      const oData = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const dData = dronesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setOrders(oData);
      setDrones(dData);
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refreshData = async () => {
    await fetchAll();
  };

  const findDroneById = (id) => drones.find((d) => String(d.id) === String(id));

  // --- Utils: chuẩn hóa createdAt ---
  const toMillis = (createdAt) => {
    if (!createdAt) return null;
    // Firestore Timestamp
    if (createdAt.seconds) return createdAt.seconds * 1000;
    // JS Date
    if (createdAt instanceof Date) return createdAt.getTime();
    // string/number
    const t = new Date(createdAt).getTime();
    return Number.isFinite(t) ? t : null;
  };

  // --- SOFT FILTER (client-side) ---
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
      if (statusFilter === "processing") {
        return s.includes("xử lý") || s.includes("processing") || s === "confirmed";
      }
      if (statusFilter === "delivering") {
        return s.includes("đang giao") || s.includes("delivering");
      }
      if (statusFilter === "delivered") {
        return s.includes("đã giao") || s.includes("delivered");
      }
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
      .filter(matchDrone);
  }, [orders, statusFilter, droneFilter, timeFilter]);

  // === Gán drone cho đơn hàng ===
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

  // === Đánh dấu đơn đã giao ===
  const handleMarkDelivered = async (orderId) => {
    try {
      const order = orders.find((o) => String(o.id) === String(orderId));
      if (!order) return;

      const droneId = order.droneId ? String(order.droneId) : null;

      await updateDoc(doc(db, "orders", order.id), {
        status: "Đã giao",
      });

      if (droneId) {
        await updateDoc(doc(db, "drones", droneId), {
          status: "Rảnh",
          currentOrderId: null,
          destination: null,
          restaurantId: null,
        });
      }

      alert(`✅ Đơn #${order.id} đã hoàn tất.`);
      await refreshData();
    } catch (err) {
      console.error("Lỗi mark delivered:", err);
      alert("❌ Lỗi khi đánh dấu đã giao.");
    }
  };

  const formatStatusBadge = (status) => {
    if (!status) return <span className="badge other">—</span>;
    const s = status.toLowerCase();
    if (s.includes("giao")) {
      if (s === "đang giao" || s.includes("delivering")) {
        return <span className="badge delivering">Đang giao</span>;
      }
      if (s === "đã giao" || s.includes("delivered")) {
        return <span className="badge done">Đã giao</span>;
      }
    }
    if (
      s === "confirmed" ||
      s.includes("xử lý") ||
      s.includes("processing") ||
      (s.includes("chờ") && s.includes("xử"))
    ) {
      return <span className="badge pending">Đang xử lý</span>;
    }
    return <span className="badge other">{status}</span>;
  };

  if (loading) return <p>⏳ Đang tải dữ liệu...</p>;
  // 🚁 AUTO MOVE DRONE TỪ NHÀ HÀNG → KHÁCH HÀNG (One-way) MỚI MỚI
  async function startDroneAutoMove(order, drone) {
    if (!order?.customer || !order?.restaurantLocation) {
      console.log("❌ Thiếu tọa độ nhà hàng hoặc khách hàng");
      return;
    }

    const start = {
      latitude: Number(order.restaurantLocation.latitude),
      longitude: Number(order.restaurantLocation.longitude),
    };

    const end = {
      latitude: Number(order.customer.latitude),
      longitude: Number(order.customer.longitude),
    };

    console.log("🏁 Start:", start);
    console.log("🎯 Destination:", end);

    const steps = 8; // chia làm 8 waypoint cho mượt
    const waypoints = [];

    for (let i = 1; i <= steps; i++) {
      waypoints.push({
        latitude: start.latitude + ((end.latitude - start.latitude) * i) / steps,
        longitude: start.longitude + ((end.longitude - start.longitude) * i) / steps,
      });
    }

    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];

      await updateDoc(doc(db, "drones", drone.id), {
        latitude: wp.latitude,
        longitude: wp.longitude,
        status: "Đang giao",
      });

      console.log(`📍 Drone moved to waypoint ${i + 1}/${steps}`, wp);

      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s mỗi bước
    }

    // ✅ Đến nơi
    console.log("✅ Drone đến nhà khách!");

    await updateDoc(doc(db, "orders", order.id), {
      status: "Đã đến nơi",
      statusCode: "arrived",
    });

    await updateDoc(doc(db, "drones", drone.id), {
      status: "Chờ khách nhận",
    });
  }

  return (
    <div className="restaurant-dashboard">
      <h2>📦 Quản lý Đơn Hàng</h2>

      {/* FILTER BAR */}
      <div className="filter-bar">
        {/* Trạng thái */}
        <div className="filter-item">
          <label>Trạng thái</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả</option>
            <option value="processing">Đang/Chờ xử lý</option>
            <option value="delivering">Đang giao</option>
            <option value="delivered">Đã giao</option>
            <option value="other">Chờ xác nhận</option>
          </select>
        </div>

        {/* Drone */}
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

        {/* Thời gian */}
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

        {/* Nút xóa lọc nhanh (tuỳ chọn) */}
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

      <div className="table-meta">
        <span>Hiển thị: <b>{filteredOrders.length}</b> / {orders.length} đơn</span>

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
            <th>Drone giao hàng</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((order) => {
            const oStatus = order.status || "";
            const assignedDrone = order.droneId ? findDroneById(order.droneId) : null;
            const createdAtMs = toMillis(order.createdAt);
            const createdAtTxt = createdAtMs ? new Date(createdAtMs).toLocaleString() : "—";

            return (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>
                  <div className="cust-name">{order.customer?.name}</div>
                  <div className="small">{order.customer?.phone}</div>
                </td>
                <td>{order.customer?.address}</td>
                <td>{order.items?.[0]?.restaurant}</td>
                <td>{createdAtTxt}</td>
                <td>{formatStatusBadge(oStatus)}</td>

                <td>
                  {oStatus === "Đã giao" ? (
                    <div>{assignedDrone ? <strong>{assignedDrone.name}</strong> : <span>—</span>}</div>
                  ) : oStatus === "Đang giao" ? (
                    <div>
                      {assignedDrone ? (
                        <span>Đang giao bằng <strong>{assignedDrone.name}</strong></span>
                      ) : (
                        <span>Đang giao</span>
                      )}
                    </div>
                  ) : (
                    <select
                      value={selectedDrone[order.id] || ""}
                      onChange={(e) =>
                        setSelectedDrone((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                    >
                      <option value="">-- Chọn drone --</option>
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
                    <button className="btn done" onClick={() => handleMarkDelivered(order.id)}>
                      Đánh dấu đã giao
                    </button>
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
    </div>
  );
}
