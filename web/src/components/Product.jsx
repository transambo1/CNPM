// src/components/Product.jsx
import React from "react";
import { Link } from "react-router-dom";
import './ProductCard.css'; // Đảm bảo đã import CSS

function Product({ product, onAdd }) {
    const { id, name, price, img, restaurant } = product;

    return (
        <div className="product-card">
            {/* 1. Bọc ảnh và khối thông tin trong một thẻ Link */}
            <Link to={`/product-detail/${id}`} className="product-link">
                <img src={img} alt={name} />
                <div className="product-info">
                    <h3>{name}</h3>
                    <p>{price.toLocaleString()} VND</p>
                    <h3>Nhà hàng: {restaurant}</h3>
                </div>
            </Link>

            {/* Khối hành động chỉ còn lại nút "Thêm vào giỏ" */}
            <div className="product-actions">
                <button className="add-to-cart-btn" onClick={() => onAdd(product)}>
                    Thêm vào giỏ
                </button>
                {/* 2. Đã xóa nút "Xem chi tiết" ở đây */}
            </div>
        </div>
    );
}

export default Product;