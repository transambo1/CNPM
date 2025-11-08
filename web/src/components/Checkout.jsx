import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, addDoc, doc, getDoc, serverTimestamp, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Checkout.css"; // Import file CSS

export default function Checkout({ cart, setCart }) {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useAuth();
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
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newAddressLabel, setNewAddressLabel] = useState("");
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Load thông tin user (giữ nguyên)
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

  useEffect(() => {
    const loadAddresses = async () => {
      if (!currentUser?.uid) {
        setSavedAddresses([]);
        setSelectedAddressId(null);
        return;
      }

      setLoadingAddresses(true);
      setAddressError("");
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (!snap.exists()) {
          setSavedAddresses([]);
          setSelectedAddressId(null);
          return;
        }

        const data = snap.data();
        const addressesFromDb = Array.isArray(data.addresses) ? data.addresses : [];
        const normalizedMap = new Map();

        if (data.address && addressesFromDb.length === 0) {
          normalizedMap.set("legacy-address", {
            id: "legacy-address",
            label: "Địa chỉ mặc định",
            value: data.address,
            isDefault: true,
          });
        }

        addressesFromDb.forEach((addr, index) => {
          if (!addr || !addr.value) return;
          const id = addr.id || `saved-${index}`;
          normalizedMap.set(id, {
            id,
            label: addr.label || `Địa chỉ ${index + 1}`,
            value: addr.value,
            isDefault: Boolean(addr.isDefault),
          });
        });

        const normalized = Array.from(normalizedMap.values());
        const preferred =
          normalized.find((addr) => addr.isDefault) ||
          normalized[0] ||
          null;

        setSavedAddresses(normalized);

        if (preferred) {
          setSelectedAddressId(preferred.id);
          setForm((prev) => ({ ...prev, address: preferred.value }));
        }
      } catch (err) {
        console.error("Lỗi tải danh sách địa chỉ:", err);
        setAddressError("Không thể tải địa chỉ đã lưu.");
        setSavedAddresses([]);
        setSelectedAddressId(null);
      } finally {
        setLoadingAddresses(false);
      }
    };

    loadAddresses();
  }, [currentUser?.uid]);

  // Lấy thông tin nhà hàng (giữ nguyên)
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
    if (name === "address") {
      setSelectedAddressId(null);
    }
  };

  const handleSelectAddress = (addressId) => {
    setSelectedAddressId(addressId);
    const found = savedAddresses.find((addr) => addr.id === addressId);
    if (found) {
      setForm((prev) => ({ ...prev, address: found.value }));
    }
    setIsAddingAddress(false);
    setAddressError("");
  };

  const handleAddNewAddress = async () => {
    const trimmedValue = newAddress.trim();
    if (!trimmedValue) {
      setAddressError("Vui lòng nhập địa chỉ mới.");
      return;
    }

    if (!currentUser?.uid) {
      alert("⚠️ Vui lòng đăng nhập lại để lưu địa chỉ mới.");
      return;
    }

    const label = newAddressLabel.trim() || `Địa chỉ ${savedAddresses.length + 1}`;
    const generatedId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `addr-${Date.now()}`;

    const addressObj = {
      id: generatedId,
      label,
      value: trimmedValue,
      isDefault: savedAddresses.length === 0,
    };

    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        addresses: arrayUnion(addressObj),
        address: trimmedValue,
      });

      const updatedAddresses = [...savedAddresses, addressObj];
      setSavedAddresses(updatedAddresses);
      setSelectedAddressId(addressObj.id);
      setForm((prev) => ({ ...prev, address: trimmedValue }));
      setNewAddress("");
      setNewAddressLabel("");
      setIsAddingAddress(false);
      setAddressError("");

      if (typeof setCurrentUser === "function") {
        setCurrentUser({ ...currentUser, addresses: updatedAddresses, address: trimmedValue });
      }
    } catch (err) {
      console.error("Lỗi lưu địa chỉ mới:", err);
      setAddressError("Không thể lưu địa chỉ mới. Vui lòng thử lại.");
    }
  };

  const handleCancelNewAddress = () => {
    setIsAddingAddress(false);
    setNewAddress("");
    setNewAddressLabel("");
    setAddressError("");
  };

  // ✅ SỬA LỖI 1: Cải thiện hàm lấy tọa độ
  const getCoordinatesForAddress = async (address) => {
    try {
      // Thêm "Ho Chi Minh City" để tăng độ chính xác
      const query = `${address}, Ho Chi Minh City, Vietnam`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=vn`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });

      if (!res.ok) throw new Error(`Lỗi Geocoding: ${res.statusText}`);

      const data = await res.json();
      if (data.length > 0) {
        // Tìm thấy, trả về tọa độ
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }

      console.warn("API Nominatim không tìm thấy địa chỉ:", query);
      return null; // Không tìm thấy, trả về null
    } catch (err) {
      console.error("Lỗi Geocoding (catch):", err);
      return null; // Bị lỗi, trả về null
    }
  };

  // ✅ SỬA LỖI 2: Thêm bước kiểm tra tọa độ trước khi đặt hàng
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
      alert("⚠️ Không tải được thông tin nhà hàng. Vui lòng thử lại.");
      return;
    }

    const trimmedAddress = form.address.trim();
    if (!trimmedAddress) {
      alert("⚠️ Vui lòng chọn hoặc nhập địa chỉ giao hàng.");
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Lấy tọa độ
      const customerCoords = await getCoordinatesForAddress(trimmedAddress);

      // 2. *** BƯỚC KIỂM TRA QUAN TRỌNG NHẤT ***
      // Code cũ của bạn thiếu bước này
      if (!customerCoords) {
        // Nếu tọa độ là null, báo lỗi và DỪNG LẠI
        alert("❌ Lỗi địa chỉ!\nKhông thể tìm thấy tọa độ cho địa chỉ của bạn. Vui lòng nhập địa chỉ cụ thể hơn (ví dụ: '28 An Dương Vương, Phường 9, Quận 5').");
        setIsProcessing(false); // Dừng xử lý
        return; // Dừng hàm, KHÔNG cho đặt hàng
      }

      // 3. Nếu tọa độ OK, mới tiếp tục tạo đơn hàng
      const newOrder = {
        userId: currentUser.uid || "unknown_user",
        restaurantId,
        restaurantName: restaurantDetails.name,
        customer: {
          name: `${form.lastName} ${form.firstName}`.trim(),
          phone: form.phone,
          email: form.email,
          address: trimmedAddress,
          latitude: customerCoords.lat, // Chắc chắn có dữ liệu
          longitude: customerCoords.lng // Chắc chắn có dữ liệu
        },
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          restaurantId: item.restaurantId
        })),
        total,
        status: "Chờ xử lý",
        createdAt: serverTimestamp(),
        droneId: null
      };

      const docRef = await addDoc(collection(db, "orders"), newOrder);

      setCart([]);
      if (currentUser && currentUser.username) {
        localStorage.removeItem(`cart_${currentUser.username}`);
      }
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

  // Phần JSX (Đã sửa bố cục)
  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <Link to="/cart"><button className="checkout-back-btn">⬅ Quay lại giỏ hàng</button></Link>
        <h2>🔒 THÔNG TIN ĐẶT HÀNG</h2>
      </div>

      <div className="checkout-container">

        {/* ===== CỘT TRÁI (INFO) ===== */}
        <div className="checkout-info">
          <div className="checkout-info-block">
            <h3>ĐƯỢC GIAO TỪ:</h3>
            <p className="store-name">{restaurantDetails ? restaurantDetails.name : "Đang tải..."}</p>
            <p className="store-address">{restaurantDetails ? restaurantDetails.address : "..."}</p>
          </div>

          <div className="checkout-info-block">
            <h3>GIAO ĐẾN:</h3>
            {loadingAddresses ? (
              <p className="address-loading">⏳ Đang tải địa chỉ đã lưu...</p>
            ) : (
              <>
                {savedAddresses.length > 0 ? (
                  <div className="address-book">
                    {savedAddresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`address-item ${selectedAddressId === addr.id ? "active" : ""}`}
                      >
                        <input
                          type="radio"
                          name="savedAddress"
                          value={addr.id}
                          checked={selectedAddressId === addr.id}
                          onChange={() => handleSelectAddress(addr.id)}
                        />
                        <div className="address-item-content">
                          <span className="address-item-label">{addr.label}</span>
                          <span className="address-item-value">{addr.value}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="address-empty">
                    Bạn chưa lưu địa chỉ nào. Hãy thêm địa chỉ mới bên dưới để sử dụng nhanh.
                  </p>
                )}

                {addressError && <p className="address-error">{addressError}</p>}

                {isAddingAddress ? (
                  <div className="new-address-form">
                    <input
                      type="text"
                      placeholder="Tên gợi nhớ (ví dụ: Nhà, Công ty)"
                      value={newAddressLabel}
                      onChange={(e) => setNewAddressLabel(e.target.value)}
                    />
                    <textarea
                      placeholder="Nhập địa chỉ mới chi tiết..."
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      rows={2}
                    />
                    <div className="new-address-actions">
                      <button type="button" onClick={handleAddNewAddress}>
                        Lưu địa chỉ
                      </button>
                      <button type="button" className="secondary" onClick={handleCancelNewAddress}>
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="add-address-btn"
                    onClick={() => {
                      setIsAddingAddress(true);
                      setAddressError("");
                    }}
                  >
                    + Thêm địa chỉ mới
                  </button>
                )}
              </>
            )}

            <label className="address-input-label" htmlFor="address-input">
              Địa chỉ giao hàng chi tiết
            </label>
            <input
              id="address-input"
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Nhập địa chỉ giao hàng chi tiết..."
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

        {/* ===== CỘT PHẢI (SUMMARY + FORM) ===== */}
        <aside className="checkout-summary">
          {/* 1. TÓM TẮT ĐƠN HÀNG */}
          <div className="summary-card">
            <h3>TÓM TẮT ĐƠN HÀNG:</h3>
            <ul>
              {cart.map(item => (
                <li key={item.id} className="summary-item">
                  <span>{item.quantity} x {item.name}</span>
                  <span>{(item.price * item.quantity).toLocaleString()}₫</span>

                </li>
              ))}
            </ul>
            <div className="summary-line">
              <span>Tổng đơn hàng</span>
              <strong>{total.toLocaleString()}₫</strong>
            </div>
            <div className="summary-line total">
              <span>Tổng thanh toán</span>
              <strong>{total.toLocaleString()}₫</strong>
            </div>
          </div>

          {/* 2. KHỐI THÔNG TIN KHÁCH HÀNG */}
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
                  <input type="text" name="firstName" value={form.firstName} onChange={handleChange} placeHolder="faafaf" required />

                </div>
              </div>
              <div className="form-group">
                <label>Số điện thoại</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} required />
                Vui lòng nhập số điện thoại
                _Bắt buộc
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required />
                Vui lòng nhập email
              </div>

              <div className="payment-section">
                <h2>PHƯƠNG THỨC THANH TOÁN:</h2>
                <div className="payment-option">
                  <input type="radio" id="payment-bank" name="payment" value="bank" defaultChecked />
                  Lựa chọn thanh toán
                  <label htmlFor="payment-bank">Thanh toán khi nhận hàng (COD)</label>
                </div>
              </div>

              <button type="submit" className="checkout-btn-primary" disabled={isProcessing}>
                {isProcessing ? "Đang xử lý..." : "Xác nhận đặt hàng"}
              </button>

            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}