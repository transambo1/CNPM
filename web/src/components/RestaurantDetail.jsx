import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase"; // đảm bảo bạn đã có file firebase.js cấu hình sẵn
import "./RestaurantDetail.css";

function RestaurantDetail({ onAdd }) {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 📦 Lấy dữ liệu từ Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Lấy danh sách nhà hàng
        const restSnap = await getDocs(collection(db, "restaurants"));
        const allRestaurants = restSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        const foundRestaurant = allRestaurants.find(r => r.id === id);
        if (!foundRestaurant) {
          setError("❌ Không tìm thấy nhà hàng này!");
          setLoading(false);
          return;
        }

        setRestaurant(foundRestaurant);

        // Lấy danh sách món ăn
        const prodSnap = await getDocs(collection(db, "products"));
        const allProducts = prodSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        const restaurantProducts = allProducts.filter(
          p => p.restaurantId === id
        );

        setProducts(restaurantProducts);
      } catch (err) {
        console.error("🔥 Lỗi khi tải dữ liệu:", err);
        setError("Không thể tải dữ liệu từ Firestore.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleAddToCart = product => {
    onAdd({
      ...product,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    }, 1);
  };

  if (loading) return <p className="loading">⏳ Đang tải dữ liệu...</p>;
  if (error) return <p className="loading">{error}</p>;

  return (
    <div className="restaurant-detail-page">
      {/* --- Phần Header --- */}
      <div className="restaurant-header">
        <img src={restaurant.image} alt={restaurant.name} />
        <div className="restaurant-info">
          <h1>{restaurant.name}</h1>
          <p className="restaurant-address">{restaurant.address}</p>
          <p className="restaurant-description">{restaurant.description}</p>
        </div>
      </div>

      {/* --- Phần Menu --- */}
      <h2 className="menu-title">🍽️ Danh sách món ăn</h2>

      <div className="product-grid">
        {products.length === 0 ? (
          <p className="no-products">
            😥 Nhà hàng hiện chưa có món ăn nào được cập nhật.
          </p>
        ) : (
          products.map(p => (
            <div key={p.id} className="product-card1">
              {p.discount > 0 && (
                <span className="discount-badge">-{p.discount}%</span>
              )}
              <Link
                to={`/product-detail/${p.id}`}
                className="product-link1"
              >
                <img src={p.img} alt={p.name} />
                <h3>{p.name}</h3>
              </Link>
              <p className="product-price1">
                {(p.price * (1 - (p.discount || 0) / 100)).toLocaleString()}₫
              </p>
              <button
                onClick={() => handleAddToCart(p)}
                style={{
                  backgroundColor: "#e44d26",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  padding: "8px 12px",
                  marginBottom: "12px",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                🛒 Thêm vào giỏ
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default RestaurantDetail;
