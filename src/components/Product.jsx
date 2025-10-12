import React from "react";
import { Link } from "react-router-dom";
import './ProductCard.css';

function Product({ product, onAdd }) {
    const { id, name, price, img } = product;

    return (
        <div className="product-card">
            <img src={img} alt={name} />
            {/* Bọc thông tin sản phẩm vào một div */}
            <div className="product-info">
                <h3>{name}</h3>
                <p>{price.toLocaleString()} VND</p>
            </div>
           <div className="product-actions">
                <button className="add-to-cart-btn" onClick={() => onAdd(product)}>
                    Thêm vào giỏ
                </button>
                {/* Thêm nút "Xem chi tiết" */}
                <Link to={`/Product-Detail/${id}`} className="view-details-btn">
                    Xem chi tiết
                </Link>
            </div>
        </div>
    );
}

export default Product;