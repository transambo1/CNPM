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
    address: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("cod"); // 💳 Thêm trạng thái thanh toán
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [customerCoords, setCustomerCoords] = useState(null);

  // ==== Auto-fill thông tin user ====
  useEffect(() => {
    if (currentUser) {
      setForm({
        lastName: currentUser.lastname || "",
        firstName: currentUser.firstname || "",
        phone: currentUser.phonenumber || "",
        address: currentUser.address || "",
      });
    }
  }, [currentUser]);

  // ==== Lấy thông tin nhà hàng ====
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

  // === Geocoding với Nominatim ===
  const getCoordinatesForAddress = async (address) => {
    try {
      const query = `${address}, Vietnam`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=vn`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`Geocoding error: ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
      return null;
    } catch (err) {
      console.error("Lỗi geocoding:", err);
      return null;
    }
  };

  // === Kiểm tra + xử lý thanh toán ===
  const handleCheckout = async () => {
    if (!currentUser) {
      alert("⚠️ Bạn cần đăng nhập để thanh toán!");
      navigate("/login", { state: { from: "/checkout" } });
      return;
    }
    if (cart.length === 0) {
      alert("🛒 Giỏ hàng của bạn đang trống!");
      navigate("/cart");
      return;
    }
    if (!restaurantDetails) {
      alert("⚠️ Không tải được thông tin nhà hàng!");
      return;
    }
    if (!form.address || form.address.trim().length < 5) {
      alert("📍 Vui lòng nhập địa chỉ giao hàng cụ thể hơn.");
      return;
    }

    setIsProcessing(true);
    const coords = await getCoordinatesForAddress(form.address);
    setIsProcessing(false);

    if (!coords) {
      alert("❌ Không thể tìm thấy tọa độ cho địa chỉ của bạn.");
      return;
    }

    setCustomerCoords(coords);

    // 🔥 Nếu là MoMo / Chuyển khoản → hiển thị QR
    if (paymentMethod !== "cod") {
      setShowQR(true);
    } else {
      await createOrder();
    }
  };

  // === Tạo đơn hàng sau khi thanh toán / COD ===
  const createOrder = async () => {
    if (!customerCoords) {
      alert("❗Thiếu tọa độ khách hàng. Vui lòng thử lại.");
      setShowQR(false);
      return;
    }

    setIsProcessing(true);
    try {
      const newOrder = {
        userId: currentUser?.uid || "unknown",
        restaurantId,
        restaurantName: restaurantDetails?.name || "",
        customer: {
          name: `${form.lastName} ${form.firstName}`.trim(),
          phone: form.phone,
          address: form.address,
          latitude: customerCoords.lat,
          longitude: customerCoords.lng,
        },
        items: cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          restaurantId: item.restaurantId,
        })),
        total,
        paymentMethod,
        status: paymentMethod === "cod" ? "Chờ xác nhận" : "Đã thanh toán",
        createdAt: serverTimestamp(),
        droneId: null,
      };

      const docRef = await addDoc(collection(db, "orders"), newOrder);
      setCart([]);
      if (currentUser?.username) {
        localStorage.removeItem(`cart_${currentUser.username}`);
      }

      setShowQR(false);
      setShowSuccessPopup(true);
      setTimeout(() => navigate(`/waiting/${docRef.id}`), 1000);
    } catch (err) {
      console.error("❌ Lỗi lưu order:", err);
      alert("Có lỗi xảy ra khi đặt hàng, vui lòng thử lại!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isProcessing) return;
    await handleCheckout();
  };

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <Link to="/cart">
          <button className="checkout-back-btn">⬅ Quay lại giỏ hàng</button>
        </Link>
        <h2>🔒 THÔNG TIN ĐẶT HÀNG</h2>
      </div>

      <div className="checkout-container">
        {/* ===== CỘT TRÁI ===== */}
        <div className="checkout-info">
          <div className="checkout-info-block">
            <h3>ĐƯỢC GIAO TỪ:</h3>
            <p className="store-name">{restaurantDetails ? restaurantDetails.name : "Đang tải..."}</p>
            <p className="store-address">{restaurantDetails ? restaurantDetails.address : "..."}</p>
          </div>

          <div className="checkout-info-block">
            <h3>GIAO ĐẾN:</h3>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Nhập địa chỉ giao hàng..."
              className="address-input"
            />
            <iframe
              title="map"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(form.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              width="100%"
              height="300"
              style={{ border: 0, margin: "20px 0", borderRadius: "10px" }}
            />
          </div>
        </div>

        {/* ===== CỘT PHẢI ===== */}
        <aside className="checkout-summary">
          <div className="summary-card">
            <h3>TÓM TẮT ĐƠN HÀNG:</h3>
            <ul>
              {cart.map((item) => (
                <li key={item.id} className="summary-item">
                  <span>{item.quantity} x {item.name}</span>
                  <span>{(item.price * item.quantity).toLocaleString()}₫</span>
                </li>
              ))}
            </ul>
            <div className="summary-line total">
              <span>Tổng thanh toán</span>
              <strong>{total.toLocaleString()}₫</strong>
            </div>
          </div>

          {/* 🧾 THÔNG TIN KHÁCH HÀNG */}
          <div className="customer-info-card">
            <h2>THÔNG TIN KHÁCH HÀNG:</h2>
            <form onSubmit={handleSubmit} className="checkout-form">
              <div className="form-group-inline">
                <div className="form-group">
                  <label>Họ</label>
                  <input type="text" name="lastName" value={form.lastName} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Tên</label>
                  <input type="text" name="firstName" value={form.firstName} onChange={handleChange} required />
                </div>
              </div>

              <div className="form-group">
                <label>Số điện thoại</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} required />
              </div>

              {/* 💳 CHỌN PHƯƠNG THỨC THANH TOÁN */}
            <div className="payment-section">
  <h2>Phương thức thanh toán</h2>
  <div className="payment-option">
    <input
      type="radio"
      id="qr"
      name="paymentMethod"
      value="qr"
      checked={paymentMethod === "qr"}
      onChange={(e) => setPaymentMethod(e.target.value)}
    />
    <label htmlFor="qr">
      Thanh toán bằng quét mã QR
    </label>
  </div>
</div>

              <button type="submit" className="checkout-btn-primary" disabled={isProcessing}>
                {isProcessing ? "Đang xử lý..." : "Xác nhận đặt hàng"}
              </button>
            </form>
          </div>
        </aside>
      </div>

      {/* ✅ POPUP QR */}
      {showQR && (
        <div className="qr-popup">
          <div className="qr-popup-content">
            <h2>Quét mã để thanh toán</h2>
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PAYMENT"
              alt="QR Code"
              className="qr-image"
            />
            <p className="qr-note">
              Bạn cần thanh toán: <strong>{total.toLocaleString()}₫</strong>
            </p>
            <div className="qr-buttons">
              <button className="btn-cancel" onClick={() => setShowQR(false)} disabled={isProcessing}>
                Đóng
              </button>
              <button className="btn-confirm" onClick={createOrder} disabled={isProcessing}>
                {isProcessing ? "Đang xử lý..." : "Tôi đã thanh toán"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎉 POPUP SUCCESS */}
      {showSuccessPopup && (
        <div className="success-popup">
          <div className="success-popup-content">
            <h2>🎉 Đặt hàng thành công!</h2>
          </div>
        </div>
      )}
    </div>
  );
}
