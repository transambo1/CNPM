import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./ProductDetail.css";

function ProductDetail() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetch(`http://localhost:5005/products/${id}`)
            .then((res) => res.json())
            .then((data) => setProduct(data))
            .catch((err) => console.error("Lỗi khi fetch API:", err));
    }, [id]);

    if (!product) return <p>Đang tải...</p>;

    const handleCheckoutNow = () => {
        const tempCart = [{ ...product, quantity: 1 }];
        localStorage.setItem("checkoutCart", JSON.stringify(tempCart));
        navigate("/checkout");
    };

    return (
        <div className="product-detail-container">
            <Link to="/" className="back-link">⬅ Quay lại danh sách</Link>


            {/* THÔNG TIN SẢN PHẨM */}
            <section className="info-section">
                <h3>Thông tin sản phẩm</h3>
                <table className="info-table">
                    <tbody>
                        <tr>
                            <td>Mã từ nhà cung cấp</td>
                            <td>{product.id}</td>
                        </tr>
                        <tr>
                            <td>Tên chương trình</td>
                            <td>{product.name}</td>
                        </tr>
                        <tr>
                            <td>Tên gói bảo hiểm</td>
                            <td>{product.description}</td>
                        </tr>
                        <tr>
                            <td>Loại hình</td>
                            <td>{product.category}</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            {/* THÔNG TIN QUYỀN LỢI BỔ SUNG */}
            {product.bonus && product.bonus.length > 0 && (
                <section className="bonus-section">
                    <h3>Thông tin quyền lợi bổ sung</h3>
                    {product.bonus.map((item, index) => (
                        <div key={index} className="bonus-item">
                            <p><strong>{item.head}</strong></p>
                            <p><strong>Nội dung:</strong> </p>
                            <p>{item.info}</p>
                            <p>{item.infoPlus}</p>
                            <p><strong>Có thể đền bù lên tới:</strong> {product.claim.toLocaleString()} VND</p>
                        </div>
                    ))}
                </section>
            )}

            {/* GIÁ VÀ THANH TOÁN */}
            <section className="price-section">
                <h3>Giá gói bảo hiểm</h3>
                <p className="price">
                    {product.price.toLocaleString()} VND
                </p>
                <button onClick={handleCheckoutNow} className="buy-button">
                    🛒 Mua bảo hiểm ngay
                </button>
            </section>
        </div>
    );
}

export default ProductDetail;
