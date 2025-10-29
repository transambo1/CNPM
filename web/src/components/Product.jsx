// src/components/Product.jsx
import React from "react";
import { Link } from "react-router-dom";
import './ProductCard.css';

function Product({ product, onAdd }) {
    if (!product) return null; // Tránh lỗi render khi dữ liệu chưa sẵn sàng

    const {
        id,
        name = "Sản phẩm chưa đặt tên",
        price = 0,
        img = "https://via.placeholder.com/150",
        restaurant = "Không rõ nhà hàng",
    } = product;

    // Kiểm tra kiểu price để hiển thị chính xác
    const displayPrice =
        typeof price === "number"
            ? price.toLocaleString("vi-VN")
            : Number(price || 0).toLocaleString("vi-VN");

    return (
        <div className="product-card">
            <Link to={`/product-detail/${id}`} className="product-link">
                <img src={img} alt={name} loading="lazy" />
                <div className="product-info">
                    <h3>{name}</h3>
                    <p>{displayPrice} ₫</p>
                    <p className="restaurant-name">🏠 {restaurant}</p>
                </div>
            </Link>

            <div className="product-actions">
                <button
                    className="add-to-cart-btn"
                    onClick={() => onAdd(product)}
                >
                    🛒 Thêm vào giỏ
                </button>
            </div>
        </div>
    );
}

export default Product;
