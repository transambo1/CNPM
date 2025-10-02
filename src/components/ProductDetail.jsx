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
        <div>
            <div className="main-product">
                <h3 className="text-lg font-semibold truncate">{product.name}</h3>
                <img src={product.img} alt={product.name} width="300" />
                <p>Giá: {product.price}₫</p>
                <button onClick={() => onAdd(product)}>Thêm vào giỏ</button>
                <Link to="/">⬅ Quay lại danh sách</Link>
            </div>

            <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                    <span>Almost sold out</span>
                    <span className="font-medium">84% claimed</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="bg-primary-500 h-full rounded-full" style={{ width: "84%" }}></div>
                </div>
            </div>


        </div>
    );
}

export default ProductDetail;
