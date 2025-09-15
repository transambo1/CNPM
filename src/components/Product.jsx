
import React from "react";

function Product({ product, onAdd }) {
    const { id, name, price } = product;

    return (
        <div className="product-card">
            <h3>{name}</h3>
            <p>Giá: {price.toLocaleString()} VND</p>
            <button onClick={() => onAdd(product)}>Thêm vào giỏ</button>
        </div>
    );
}

export default Product;
