import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import './ProductDetail.css'; // <-- 1. Import file CSS

function ProductDetail({ onAdd }) {
    const { id } = useParams();
    const [product, setProduct] = useState(null);

    useEffect(() => {
        fetch(`http://localhost:5002/products/${id}`)
            .then((res) => res.json())
            .then((data) => setProduct(data))
            .catch((err) => console.error("Lỗi khi fetch API:", err));
    }, [id]);

    if (!product) {
        return <p className="loading-message">Đang tải...</p>;
    }

    return (
        <div className="product-detail-page">
            <div className="product-detail-container">
                <div className="product-detail-image">
                    <img src={product.img} alt={product.name} />
                </div>
                <div className="product-detail-info">
                    <h3>{product.name}</h3>
                    <p className="product-detail-price">{product.price.toLocaleString()}₫</p>
                    
                    <button className="add-to-cart-btn-detail" onClick={() => onAdd(product)}>
                        Thêm vào giỏ
                    </button>

                    <div className="product-deal-progress">
                        <div className="progress-header">
                            <span>Almost sold out</span>
                            <span className="claimed">84% claimed</span>
                        </div>
                        <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: "84%" }}></div>
                        </div>
                    </div>

                    <Link to="/" className="back-link">⬅ Quay lại danh sách</Link>
                </div>
            </div>
        </div>
    );
}

export default ProductDetail;