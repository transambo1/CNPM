// src/components/ProductDetail.jsx
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from '../firebase';
import './ProductDetail.css';

function ProductDetail({ onAdd }) {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [restaurant, setRestaurant] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProductDetail = async () => {
            setLoading(true);
            try {
                const productDocRef = doc(db, "products", id);
                const docSnap = await getDoc(productDocRef);

                if (docSnap.exists()) {
                    const productData = { id: docSnap.id, ...docSnap.data() };
                    setProduct(productData);

                    if (productData.restaurantId) {
                        const restaurantDocRef = doc(db, "restaurants", productData.restaurantId);
                        const restaurantSnap = await getDoc(restaurantDocRef);
                        if (restaurantSnap.exists()) {
                            setRestaurant({ id: restaurantSnap.id, ...restaurantSnap.data() });
                        }
                    }
                } else {
                    setProduct(null);
                }
            } catch (err) {
                console.error("Lỗi khi fetch chi tiết sản phẩm:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProductDetail();
    }, [id]);

    useEffect(() => {
        const fetchRelatedProducts = async () => {
            if (product && product.category) {
                try {
                    const productsCol = collection(db, "products");
                    const q = query(
                        productsCol,
                        where("category", "==", product.category),
                        where("__name__", "!=", id),
                        limit(4)
                    );
                    const querySnapshot = await getDocs(q);
                    const relatedList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setRelatedProducts(relatedList);
                } catch (err) {
                    console.error("Lỗi khi fetch sản phẩm gợi ý:", err);
                }
            }
        };
        fetchRelatedProducts();
    }, [product, id]);

    if (loading) return <p className="productDetail__loading">⏳ Đang tải sản phẩm...</p>;
    if (!product) return <p className="productDetail__loading">Không tìm thấy sản phẩm.</p>;

    const discountedPrice = product.discount
        ? Math.round(product.price * (1 - product.discount / 100))
        : product.price;

    return (
        <div className="productDetail">
            <div className="productDetail__container">
                <div className="productDetail__image">
                    <img src={product.img} alt={product.name} />
                </div>

                <div className="productDetail__info">
                    <h2 className="productDetail__name">{product.name}</h2>

                    <div className="productDetail__rating">
                        <span className="stars">⭐ {product.rating || 4.5}</span>
                        <span className="reviews">({product.reviews || 100} đánh giá)</span>
                    </div>

                    <div className="productDetail__price">
                        {product.discount > 0 ? (
                            <>
                                <p className="price--discounted">{discountedPrice.toLocaleString()}₫</p>
                                <p className="price--original">{product.price.toLocaleString()}₫</p>
                                <span className="price--badge">-{product.discount}%</span>
                            </>
                        ) : (
                            <p className="price--discounted">{product.price.toLocaleString()}₫</p>
                        )}
                    </div>

                    {restaurant && (
                        <p className="productDetail__restaurant">
                            Nhà hàng: <strong>{restaurant.name}</strong>
                        </p>
                    )}

                    <p className="productDetail__desc">{product.description}</p>

                    {product.ingredients && (
                        <div className="productDetail__ingredients">
                            <h4>Nguyên liệu:</h4>
                            <ul>
                                {product.ingredients.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button
                        className="productDetail__addBtn"
                        onClick={() =>
                            onAdd({
                                ...product,
                                restaurantId: product.restaurantId || null,
                                restaurantName: restaurant?.name || "Chưa xác định",
                            })
                        }
                    >
                        🛒 Thêm vào giỏ hàng
                    </button>

                    <div className="productDetail__progress">
                        <div className="progress__header">
                            <span>Sắp cháy hàng!</span>
                            <span className="progress__claimed">84% đã bán</span>
                        </div>
                        <div className="progress__bar">
                            <div className="progress__fill" style={{ width: "84%" }}></div>
                        </div>
                    </div>

                    <Link to="/" className="productDetail__backLink">
                        ⬅ Quay lại danh sách sản phẩm
                    </Link>
                </div>
            </div>

            <div className="relatedProducts">
                <h3>Gợi ý cho bạn</h3>
                <div className="relatedProducts__grid">
                    {relatedProducts.length > 0 ? (
                        relatedProducts.map((item) => (
                            <Link
                                key={item.id}
                                to={`/product-detail/${item.id}`}
                                className="relatedProducts__link"
                            >
                                <div className="relatedProducts__item">
                                    <img src={item.img} alt={item.name} />
                                    <h4>{item.name}</h4>
                                    <p>{item.price.toLocaleString()}₫</p>
                                    <button
                                        className="relatedProducts__addBtn"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onAdd({
                                                ...item,
                                                restaurantId: item.restaurantId || null,
                                                restaurantName: "N/A"
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
