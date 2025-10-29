// src/components/ProductDetail.jsx
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
// 1. Import các hàm Firestore cần thiết và instance 'db'
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore"; 
import { db } from '../firebase'; // Đảm bảo đường dẫn này đúng
import './ProductDetail.css'; // Import CSS

function ProductDetail({ onAdd }) {
    const { id } = useParams(); // Lấy ID sản phẩm từ URL
    const [product, setProduct] = useState(null);
    const [restaurant, setRestaurant] = useState(null); // Giữ lại state nhà hàng nếu cần
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loading, setLoading] = useState(true); // State theo dõi tải dữ liệu

    // --- Lấy chi tiết sản phẩm từ Firestore ---
    useEffect(() => {
        const fetchProductDetail = async () => {
            setLoading(true); // Bắt đầu tải
            try {
                // 2. Tạo tham chiếu đến document sản phẩm trong collection "products"
                const productDocRef = doc(db, "products", id); 
                // 3. Lấy dữ liệu của document đó
                const docSnap = await getDoc(productDocRef); 

                if (docSnap.exists()) {
                    // Nếu document tồn tại, gán dữ liệu vào state
                    const productData = { id: docSnap.id, ...docSnap.data() };
                    setProduct(productData);

                    // 3.1 (Thêm) Fetch thông tin nhà hàng nếu product có restaurantId
                    if (productData.restaurantId) {
                         try {
                            const restaurantDocRef = doc(db, "restaurants", productData.restaurantId);
                            const restaurantSnap = await getDoc(restaurantDocRef);
                            if (restaurantSnap.exists()) {
                                setRestaurant({ id: restaurantSnap.id, ...restaurantSnap.data() });
                            } else {
                                console.warn("Không tìm thấy nhà hàng với ID:", productData.restaurantId);
                            }
                         } catch (restaurantErr) {
                             console.error("Lỗi khi fetch nhà hàng:", restaurantErr);
                         }
                    }

                } else {
                    // Nếu không tìm thấy
                    console.log("Không tìm thấy sản phẩm với ID:", id);
                    setProduct(null); // Hoặc có thể điều hướng về trang 404
                }
            } catch (err) {
                console.error("Lỗi khi fetch chi tiết sản phẩm:", err);
            } finally {
                setLoading(false); // Kết thúc tải
            }
        };
        fetchProductDetail();
    }, [id]); // Chạy lại khi ID trên URL thay đổi

    // --- Lấy danh sách sản phẩm gợi ý từ Firestore ---
    useEffect(() => {
        const fetchRelatedProducts = async () => {
            // Chỉ chạy khi đã có thông tin sản phẩm chính (để biết category)
            if (product && product.category) {
                try {
                    const productsCol = collection(db, "products");
                    // 4. Tạo query: lấy products cùng category, khác ID hiện tại, giới hạn 4
                    const q = query(
                        productsCol,
                        where("category", "==", product.category), // Lọc theo category
                        where("__name__", "!=", id), // Loại trừ chính sản phẩm đang xem (__name__ là ID document)
                        limit(4) // Giới hạn số lượng
                    );
                    // 5. Thực thi query
                    const querySnapshot = await getDocs(q);
                    // 6. Xử lý kết quả
                    const relatedList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setRelatedProducts(relatedList);
                } catch (err) {
                    console.error("Lỗi khi fetch sản phẩm gợi ý:", err);
                }
            }
        };
        // Chạy khi có thông tin 'product' hoặc 'id' thay đổi
        fetchRelatedProducts(); 
    }, [product, id]); 

    // Hiển thị loading
    if (loading) {
        return <p className="loading-message">⏳ Đang tải sản phẩm...</p>;
    }
    // Hiển thị nếu không tìm thấy sản phẩm
    if (!product) {
        return <p className="loading-message">Không tìm thấy sản phẩm.</p>;
    }

    // Tính giá giảm (giữ nguyên)
    const discountedPrice = product.discount
        ? Math.round(product.price * (1 - product.discount / 100))
        : product.price;

    // JSX return (Đã cập nhật onAdd để gửi thông tin nhà hàng)
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
                                <p className="price-discounted">{discountedPrice.toLocaleString()}₫</p>
                                <p className="price-original">{product.price.toLocaleString()}₫</p>
                                <span className="discount-badge">-{product.discount}%</span>
                            </>
                        ) : (
                            <p className="price-discounted">{product.price.toLocaleString()}₫</p>
                        )}
                    </div>

                    {/* Hiển thị tên nhà hàng */}
                    {restaurant && (
                        <p className="restaurant-name">
                            Nhà hàng: <strong>{restaurant.name}</strong>
                        </p>
                    )}

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

                    {/* Cập nhật onAdd để gửi cả thông tin nhà hàng */}
                    <button
                        className="add-to-cart-btn-detail"
                        onClick={() =>
                            onAdd({
                                ...product,
                                restaurantId: product.restaurantId || null, // Đảm bảo gửi restaurantId
                                restaurantName: restaurant?.name || "Chưa xác định",
                            })
                        }
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

            {/* Sản phẩm gợi ý (Đã sửa Link và onClick cho nút Thêm) */}
            <div className="related-products">
                <h3>Gợi ý cho bạn</h3>
                <div className="related-grid">
                    {relatedProducts.length > 0 ? (
                        relatedProducts.map((item) => (
                            <Link 
                                key={item.id} 
                                to={`/product-detail/${item.id}`} 
                                className="related-item-link" 
                            >
                                <div className="related-item">
                                    <img src={item.img} alt={item.name} />
                                    <h4>{item.name}</h4>
                                    <p>{item.price.toLocaleString()}₫</p>
                                    <button
                                        className="add-btn"
                                        onClick={(e) => { 
                                            e.preventDefault(); 
                                            // Gửi cả thông tin nhà hàng của sản phẩm gợi ý (nếu cần)
                                            // Bạn cần fetch thông tin nhà hàng cho item này nếu muốn hiển thị tên
                                            onAdd({ 
                                                ...item,
                                                restaurantId: item.restaurantId || null,
                                                restaurantName: "N/A" // Cần fetch riêng nếu muốn tên nhà hàng ở đây
                                             });
                                        }}
                                    >
                                        🛒 Thêm
                                    </button>
                                </div>
                            </Link>
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