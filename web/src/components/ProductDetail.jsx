import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "./ProductDetail.css";

function ProductDetail({ onAdd }) {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);

    // --- Lấy chi tiết sản phẩm ---
    useEffect(() => {
        fetch(`http://localhost:5002/products/${id}`)
            .then((res) => res.json())
            .then((data) => setProduct(data))
            .catch((err) => console.error("Lỗi khi fetch chi tiết sản phẩm:", err));
    }, [id]);

    // --- Lấy danh sách sản phẩm gợi ý ---
    useEffect(() => {
        if (product) {
            fetch("http://localhost:5002/products")
                .then((res) => res.json())
                .then((data) => {
                    const filtered = data
                        .filter((p) => p.category === product.category && p.id !== product.id)
                        .slice(0, 4); // chỉ lấy 4 sản phẩm gợi ý
                    setRelatedProducts(filtered);
                })
                .catch((err) => console.error("Lỗi khi fetch sản phẩm gợi ý:", err));
        }
    }, [product]);

    if (!product) {
        return <p className="loading-message">Đang tải...</p>;
    }

    const discountedPrice = product.discount
        ? Math.round(product.price * (1 - product.discount / 100))
        : product.price;

    return (
        <div className="product-detail-page">
            <div className="product-detail-container">
                {/* Ảnh sản phẩm */}
                <div className="product-detail-image">
                    <img src={product.img} alt={product.name} />
                </div>

                {/* Thông tin chi tiết */}
                <div className="product-detail-info">
                    <h2 className="product-name">{product.name}</h2>

                    <div className="rating-section">
                        <span className="stars">⭐ {product.rating || 4.5}</span>
                        <span className="reviews">
                            ({product.reviews || 100} đánh giá)
                        </span>
                    </div>

                    <div className="price-section">
                        {product.discount > 0 ? (
                            <>
                                <p className="price-discounted">
                                    {discountedPrice.toLocaleString()}₫
                                </p>
                                <p className="price-original">
                                    {product.price.toLocaleString()}₫
                                </p>
                                <span className="discount-badge">-{product.discount}%</span>
                            </>
                        ) : (
                            <p className="price-discounted">
                                {product.price.toLocaleString()}₫
                            </p>
                        )}
                    </div>

                    <p className="product-description">{product.description}</p>

                    {product.ingredients && (
                        <div className="ingredients">
                            <h4>Nguyên liệu:</h4>
                            <ul>
                                {product.ingredients.map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button
                        className="add-to-cart-btn-detail"
                        onClick={() => onAdd(product)}
                    >
                        🛒 Thêm vào giỏ hàng
                    </button>

                    <div className="product-deal-progress">
                        <div className="progress-header">
                            <span>Sắp cháy hàng!</span>
                            <span className="claimed">84% đã bán</span>
                        </div>
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar-fill"
                                style={{ width: "84%" }}
                            ></div>
                        </div>
                    </div>

                    <Link to="/" className="back-link">
                        ⬅ Quay lại danh sách sản phẩm
                    </Link>
                </div>
            </div>

            {/* ==================== GỢI Ý SẢN PHẨM ==================== */}
            <div className="related-products">
                <h3>Gợi ý cho bạn</h3>

                <div className="related-grid">
                    {relatedProducts.length > 0 ? (
                        relatedProducts.map((item) => (
                            <div key={item.id} className="related-item">
                                <img src={item.img} alt={item.name} />
                                <h4>{item.name}</h4>
                                <p>{item.price.toLocaleString()}₫</p>
                                <button
                                    className="add-btn"
                                    onClick={() => onAdd(item)}
                                >
                                    🛒 Thêm
                                </button>
                            </div>
                        ))
                    ) : (
                        <p>Không có sản phẩm tương tự.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProductDetail;
