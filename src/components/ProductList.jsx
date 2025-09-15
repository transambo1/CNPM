import React, { useEffect, useState } from "react";
import Product from "./Product";

function ProductList({ onAdd }) {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        fetch("http://localhost:5001/products")
            .then((res) => res.json())
            .then((data) => setProducts(data))
            .catch((err) => console.error("Lỗi khi fetch API:", err));
    }, []);

    return (
        <div>
            <h2>Danh sách sản phẩm</h2>
            <div className="product-list">
                {products.map((p) => (
                    <Product key={p.id} product={p} onAdd={onAdd} />
                ))}
            </div>
        </div>
    );
}

export default ProductList;
