import React, { useEffect, useState } from "react";
import "./RestaurantDashboard.css";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase"; // 🔥 import Firestore từ file firebase.js

export default function RestaurantDashboard() {
  const [orders, setOrders] = useState([]);
  const [drones, setDrones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrone, setSelectedDrone] = useState({});

  // === Lấy dữ liệu từ Firestore ===
  const fetchAll = async () => {
    try {
      const ordersSnap = await getDocs(collection(db, "orders"));
      const dronesSnap = await getDocs(collection(db, "drones"));

      const oData = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const dData = dronesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setOrders(oData);
      setDrones(dData);
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const refreshData = async () => {
    await fetchAll();
  };

  const findDroneById = (id) => drones.find((d) => String(d.id) === String(id));

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

      // cập nhật drone trong Firestore
      await updateDoc(doc(db, "drones", drone.id), {
        status: "Đang giao",
        currentOrderId: order.id,
        restaurantId: order.restaurantId || null,
        destination: order.customer?.address || null,
      });

      // cập nhật order trong Firestore
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

      // 1️⃣ Cập nhật order
      await updateDoc(doc(db, "orders", order.id), {
        status: "Đã giao",
      });

      // 2️⃣ Giải phóng drone
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
    if (status.toLowerCase().includes("giao")) {
      if (status === "Đang giao" || status.toLowerCase().includes("delivering")) {
        return <span className="badge delivering">Đang giao</span>;
      }
      if (status === "Đã giao" || status.toLowerCase().includes("delivered")) {
        return <span className="badge done">Đã giao</span>;
      }
    }
    if (
      status === "confirmed" ||
      status === "Confirmed" ||
      status.toLowerCase().includes("xử lý") ||
      status.toLowerCase().includes("processing")
    ) {
      return <span className="badge pending">Đang xử lý</span>;
    }
    return <span className="badge other">{status}</span>;
  };

  if (loading) return <p>⏳ Đang tải dữ liệu...</p>;

  return (
    <div className="restaurant-dashboard">
      <h2>📦 Quản lý Đơn Hàng</h2>

      <table className="orders-table">
        <thead>
          <tr>
            <th>Mã</th>
            <th>Khách</th>
            <th>Địa chỉ</th>
            <th>Nhà hàng</th>
            <th>Trạng thái</th>
            <th>Drone giao hàng</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const oStatus = order.status || "";
            const assignedDrone = order.droneId ? findDroneById(order.droneId) : null;

            return (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>
                  <div className="cust-name">{order.customer?.name}</div>
                  <div className="small">{order.customer?.phone}</div>
                </td>
                <td>{order.customer?.address}</td>
                <td>{order.items?.[0]?.restaurant}</td>
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
