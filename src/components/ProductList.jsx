import React, { useEffect, useState } from "react";
import Product from "./Product";
import { Link } from "react-router-dom";

function ProductList({ onAdd }) {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        fetch("http://localhost:5002/products")
            .then((res) => res.json())
            .then((data) => setProducts(data))
            .catch((err) => console.error("Lỗi khi fetch API:", err));
    }, []);

    return (
        <div className="main-home">
            <div className="main-title">
                <h1> Hôm nay ăn gì?</h1>
            </div>
            <div className="main-product">
                <div className="product-list">
                    {products.map((p) => (
                        <div key={p.id}>
                            <Product product={p} onAdd={onAdd} />
                            <Link to={`/Product-Detail/${p.id}`}>Xem chi tiết</Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ProductList;
