import React, { useEffect, useState } from "react";
import "./ManageProducts.css";

function ManageProducts() {
    const [products, setProducts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [newProduct, setNewProduct] = useState({
        name: "",
        category: "",
        price: "",
        description: "",
        claim: "",
        img: "",
        bonusHead: "",
        bonusInfo: "",
        bonusInfoPlus: ""
    });

    const categories = [
        "Bảo hiểm Cá nhân",
        "Bảo hiểm Y tế",
        "Bảo hiểm Sức khỏe",
        "Bảo hiểm Công ty",
        "Bảo hiểm Du lịch"
    ];

    // --- Lấy danh sách sản phẩm ---
    useEffect(() => {
        fetch("http://localhost:5005/products")
            .then((res) => res.json())
            .then((data) => setProducts(data))
            .catch((err) => console.error("Lỗi tải dữ liệu:", err));
    }, []);

    // --- Xử lý thêm sản phẩm ---
    const handleAdd = () => {
        if (!newProduct.name || !newProduct.category || !newProduct.price) {
            alert("Vui lòng nhập đầy đủ thông tin!");
            return;
        }

        const formattedProduct = {
            name: newProduct.name,
            category: newProduct.category,
            price: Number(newProduct.price),
            claim: Number(newProduct.claim),
            description: newProduct.description,
            img: newProduct.img,
            bonus: [
                {
                    head: newProduct.bonusHead,
                    info: newProduct.bonusInfo,
                    infoPlus: newProduct.bonusInfoPlus
                }
            ]
        };

        fetch("http://localhost:5005/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formattedProduct),
        })
            .then((res) => res.json())
            .then((data) => {
                setProducts([...products, data]);
                setNewProduct({
                    name: "",
                    category: "",
                    price: "",
                    claim: "",
                    description: "",
                    img: "",
                    bonusHead: "",
                    bonusInfo: "",
                    bonusInfoPlus: ""
                });
                setShowForm(false);
                alert("✅ Thêm sản phẩm thành công!");
            })
            .catch((err) => console.error("Lỗi thêm:", err));
    };

    // --- Xử lý xóa ---
    const handleDelete = (id) => {
        if (window.confirm("Bạn có chắc muốn xóa sản phẩm này không?")) {
            fetch(`http://localhost:5005/products/${id}`, { method: "DELETE" })
                .then(() => setProducts(products.filter((p) => p.id !== id)))
                .catch((err) => console.error("Lỗi xóa:", err));
        }
    };

    // --- Cập nhật sản phẩm ---
    const handleUpdate = () => {
        fetch(`http://localhost:5005/products/${editingProduct.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editingProduct),
        })
            .then((res) => res.json())
            .then((updated) => {
                setProducts(
                    products.map((p) => (p.id === updated.id ? updated : p))
                );
                setEditingProduct(null);
                alert("✅ Cập nhật thành công!");
            })
            .catch((err) => console.error("Lỗi cập nhật:", err));
    };

    return (
        <div className="manage-products">
            <h2>Quản lý các loại bảo hiểm</h2>

            {/* Nút bật/tắt form thêm */}
            <button className="add-btn" onClick={() => setShowForm(!showForm)}>
                {showForm ? "Ẩn form thêm" : "+ Thêm bảo hiểm mới"}
            </button>

            {/* --- FORM THÊM --- */}
            {showForm && (
                <div className="add-form">
                    <input
                        placeholder="Tên bảo hiểm"
                        value={newProduct.name}
                        onChange={(e) =>
                            setNewProduct({ ...newProduct, name: e.target.value })
                        }
                    />

                    <select
                        value={newProduct.category}
                        onChange={(e) =>
                            setNewProduct({ ...newProduct, category: e.target.value })
                        }
                    >
                        <option value="">-- Chọn thể loại --</option>
                        {categories.map((cat, index) => (
                            <option key={index} value={cat}>{cat}</option>
                        ))}
                    </select>

                    <input
                        placeholder="Giá"
                        type="number"
                        value={newProduct.price}
                        onChange={(e) =>
                            setNewProduct({ ...newProduct, price: e.target.value })
                        }
                    />
                    <input
                        placeholder="Đền bù lên đến"
                        type="number"
                        value={newProduct.claim}
                        onChange={(e) =>
                            setNewProduct({ ...newProduct, claim: e.target.value })
                        }
                    />
                    <input
                        placeholder="Hình ảnh (URL)"
                        value={newProduct.img}
                        onChange={(e) =>
                            setNewProduct({ ...newProduct, img: e.target.value })
                        }
                    />
                    <textarea
                        placeholder="Mô tả"
                        value={newProduct.description}
                        onChange={(e) =>
                            setNewProduct({ ...newProduct, description: e.target.value })
                        }
                    />

                    <input
                        placeholder="Tiêu đề quyền lợi bố sung"
                        value={newProduct.bonusHead}
                        onChange={(e) =>
                            setNewProduct({ ...newProduct, bonusHead: e.target.value })
                        }
                    />
                    <input
                        placeholder="Thông tin chính"
                        value={newProduct.bonusInfo}
                        onChange={(e) =>
                            setNewProduct({ ...newProduct, bonusInfo: e.target.value })
                        }
                    />
                    <textarea
                        placeholder="Chi tiết thêm"
                        value={newProduct.bonusInfoPlus}
                        onChange={(e) =>
                            setNewProduct({ ...newProduct, bonusInfoPlus: e.target.value })
                        }
                    />

                    <button onClick={handleAdd}>Thêm</button>
                    <button onClick={() => setShowForm(false)}>Hủy</button>
                </div>
            )}

            {/* --- DANH SÁCH SẢN PHẨM --- */}
            <table border="1" width="100%" >
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Tên</th>
                        <th>Thể loại</th>
                        <th>Giá</th>
                        <th>Đền bù</th>
                        <th>Mô tả</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((p) => (
                        <tr key={p.id}>
                            <td>{p.id}</td>
                            <td>
                                {editingProduct?.id === p.id ? (
                                    <input
                                        value={editingProduct.name}
                                        onChange={(e) =>
                                            setEditingProduct({
                                                ...editingProduct,
                                                name: e.target.value,
                                            })
                                        }
                                    />
                                ) : (
                                    p.name
                                )}
                            </td>
                            <td>
                                {editingProduct?.id === p.id ? (
                                    <select
                                        value={editingProduct.category}
                                        onChange={(e) =>
                                            setEditingProduct({ ...editingProduct, category: e.target.value })
                                        }
                                    >
                                        <option value="">-- Chọn thể loại --</option>
                                        {categories.map((cat, index) => (
                                            <option key={index} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                ) : (
                                    p.category
                                )}

                            </td>
                            <td>
                                {editingProduct?.id === p.id ? (
                                    <input
                                        type="number"
                                        value={editingProduct.price}
                                        onChange={(e) =>
                                            setEditingProduct({
                                                ...editingProduct,
                                                price: e.target.value,
                                            })
                                        }
                                    />
                                ) : (
                                    `${p.price.toLocaleString()} đ`
                                )}
                            </td>
                            <td>
                                {editingProduct?.id === p.id ? (
                                    <input
                                        type="number"
                                        value={editingProduct.claim}
                                        onChange={(e) =>
                                            setEditingProduct({
                                                ...editingProduct,
                                                claim: e.target.value,
                                            })
                                        }
                                    />
                                ) : (
                                    `${p.claim.toLocaleString()} đ`
                                )}
                            </td>
                            <td>
                                {editingProduct?.id === p.id ? (
                                    <textarea
                                        value={editingProduct.description}
                                        onChange={(e) =>
                                            setEditingProduct({
                                                ...editingProduct,
                                                description: e.target.value,
                                            })
                                        }
                                    />
                                ) : (
                                    p.description
                                )}
                            </td>

                            <td>
                                {editingProduct?.id === p.id ? (
                                    <>
                                        <button onClick={handleUpdate}>Lưu</button>
                                        <button onClick={() => setEditingProduct(null)}>Hủy</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => setEditingProduct(p)}>Sửa</button>
                                        <button onClick={() => handleDelete(p.id)}>Xóa</button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ManageProducts;
