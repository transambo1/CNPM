import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Profile.css";

export default function Profile() {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (!currentUser?.uid) return;

      const userRef = doc(db, "users", currentUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        setUserData(snap.data());
      }
    };

    fetchUser();
  }, [currentUser]);

  const handleChange = (field, value) => {
    setUserData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);

    try {
      await updateDoc(doc(db, "users", currentUser.uid), userData);
      alert("Cập nhật thông tin thành công!");
    } catch (err) {
      console.error("Lỗi cập nhật:", err);
      alert("Cập nhật thất bại.");
    }

    setSaving(false);
  };

  if (!userData) return <p style={{ textAlign: "center" }}>⏳ Đang tải thông tin...</p>;

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h2>Thông tin cá nhân</h2>

        <label>Họ</label>
        <input
          type="text"
          value={userData.lastname}
          onChange={(e) => handleChange("lastname", e.target.value)}
        />

        <label>Tên</label>
        <input
          type="text"
          value={userData.firstname}
          onChange={(e) => handleChange("firstname", e.target.value)}
        />

        <label>Email</label>
        <input type="text" value={userData.email} disabled />

        <label>Số điện thoại</label>
        <input
          type="text"
          value={userData.phonenumber}
          onChange={(e) => handleChange("phonenumber", e.target.value)}
        />

        <label>Địa chỉ</label>
        <input
          type="text"
          value={userData.address}
          onChange={(e) => handleChange("address", e.target.value)}
        />

        <button className="save-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </div>
  );
}
