import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Checkout.css";

// ================================
//   HÀM REVERSE GEOCODE (lat→địa chỉ)
// ================================
const reverseGeocode = async (lat, lng) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;

    const res = await fetch(url, {
      headers: { "User-Agent": "CNPM-FastFood-App/1.0" },
    });

    const data = await res.json();
    return data.display_name || null;
  } catch (err) {
    console.error("Reverse geocode lỗi:", err);
    return null;
  }
};

// ================================
//   HÀM GEOCODING (địa chỉ → lat,lng)
// ================================
const getCoordinatesForAddress = async (address) => {
  if (!address || address.trim().length < 3) return null;

  const cleanAddress = address.trim() + ", Vietnam";

  // 1) NOMINATIM
  const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    cleanAddress
  )}&format=json&limit=1&countrycodes=vn`;

  try {
    const res = await fetch(nomUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CNPM-FastFood-App/1.0",
      },
    });

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (err) {
    console.warn("Nominatim lỗi:", err);
  }

  // 2) PHOTON fallback
  const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
    cleanAddress
  )}&limit=1`;

  try {
    const res = await fetch(photonUrl);
    const data = await res.json();
    if (data.features?.length > 0) {
      const coords = data.features[0].geometry.coordinates;
      return { lat: coords[1], lng: coords[0] };
    }
  } catch (err) {
    console.error("Photon lỗi:", err);
  }

  return null;
};

