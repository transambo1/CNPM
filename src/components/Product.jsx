import React from "react";
import { Link } from "react-router-dom";

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
            <button className="add-to-cart-btn" onClick={() => onAdd(product)}>
                Thêm vào giỏ
            </button>
            <button className="add-to-cart-btn">
                <Link to={`/Product-Detail/${product.id}`}>Xem chi tiết</Link>
            </button>
        </div>
    );
}

export default Product;