import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import "./OrderDetail.css";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [itemsWithImage, setItemsWithImage] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const ref = doc(db, "orders", id);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          alert("Không tìm thấy đơn hàng!");
          navigate("/order-history");
          return;
        }

        const data = snap.data();

        if (data.status === "Đang giao") {
          navigate(`/waiting/${id}`);
          return;
        }

        const orderData = {
          id: snap.id,
          ...data,
          date: data.createdAt?.toDate(),
        };

        setOrder(orderData);

        // ⭐ Fetch ảnh từng món
        const items = await Promise.all(
          orderData.items.map(async (item) => {
            const productRef = doc(db, "products", item.id);
            const productSnap = await getDoc(productRef);

            return {
              ...item,
              image: productSnap.exists() ? productSnap.data().img : null,
            };
          })
        );

        setItemsWithImage(items);
      } catch (err) {
        console.error("🔥 Lỗi load order:", err);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, []);

  if (loading) return <p>⏳ Đang tải...</p>;
  if (!order) return <p>Không tìm thấy đơn hàng.</p>;

  return (
    <div className="order-detail-page">
      <div className="order-detail-card">

        <h2 className="order-detail-title">Chi tiết đơn hàng</h2>

        {/* ================== INFO ================== */}
        <div className="order-info enhanced">
          <div className="order-info-left">
            <p><strong>Mã đơn:</strong> #{order.id}</p>
            <p><strong>Ngày đặt:</strong> {order.date?.toLocaleString("vi-VN")}</p>

            <p>
              <strong>Trạng thái:</strong>
              <span className={`status-tag ${order.status.replace(/\s+/g, "-").toLowerCase()}`}>
                {order.status}
              </span>
            </p>

            <p><strong>Nhà hàng:</strong> {order.restaurantName}</p>

            <p><strong>Giao đến:</strong> {order.customer?.address}</p>
          </div>
        </div>

        {/* ================== ITEMS ================== */}
        <h3 className="section-title">Sản phẩm đã mua</h3>

        <ul className="order-items-list highlight">
  {itemsWithImage.map((item, idx) => (
    <li
      className="order-item highlight-item"
      key={idx}
      onClick={() => navigate(`/product-detail/${item.id}`)}
      style={{ cursor: "pointer" }}
    >
      <img 
        src={item.image} 
        alt={item.name} 
        className="order-item-image"
      />

      <div className="item-left">
        <span className="item-qty">{item.quantity}x</span>
        <span className="item-name">{item.name}</span>
      </div>

      <span className="item-price">
        {(item.price * item.quantity).toLocaleString()}₫
      </span>
    </li>
  ))}
</ul>


        {/* ================== TOTAL ================== */}
        <div className="order-total-section">
          Tổng tiền: <strong>{order.total?.toLocaleString()}₫</strong>
        </div>

      </div>
    </div>
  );
}
