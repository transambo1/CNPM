import React from "react";

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
        </div>
    );
}

export default Product;