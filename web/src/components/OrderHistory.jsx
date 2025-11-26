// src/components/OrderHistory.jsx
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./OrderHistory.css";

function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser?.uid) {
        console.log("⛔ Không có currentUser hoặc chưa đăng nhập");
        setLoading(false);
        return;
      }

      try {
        const ordersRef = collection(db, "orders");
        const q = query(
          ordersRef,
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );

        const snap = await getDocs(q);

        let userOrders = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().createdAt?.toDate(),
        }));

        // Ưu tiên hiển thị trạng thái
        userOrders = userOrders.sort((a, b) => {
          const priority = { "Chờ xác nhận": 1, "Đang giao": 2, "Đã giao": 3 };
          return priority[a.status] - priority[b.status];
        });

        setOrders(userOrders);
      } catch (err) {
        console.error("🔥 Lỗi lấy lịch sử đơn hàng:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser]);

  if (loading) return <p className="loading-message">⏳ Đang tải lịch sử đơn hàng...</p>;

  return (
    <div className="order-history-page">
      <h2>Lịch sử đơn hàng</h2>

      {orders.length === 0 ? (
        <p className="no-orders-message">Bạn chưa có đơn hàng nào.</p>
      ) : (
        <ul className="orders-list">
          {orders.map((order) => (
            <li
              key={order.id}
              className="order-card"
              onClick={() => {
                if (order.status === "Đang giao" || order.status === "Chờ xác nhận") {
                  navigate(`/waiting/${order.id}`);
                } else {
                  navigate(`/order/${order.id}`);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="order-header">
                <h3>Đơn hàng #{order.id.substring(0, 6)}...</h3>
                <span>
                  {order.date ? order.date.toLocaleDateString("vi-VN") : "N/A"}
                </span>
              </div>

              <div className="order-body">
                <ul className="order-items-list">
                  {order.items?.map((item, index) => (
                    <li
                      key={`${order.id}-${index}`}
                      className="order-item clickable-item"
                      onClick={(e) => {
                        e.stopPropagation();       // tránh trigger click vào order-card
                        navigate(`/product-detail/${item.id}`);
                      }}
                    >
                      <span>{item.quantity}x {item.name}</span>
                      <span>{(item.price * item.quantity).toLocaleString()}₫</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="order-footer">
                <div className="order-total">
                  <strong>
                    Tổng tiền:{" "}
                    {order?.total
                      ? order.total.toLocaleString() + "₫"
                      : "Đang cập nhật"}
                  </strong>
                </div>

                <div className="order-status">
                  Trạng thái:
                  <span
                    className={`status-tag ${order.status
                      ?.replace(/\s+/g, "-")
                      .toLowerCase()}`}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Nút theo dõi đơn */}
                {(order.status === "Chờ xác nhận" ||
                  order.status === "Đang giao") && (
                    <button
                      className="track-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/waiting/${order.id}`);
                      }}
                    >
                      Theo dõi đơn
                    </button>
                  )}

                {/* Nút xem chi tiết */}
                {order.status !== "Đang giao" &&
                  order.status !== "Chờ xác nhận" && (
                    <button
                      className="detail-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/order/${order.id}`);
                      }}
                    >
                      Xem chi tiết
                    </button>
                  )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default OrderHistory;