export default function Checkout({ cart, setCart }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const total = cart.reduce((s, item) => s + item.price * item.quantity, 0);

  const restaurantId = cart.length > 0 ? cart[0].restaurantId : null;

  const [restaurantDetails, setRestaurantDetails] = useState(null);

  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    phone: "",
    address: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("qr");
  const [isProcessing, setIsProcessing] = useState(false);

  const [showQR, setShowQR] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const [customerCoords, setCustomerCoords] = useState(null);

  // Map popup
  const [chooseLocationMode, setChooseLocationMode] = useState(false);
  const [mapCoords, setMapCoords] = useState({
    lat: 10.762622,
    lng: 106.660172,
  });

  // ================================
  //  AUTO-FILL USER INFO
  // ================================
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

  // ================================
  //  LẤY THÔNG TIN NHÀ HÀNG
  // ================================
  useEffect(() => {
    const load = async () => {
      if (!restaurantId) return;
      try {
        const ref = doc(db, "restaurants", restaurantId);
        const snap = await getDoc(ref);
        if (snap.exists()) setRestaurantDetails(snap.data());
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [restaurantId]);

  // ================================
  //  HANDLE ADDRESS INPUT
  // ================================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ================================
  //  BUTTON: LẤY GPS TỰ ĐỘNG
  // ================================
  const handleUseGPS = () => {
    if (!navigator.geolocation)
      return alert("Trình duyệt không hỗ trợ GPS.");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setCustomerCoords({ lat, lng });

        const addr = await reverseGeocode(lat, lng);

        setForm((f) => ({
          ...f,
          address: addr || `(${lat.toFixed(5)}, ${lng.toFixed(5)})`,
        }));
      },
      () => alert("Không thể lấy tọa độ GPS."),
      { enableHighAccuracy: true }
    );
  };

  // ================================
  //  CHỌN VỊ TRÍ TRÊN MAP (POPUP)
  // ================================
  const handleChooseLocation = async () => {
    setChooseLocationMode(true);
  };

  const handleConfirmMapLocation = async () => {
    setCustomerCoords(mapCoords);

    const addr = await reverseGeocode(mapCoords.lat, mapCoords.lng);

    setForm((f) => ({
      ...f,
      address:
        addr ||
        `(${mapCoords.lat.toFixed(5)}, ${mapCoords.lng.toFixed(5)})`,
    }));

    setChooseLocationMode(false);
  };

  // ================================
  //  CHECKOUT FLOW
  // ================================
  const handleCheckout = async () => {
    if (!currentUser) {
      alert("Bạn cần đăng nhập.");
      return navigate("/login");
    }

    if (!form.address.trim()) {
      return alert("Bạn chưa nhập địa chỉ.");
    }

    setIsProcessing(true);

    // Nếu chưa có tọa độ → geocode
    let coords = customerCoords;
    if (!coords) {
      coords = await getCoordinatesForAddress(form.address);
    }

    setIsProcessing(false);

    if (!coords) {
      alert("Không tìm thấy tọa độ từ địa chỉ.");
      return;
    }

    setCustomerCoords(coords);

    setShowQR(true);
  };

  // ================================
  //  TẠO ORDER
  // ================================
  const createOrder = async () => {
    if (!customerCoords) {
      return alert("Thiếu tọa độ khách hàng.");
    }

    setIsProcessing(true);

    try {
      const order = {
        userId: currentUser.uid,
        restaurantId,
        restaurantName: restaurantDetails?.name || "",
        customer: {
          name: `${form.lastName} ${form.firstName}`.trim(),
          phone: form.phone,
          address: form.address,
          latitude: customerCoords.lat,
          longitude: customerCoords.lng,
        },
        items: cart.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          restaurantId: i.restaurantId,
        })),
        total,
        paymentMethod,
        status: "Đã thanh toán",
        createdAt: serverTimestamp(),
        droneId: null,
      };

      const ref = await addDoc(collection(db, "orders"), order);

      setCart([]);
      if (currentUser.username)
        localStorage.removeItem(`cart_${currentUser.username}`);

      setShowQR(false);
      setShowSuccessPopup(true);

      setTimeout(() => navigate(`/waiting/${ref.id}`), 800);
    } catch (err) {
      console.error(err);
      alert("Lỗi tạo đơn hàng.");
    }

    setIsProcessing(false);
  };

  // ================================
  //  RENDER
  // ================================
  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <Link to="/cart">
          <button className="checkout-back-btn">⬅ Quay lại</button>
        </Link>
        <h2>🔒 THÔNG TIN ĐẶT HÀNG</h2>
      </div>

      <div className="checkout-container">
        {/* CỘT TRÁI */}
        <div className="checkout-info">
          <div className="checkout-info-block">
            <h3>Được giao từ:</h3>
            <p className="store-name">
              {restaurantDetails?.name || "Đang tải..."}
            </p>
            <p className="store-address">
              {restaurantDetails?.address || "..."}
            </p>
          </div>

          <div className="checkout-info-block">
            <h3>Giao đến:</h3>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              className="address-input"
              placeholder="Nhập địa chỉ..."
            />

            <div className="gps-buttons">
              <button className="gps-btn" onClick={handleUseGPS}>
                📍 Lấy GPS của tôi
              </button>
              <button className="gps-btn" onClick={handleChooseLocation}>
                🗺️ Chọn trên bản đồ
              </button>
            </div>

            <iframe
              title="map"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(
                form.address
              )}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              width="100%"
              height="300"
              style={{ border: 0, marginTop: 20 }}
            />
          </div>
        </div>

        {/* CỘT PHẢI */}
        <aside className="checkout-summary">
          <div className="summary-card">
            <h3>Tóm tắt đơn hàng:</h3>
            <ul>
              {cart.map((i) => (
                <li key={i.id} className="summary-item">
                  <span>
                    {i.quantity} × {i.name}
                  </span>
                  <span>{(i.price * i.quantity).toLocaleString()}₫</span>
                </li>
              ))}
            </ul>

            <div className="summary-line total">
              <span>Tổng thanh toán</span>
              <strong>{total.toLocaleString()}₫</strong>
            </div>
          </div>

          {/* Form khách hàng */}
          <div className="customer-info-card">
            <h2>Thông tin khách hàng:</h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCheckout();
              }}
              className="checkout-form"
            >
              <div className="form-group-inline">
                <div className="form-group">
                  <label>Họ</label>
                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Tên</label>
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Số điện thoại</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>

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
                  <label htmlFor="qr">Thanh toán mã QR</label>
                </div>
              </div>

              <button
                type="submit"
                className="checkout-btn-primary"
                disabled={isProcessing}
              >
                {isProcessing ? "Đang xử lý..." : "Xác nhận đặt hàng"}
              </button>
            </form>
          </div>
        </aside>
      </div>

      {/* POPUP MAP CHỌN VỊ TRÍ */}
      {chooseLocationMode && (
        <div className="map-popup">
          <div className="map-popup-content">
            <h2>Chọn vị trí giao hàng</h2>

            <iframe
              title="map-select"
              width="100%"
              height="400"
              style={{ borderRadius: 10 }}
              src={`https://maps.google.com/maps?q=${mapCoords.lat},${mapCoords.lng}&z=15&output=embed`}
            />

            <div className="gps-buttons" style={{ marginTop: 10 }}>
              <button
                onClick={async () => {
                  navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                      const { latitude, longitude } = pos.coords;
                      setMapCoords({ lat: latitude, lng: longitude });
                    },
                    () => alert("Không lấy được GPS.")
                  );
                }}
                className="gps-btn"
              >
                📍 Lấy GPS tại đây
              </button>

              <button
                className="gps-btn"
                onClick={handleConfirmMapLocation}
              >
                ✔ Xác nhận vị trí này
              </button>

              <button
                className="gps-btn"
                onClick={() => setChooseLocationMode(false)}
              >
                ✖ Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP QR */}
      {showQR && (
        <div className="qr-popup">
          <div className="qr-popup-content">
            <h2>Quét mã để thanh toán</h2>

            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PAYMENT"
              className="qr-image"
            />

            <p className="qr-note">
              Bạn cần thanh toán:{" "}
              <strong>{total.toLocaleString()}₫</strong>
            </p>

            <div className="qr-buttons">
              <button
                className="btn-cancel"
                onClick={() => setShowQR(false)}
              >
                Đóng
              </button>

              <button
                className="btn-confirm"
                onClick={createOrder}
                disabled={isProcessing}
              >
                {isProcessing ? "Đang xử lý..." : "Tôi đã thanh toán"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP SUCCESS */}
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
