import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase"; // ✅ import Firestore từ file bạn đã setup
import "./DroneList.css";

export default function DroneList() {
  const [drones, setDrones] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Hàm lấy dữ liệu từ Firestore
  const fetchAll = async () => {
    try {
      const [dronesSnap, ordersSnap] = await Promise.all([
        getDocs(collection(db, "drones")),
        getDocs(collection(db, "orders")),
      ]);

      const dronesData = dronesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const ordersData = ordersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setDrones(dronesData);
      setOrders(ordersData);
    } catch (err) {
      console.error("❌ Lỗi lấy dữ liệu Firestore:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000); // cập nhật mỗi 5s
    return () => clearInterval(interval);
  }, []);

  // 🔹 Hiển thị trạng thái drone
  const renderStatus = (d) => {
    if (d.currentOrderId) return <span className="drone-status busy">🔵 Đang giao</span>;
    if (d.status === "Rảnh") return <span className="drone-status idle">🟢 Rảnh</span>;
    if (d.status === "Bảo trì") return <span className="drone-status maintenance">🔴 Bảo trì</span>;
    return <span className="drone-status">{d.status || "Không rõ"}</span>;
  };

  // 🔹 Tìm đơn hàng theo ID
  const findOrder = (orderId) => orders.find((o) => o.id === orderId);

  if (loading) return <p className="drone-loading">⏳ Đang tải danh sách drone...</p>;

  return (
    <div className="drone-container">
      <h2 className="drone-title">🚁 Danh sách Drone (Firestore)</h2>

      {drones.length === 0 ? (
        <p className="drone-empty">Không có drone.</p>
      ) : (
        <table className="drone-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên</th>
              <th>Trạng thái</th>
              <th>Pin</th>
              <th>Đang giao đơn</th>
              <th>Nhà hàng</th>
              <th>Đích đến</th>
            </tr>
          </thead>
          <tbody>
            {drones.map((d) => {
              const order = d.currentOrderId ? findOrder(d.currentOrderId) : null;
              return (
                <tr key={d.id}>
                  <td>#{d.id}</td>
                  <td>{d.name || "Không tên"}</td>
                  <td>{renderStatus(d)}</td>
                  <td>{d.battery ?? "?"}%</td>
                  <td>
                    {order ? (
                      <div>
                        <strong>#{order.id}</strong> — {order.customer?.name || "Khách không rõ"}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{d.restaurantName || "—"}</td>
                  <td>{d.destination || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
