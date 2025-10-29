import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import "./RestaurantProducts.css";

export default function RestaurantProducts() {
  const [products, setProducts] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // 📦 Lấy danh sách sản phẩm từ Firestore
  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(data);
    } catch (err) {
      console.error("❌ Lỗi lấy sản phẩm:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🏪 Lấy danh sách nhà hàng
  const fetchRestaurants = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "restaurants"));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRestaurants(data);
    } catch (err) {
      console.error("❌ Lỗi lấy nhà hàng:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchRestaurants();
  }, []);

  // 🗑️ Xóa sản phẩm
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này không?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      setProducts((prev) => prev.filter((p) => p.id !== id));
      alert("🗑️ Đã xóa sản phẩm!");
    } catch (err) {
      console.error("❌ Lỗi xóa:", err);
    }
  };

  // 💾 Lưu (thêm hoặc sửa)
  const handleSave = async (e) => {
    e.preventDefault();

    const productData = {
      name: e.target.name.value,
      price: Number(e.target.price.value),
      img: e.target.img.value,
      category: e.target.category.value,
      description: e.target.description.value,
      restaurantId: e.target.restaurantId.value,
    };

    try {
      if (editingProduct) {
        // 🔹 Cập nhật sản phẩm
        const productRef = doc(db, "products", editingProduct.id);
        await updateDoc(productRef, productData);
      } else {
        // 🔹 Thêm sản phẩm mới
        await addDoc(collection(db, "products"), productData);
      }

      setShowForm(false);
      setEditingProduct(null);
      fetchProducts();
      alert("✅ Lưu sản phẩm thành công!");
    } catch (err) {
      console.error("❌ Lỗi lưu:", err);
    }
  };

  if (loading) return <p className="rsp-loading">⏳ Đang tải sản phẩm...</p>;

  // 🔍 Lấy tên nhà hàng
  const getRestaurantName = (id) => {
    const r = restaurants.find((res) => res.id === id);
    return r ? r.name : "Không xác định";
  };

  return (
    <div className="rsp-container">
      <div className="rsp-header">
        <h2>🍽️ Tất cả sản phẩm</h2>
        <button
          className="rsp-btn-add"
          onClick={() => {
            setEditingProduct(null);
            setShowForm(true);
          }}
        >
          ➕ Thêm sản phẩm
        </button>
      </div>

      {products.length === 0 ? (
        <p className="rsp-empty">Chưa có sản phẩm nào.</p>
      ) : (
        <table className="rsp-table">
          <thead>
            <tr>
              <th>Hình ảnh</th>
              <th>Tên sản phẩm</th>
              <th>Nhà hàng</th>
              <th>Danh mục</th>
              <th>Giá</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr
                key={p.id}
                className="rsp-row"
                onClick={() => setSelectedProduct(p)}
              >
                <td>
                  <img src={p.img} alt={p.name} className="rsp-img" />
                </td>
                <td>{p.name}</td>
                <td>{getRestaurantName(p.restaurantId)}</td>
                <td>{p.category}</td>
                <td>{p.price.toLocaleString()}₫</td>
                <td>
                  <button
                    className="rsp-btn-edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProduct(p);
                      setShowForm(true);
                    }}
                  >
                    ✏️ Sửa
                  </button>
                  <button
                    className="rsp-btn-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(p.id);
                    }}
                  >
                    ❌ Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 🧾 Form thêm/sửa */}
      {showForm && (
        <div className="rsp-modal">
          <div className="rsp-modal-content">
            <h3>{editingProduct ? "✏️ Sửa sản phẩm" : "➕ Thêm sản phẩm"}</h3>
            <form onSubmit={handleSave} className="rsp-form">
              <label>Tên sản phẩm</label>
              <input name="name" defaultValue={editingProduct?.name || ""} required />

              <label>Nhà hàng</label>
              <select
                name="restaurantId"
                defaultValue={editingProduct?.restaurantId || ""}
                required
              >
                <option value="">-- Chọn nhà hàng --</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              <label>Danh mục</label>
              <input name="category" defaultValue={editingProduct?.category || ""} required />

              <label>Giá</label>
              <input
                type="number"
                name="price"
                defaultValue={editingProduct?.price || ""}
                required
              />

              <label>Hình ảnh (URL)</label>
              <input name="img" defaultValue={editingProduct?.img || ""} />

              <label>Mô tả</label>
              <textarea name="description" defaultValue={editingProduct?.description || ""} />

              <div className="rsp-form-actions">
                <button type="submit" className="rsp-btn-save">💾 Lưu</button>
                <button
                  type="button"
                  className="rsp-btn-cancel"
                  onClick={() => setShowForm(false)}
                >
                  ❌ Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🧠 Modal xem chi tiết */}
      {selectedProduct && (
        <div className="rsp-modal" onClick={() => setSelectedProduct(null)}>
          <div
            className="rsp-modal-content rsp-modal-detail"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="rsp-close" onClick={() => setSelectedProduct(null)}>
              ✖
            </button>
            <img src={selectedProduct.img} alt={selectedProduct.name} className="rsp-modal-img" />
            <h3>{selectedProduct.name}</h3>
            <p><strong>🏪 Nhà hàng:</strong> {getRestaurantName(selectedProduct.restaurantId)}</p>
            <p><strong>📦 Danh mục:</strong> {selectedProduct.category}</p>
            <p><strong>💰 Giá:</strong> {selectedProduct.price.toLocaleString()}₫</p>
            <p><strong>📜 Mô tả:</strong> {selectedProduct.description || "Không có mô tả."}</p>
          </div>
        </div>
      )}
    </div>
  );
}
