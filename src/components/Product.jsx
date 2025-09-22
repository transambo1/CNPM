
import React from "react";

function Product({ product, onAdd }) {
    const { id, name, price, img } = product;

    return (
        <div className="product-card">
            <img src={img} alt={name} width="340" />
            <h3>{name}</h3>
            <p>Giá bán: {price.toLocaleString()} VND</p>
            <button onClick={() => onAdd(product)}>Thêm vào giỏ</button>
        </div>
    );
}

export default Product;
