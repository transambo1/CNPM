import React, { useEffect, useState, useMemo } from "react";
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

  // Filter state
  const [restaurantFilter, setRestaurantFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [editingProduct, setEditingProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // 📦 Lấy danh sách sản phẩm
  const fetchProducts = async () => {
    try {
      const snap = await getDocs(collection(db, "products"));
      const data = snap.docs.map((doc) => ({
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
      const snap = await getDocs(collection(db, "restaurants"));
      const data = snap.docs.map((doc) => ({
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

  // 🧠 Unique category list từ sản phẩm
  const categories = useMemo(() => {
    const unique = [...new Set(products.map((p) => p.category))];
    return unique.filter(Boolean);
  }, [products]);

  // 🔍 Filter products realtime
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchRestaurant =
        restaurantFilter === "all" || p.restaurantId === restaurantFilter;
      const matchCategory =
        categoryFilter === "all" || p.category === categoryFilter;
      return matchRestaurant && matchCategory;
    });
  }, [products, restaurantFilter, categoryFilter]);

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

  // 💾 Lưu sản phẩm (thêm hoặc sửa)
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
        const ref = doc(db, "products", editingProduct.id);
        await updateDoc(ref, productData);
      } else {
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

     {/* 🔥 FILTER BAR */}
<div className="filter-bar">
  <div className="filter-item">
    <label>Nhà hàng</label>
    <select value={restaurantFilter} onChange={(e) => setRestaurantFilter(e.target.value)}>
      <option value="all">Tất cả</option>
      {restaurants.map((r) => (
        <option key={r.id} value={r.id}>{r.name}</option>
      ))}
    </select>
  </div>

  <div className="filter-item">
    <label>Danh mục</label>
    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
      <option value="all">Tất cả</option>
      {categories.map((c, i) => (
        <option key={i} value={c}>{c}</option>
      ))}
    </select>
  </div>

  <button
    className="btn reset"
    onClick={() => {
      setRestaurantFilter("all");
      setCategoryFilter("all");
    }}
  >
    Xóa lọc
  </button>
</div>


      <div className="table-meta">
        <span>Hiển thị: <b>{filteredProducts.length}</b> / {products.length} sản phẩm</span>
      </div>

      {filteredProducts.length === 0 ? (
        <p className="rsp-empty">Không có sản phẩm nào phù hợp.</p>
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
            {filteredProducts.map((p) => (
              <tr key={p.id} className="rsp-row" onClick={() => setSelectedProduct(p)}>
                <td><img src={p.img} alt={p.name} className="rsp-img" /></td>
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

      {/* Form + Modal giữ nguyên bên dưới */}
      {/* … … … */}
    </div>
  );
}
