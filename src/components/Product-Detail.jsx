import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Product from "./Product";

function ProductDetail({ onAdd }) {
    const { id } = useParams(); // lấy id từ URL
    const [product, setProduct] = useState(null);

    useEffect(() => {
        fetch(`http://localhost:5002/products/${id}`)
            .then((res) => res.json())
            .then((data) => setProduct(data))
            .catch((err) => console.error("Lỗi khi fetch API:", err));
    }, [id]);

    if (!product) return <p>Đang tải...</p>;

    return (
        <div className="main-product">
            <h1>{product.name}</h1>
            <img src={product.img} alt={product.name} width="300" />
            <p>Giá: {product.price}₫</p>
            <button onClick={() => onAdd(product)}>Thêm vào giỏ</button>
            <Link to="/">⬅ Quay lại danh sách</Link>
        </div>
    );
}

export default ProductDetail;
