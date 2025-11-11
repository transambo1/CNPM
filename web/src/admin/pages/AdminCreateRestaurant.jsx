import React, { useState } from "react";
import { collection, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import "./AdminCreateRestaurant.css";

export default function AdminCreateRestaurant() {
  const [form, setForm] = useState({
    id: "",
    name: "",
    address: "",
    phone: "",
    image: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.id || !form.name || !form.phone || !form.password) {
      alert("⚠️ Vui lòng nhập đủ ID, Tên, SĐT và Mật khẩu!");
      return;
    }

    try {
      setLoading(true);

      const restRef = doc(db, "restaurants", form.id);
      const userRef = doc(db, "users", form.id);

      const [restSnap, userSnap] = await Promise.all([
        getDoc(restRef),
        getDoc(userRef),
      ]);

      if (restSnap.exists() || userSnap.exists()) {
        alert("❌ ID này đã tồn tại, vui lòng chọn ID khác!");
        setLoading(false);
        return;
      }

      // 🏪 Ghi vào collection "restaurants"
      await setDoc(restRef, {
        id: form.id,
        name: form.name,
        address: form.address || "",
        image: form.image || "",
        status: "active",
      });

      // 👤 Ghi vào collection "users"
      await setDoc(userRef, {
        uid: form.id,
        phonenumber: form.phone,
        password: form.password,
        role: "restaurant",
        restaurantId: form.id,
        restaurantName: form.name, // ✅ Lưu thêm tên nhà hàng vào user
        status: "active",
      });

      alert("✅ Tạo nhà hàng & tài khoản (SĐT) thành công!");
      setForm({
        id: "",
        name: "",
        address: "",
        phone: "",
        image: "",
        password: "",
      });
    } catch (err) {
      console.error("🔥 Lỗi khi tạo:", err);
      alert("❌ Có lỗi xảy ra, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="acr-container">
      <h2 className="acr-title">🏪 Tạo Nhà Hàng Mới</h2>

      <form className="acr-form" onSubmit={handleSubmit}>
        <div className="acr-grid">
          <label>
            ID Nhà hàng
            <input
              name="id"
              value={form.id}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Tên Nhà hàng
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Địa chỉ
            <input name="address" value={form.address} onChange={handleChange} />
          </label>
          <label>
            Ảnh/logo
            <input name="image" value={form.image} onChange={handleChange} />
          </label>
        </div>

        <hr className="acr-divider" />

        <h3 className="acr-subtitle">🔑 Thông tin đăng nhập</h3>
        <div className="acr-grid">
          <label>
            Số điện thoại (dùng để đăng nhập)
            <input
              name="phone"
              type="text"
              value={form.phone}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Mật khẩu
            <input
              name="password"
              type="text"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>
        </div>

        <button className="acr-btn" type="submit" disabled={loading}>
          {loading ? "Đang tạo..." : "Tạo Nhà hàng"}
        </button>
      </form>
    </div>
  );
}
