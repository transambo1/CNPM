import React from "react";
import { useParams, Link } from "react-router-dom";
import "./RestaurantDetail.css";

function RestaurantDetail({ products, restaurants, onAdd }) {
    const { id } = useParams();

    if (!restaurants || restaurants.length === 0) {
        return <p className="loading">⏳ Đang tải dữ liệu nhà hàng...</p>;
    }

    const restaurant = restaurants.find((r) => r.id === id);

    if (!restaurant) {
        return <p className="loading">❌ Không xác định được nhà hàng.</p>;
    }

    const restaurantProducts = products.filter(
        (p) => p.restaurantId === restaurant.id
    );

    const handleAddToCart = (product) => {
        onAdd({
            ...product,
            restaurantId: restaurant.id,
            restaurantName: restaurant.name
        });
    };


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
                {restaurantProducts.length === 0 ? (
                    <p className="no-products">
                        😥 Nhà hàng hiện chưa có món ăn nào được cập nhật.
                    </p>
                ) : (
                    restaurantProducts.map((p) => (
                        <div key={p.id} className="product-card1">
                            {p.discount > 0 && (
                                <span className="discount-badge">-{p.discount}%</span>
                            )}
                            <Link to={`/product-detail/${p.id}`} className="product-link1">
                                <img src={p.img} alt={p.name} />
                                <h3>{p.name}</h3>
                            </Link>
                            <p className="product-price1">
                                {(p.price * (1 - p.discount / 100)).toLocaleString()}₫
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
