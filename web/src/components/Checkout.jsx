// src/components/Checkout.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Checkout.css";

export default function Checkout({ cart, setCart }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const restaurantId = cart.length > 0 ? cart[0].restaurantId : null;

  const [restaurantDetails, setRestaurantDetails] = useState(null);
  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    phone: "",
    email: "",
    address: ""
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Load thông tin user
  useEffect(() => {
    if (currentUser) {
      setForm({
        lastName: currentUser.lastname || "",
        firstName: currentUser.firstname || "",
        phone: currentUser.phonenumber || "",
        email: currentUser.email || "",
        address: currentUser.address || ""
      });
    }
  }, [currentUser]);

  // Lấy thông tin nhà hàng từ Firestore
  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      if (!restaurantId) return;
      try {
        const docRef = doc(db, "restaurants", restaurantId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setRestaurantDetails(docSnap.data());
        else setRestaurantDetails(null);
      } catch (err) {
        console.error("Lỗi tải thông tin nhà hàng:", err);
      }
    };
    fetchRestaurantDetails();
  }, [restaurantId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // Lấy tọa độ từ địa chỉ
  const getCoordinatesForAddress = async (address) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=vn`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`Lỗi Geocoding: ${res.statusText}`);
      const data = await res.json();
      if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      return null;
    } catch (err) {
      console.error("Lỗi Geocoding:", err);
      return null;
    }
  };

  const handleCheckout = async () => {
    if (!currentUser) {
      alert("⚠️ Bạn cần đăng nhập để thanh toán!");
      navigate("/login", { state: { from: '/checkout' } });
      return;
    }
    if (cart.length === 0) {
      alert("🛒 Giỏ hàng của bạn đang trống!");
      navigate("/cart");
      return;
    }
    if (!restaurantDetails) {
      alert("⚠️ Không tải được thông tin nhà hàng.");
      return;
    }

    setIsProcessing(true);
    try {
      const customerCoords = await getCoordinatesForAddress(form.address);

      const newOrder = {
        // Dùng uid của currentUser để chắc chắn không undefined
        userId: currentUser.uid || "unknown_user",
        restaurantId,
        restaurantName: restaurantDetails.name,
        customer: {
          name: `${form.lastName} ${form.firstName}`.trim(),
          phone: form.phone,
          email: form.email,
          address: form.address,
          latitude: customerCoords?.lat || null,
          longitude: customerCoords?.lng || null
        },
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          restaurantId: item.restaurantId
        })),
        total,
        status: "Chờ xác nhận",
        createdAt: serverTimestamp(),
        droneId: null
      };

      const docRef = await addDoc(collection(db, "orders"), newOrder);

      setCart([]);
      localStorage.removeItem(`cart_${currentUser.username}`);
      alert(`✅ Đặt đơn hàng thành công!\nMã đơn hàng: ${docRef.id}`);
      navigate(`/waiting/${docRef.id}`);
    } catch (err) {
      console.error("❌ Lỗi khi lưu order:", err);
      alert("Có lỗi xảy ra khi đặt hàng, vui lòng thử lại!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isProcessing) return;
    handleCheckout();
  };

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <Link to="/cart"><button className="back-btn">⬅ Quay lại giỏ hàng</button></Link>
        <h2>🔒 THÔNG TIN ĐẶT HÀNG</h2>
      </div>

      <div className="checkout-container">
        <div className="checkout-info">
          <div className="info-block">
            <h3>ĐƯỢC GIAO TỪ:</h3>
            <p className="store-name">{restaurantDetails ? restaurantDetails.name : "Đang tải..."}</p>
            <p className="store-address">{restaurantDetails ? restaurantDetails.address : "..."}</p>
          </div>

          <div className="info-block">
            <h3>GIAO ĐẾN:</h3>
            <input type="text" name="address" value={form.address} onChange={handleChange} placeholder="Nhập địa chỉ giao hàng..." className="address-input"/>
            <iframe
              title="map"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(form.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              width="100%"
              height="300"
              style={{ border: 0, margin: "20px 0", borderRadius: "10px" }}
            />
          </div>

          <div className="info-block">
            <h2>THÔNG TIN KHÁCH HÀNG:</h2>
            <form onSubmit={handleSubmit}>
              <div><label>Họ</label><input type="text" name="lastName" value={form.lastName} onChange={handleChange} /></div>
              <div><label>Tên</label><input type="text" name="firstName" value={form.firstName} onChange={handleChange} required /></div>
              <div><label>Số điện thoại</label><input type="tel" name="phone" value={form.phone} onChange={handleChange} required /></div>
              <div><label>Email</label><input type="email" name="email" value={form.email} onChange={handleChange} required /></div>

              <div className="payment-section">
                <h2>PHƯƠNG THỨC THANH TOÁN:</h2>
                <label><input type="radio" name="payment" value="cod" defaultChecked /> Thanh toán khi nhận hàng (COD)</label>
                <label><input type="radio" name="payment" value="bank" /> Chuyển khoản ngân hàng</label>

                <button type="submit" className="btn-primary" disabled={isProcessing}>
                  {isProcessing ? "Đang xử lý..." : "Xác nhận đặt hàng"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <aside className="checkout-summary">
          <div className="summary-card">
            <h3>TÓM TẮT ĐƠN HÀNG:</h3>
            <ul>
              {cart.map(item => (
                <li key={item.id}>
                  <span>{item.quantity} x {item.name}</span>
                  <span>{(item.price * item.quantity).toLocaleString()}₫</span>
                </li>
              ))}
            </ul>
            <div className="line">
              <span>Tổng đơn hàng</span>
              <strong>{total.toLocaleString()}₫</strong>
            </div>
            <div className="line total">
              <span>Tổng thanh toán</span>
              <strong>{total.toLocaleString()}₫</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
