
import React from "react";

function Product({ product, onAdd }) {
    const { id, name, price, img } = product;

    return (
        <div className="product-card">
            <h3>{name}</h3>
            <img src={img} alt={name} width="150" />
            <p>Giá: {price.toLocaleString()} VND</p>



            <button onClick={() => onAdd(product)}>Thêm vào giỏ</button>
        </div>
    );
}

export default Product;
