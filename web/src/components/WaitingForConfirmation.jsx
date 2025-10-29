import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import "./WaitingForConfirmation.css";

export default function WaitingForConfirmation() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Lấy đơn hàng từ Firestore
  const fetchOrder = async () => {
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        setOrder({ id: orderSnap.id, ...orderSnap.data() });
      } else {
        setOrder(null);
      }
    } catch (error) {
      console.error("❌ Lỗi khi lấy đơn:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 3000); // cập nhật mỗi 3s
    return () => clearInterval(interval);
  }, [orderId]);

  // ✅ Xử lý khi khách hàng đã nhận hàng
  const handleReceived = async () => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: "Đã giao" });
      setOrder((prev) => ({ ...prev, status: "Đã giao" }));
      alert("✅ Bạn đã nhận hàng!");
    } catch (err) {
      console.error("❌ Lỗi cập nhật đơn:", err);
      alert("Không thể cập nhật trạng thái, thử lại!");
    }
  };

  if (loading) return <div className="loading">⏳ Đang tải đơn hàng...</div>;
  if (!order) return <p>Không tìm thấy đơn hàng #{orderId}</p>;

  return (
    <div className="waiting-page">
      <h2>🚀 Theo dõi đơn hàng #{order.id}</h2>

      {/* Thông tin khách hàng & đơn hàng */}
      <div className="order-info">
        <div><strong>Nhà hàng:</strong> {order.restaurantName}</div>
        <div><strong>Khách hàng:</strong> {order.customer?.name}</div>
        <div><strong>Điện thoại:</strong> {order.customer?.phone}</div>
        <div><strong>Email:</strong> {order.customer?.email}</div>
        <div><strong>Địa chỉ:</strong> {order.customer?.address}</div>
        <div>
          <strong>Ngày đặt:</strong>{" "}
          {order.date?.seconds
            ? new Date(order.date.seconds * 1000).toLocaleString()
            : order.date || "Không rõ"}
        </div>
      </div>

      {/* Danh sách món */}
      <div className="order-items">
        <h3>🛒 Chi tiết món đã đặt</h3>
        {order.items?.map((item, i) => (
          <div key={i} className="order-item">
            <img src={item.img} alt={item.name} />
            <div className="item-info">
              <p className="item-name">{item.name}</p>
              <p>Số lượng: {item.quantity}</p>
              <p>Đơn giá: {item.price.toLocaleString()}₫</p>
              <p>Tổng: {(item.price * item.quantity).toLocaleString()}₫</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tổng tiền */}
      <div className="order-total">
        <strong>Tổng cộng:</strong> {order.total?.toLocaleString()}₫
      </div>

      {/* Trạng thái đơn hàng */}
      <div className="order-status">
        {order.status === "Đang xử lý" && (
          <p className="status pending">🕒 Đang chờ nhà hàng xác nhận...</p>
        )}
        {order.status === "Đang giao bằng drone" && (
          <p className="status flying">🚁 Drone #{order.droneId} đang giao hàng!</p>
        )}
        {order.status === "Đã giao" && (
          <p className="status delivered">✅ Đơn hàng đã giao thành công!</p>
        )}
      </div>

      {/* Bản đồ + nút chỉ khi drone đang giao */}
      {order.status === "Đang giao bằng drone" && (
        <div className="drone-section">
          <div className="drone-map">
            <h3>📍 Theo dõi Drone</h3>
            <iframe
              title="Drone Map"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(
                order.customer?.address
              )}&z=14&output=embed`}
            ></iframe>
          </div>
          <button className="btn-received" onClick={handleReceived}>
            ✅ Đã nhận hàng
          </button>
        </div>
      )}
    </div>
  );
}
