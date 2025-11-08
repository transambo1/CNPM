import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase"; // đường dẫn tùy cấu trúc dự án

function SellerOrders() {
  const [orders, setOrders] = useState([]);

  // 📦 Lấy tất cả đơn hàng từ Firestore
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "orders"));
        const data = querySnapshot.docs.map((doc) => {
          const payload = doc.data();
          return {
            id: doc.id,
            ...payload,
            status: payload.status || "Chờ xử lý",
          };
        });
        setOrders(data);
      } catch (err) {
        console.error("❌ Lỗi lấy đơn hàng:", err);
      }
    };

    fetchOrders();
  }, []);

  // 🔄 Cập nhật trạng thái đơn hàng trong Firestore
  const updateStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: newStatus });

      // Cập nhật lại state local
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      alert(`✅ Đã cập nhật đơn #${orderId} thành "${newStatus}"`);
    } catch (err) {
      console.error("❌ Lỗi cập nhật trạng thái:", err);
    }
  };

  const formatOrderDate = (order) => {
    if (order?.createdAt?.toDate) {
      return order.createdAt.toDate().toLocaleString("vi-VN");
    }
    if (order?.createdAt?.seconds) {
      return new Date(order.createdAt.seconds * 1000).toLocaleString("vi-VN");
    }
    if (order?.date?.seconds) {
      return new Date(order.date.seconds * 1000).toLocaleString("vi-VN");
    }
    if (order?.date) {
      return new Date(order.date).toLocaleString("vi-VN");
    }
    return "—";
  };

  return (
    <div className="container">
      <h2>📦 Quản lý đơn hàng</h2>
      {orders.length === 0 ? (
        <p>Chưa có đơn hàng nào</p>
      ) : (
        <table border="1" cellPadding="10" style={{ width: "100%", marginTop: "20px" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Khách hàng</th>
              <th>Sản phẩm</th>
              <th>Tổng tiền</th>
              <th>Ngày đặt</th>
              <th>Địa chỉ</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{order.customer?.name || "Không rõ"}</td>
                <td>
                  {order.items?.map((item, i) => (
                    <div key={i}>
                      {item.name} x {item.quantity}
                    </div>
                  ))}
                </td>
                <td>{order.total?.toLocaleString()}₫</td>
                <td>{formatOrderDate(order)}</td>
                <td>{order.customer?.address}</td>
                <td>
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                  >
                    <option value="Chờ xử lý">Chờ xử lý</option>
                    <option value="Đang xử lý">Đang xử lý</option>
                    <option value="Đã xử lý">Đã xử lý</option>
                    <option value="Đang giao">Đang giao</option>
                    <option value="Đang giao bằng drone">Đang giao bằng drone</option>
                    <option value="Đã giao">Đã giao</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default SellerOrders;
