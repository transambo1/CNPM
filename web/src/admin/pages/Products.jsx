import { useEffect, useState } from "react";
import { Table, Input, Select, Slider, Modal, message, Spin } from "antd";
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import "./Products.css";

export default function AdminProducts() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [restaurantsList, setRestaurantsList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [restaurantFilter, setRestaurantFilter] = useState("Tất cả");
  const [priceRange, setPriceRange] = useState([0, 1000000]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState({
    id: "",
    name: "",
    category: "",
    restaurantId: "",
    price: 0,
    img: "",
    description: "",
  });

  // ===== FETCH DATA =====
  useEffect(() => {
    fetchProducts();
    fetchRestaurants();
  }, []);

  const fetchProducts = async () => {
    try {
      const snapshot = await getDocs(collection(db, "products"));
      const productsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setData(productsData);
      setFilteredData(productsData);
    } catch (err) {
      console.error("❌ Lỗi khi tải sản phẩm:", err);
      message.error("Không thể tải danh sách sản phẩm!");
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const snapshot = await getDocs(collection(db, "restaurants"));
      const restaurantData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("🔥 Loaded restaurants:", restaurantData);
      setRestaurantsList(restaurantData);
    } catch (err) {
      console.error("❌ Lỗi khi tải nhà hàng:", err);
      message.error("Không thể tải danh sách nhà hàng!");
    } finally {
      setLoadingRestaurants(false);
    }
  };

  // ===== HELPER =====
  const getRestaurantName = (id) => {
    const found = restaurantsList.find((r) => r.id === id);
    return found ? found.name : "Không rõ";
  };

  // ===== FILTER =====
  useEffect(() => {
    let filtered = data.filter((item) => {
      const matchName = item.name?.toLowerCase().includes(searchText.toLowerCase());
      const matchCategory = category === "Tất cả" || item.category === category;
      const matchRestaurant =
        restaurantFilter === "Tất cả" || getRestaurantName(item.restaurantId) === restaurantFilter;
      const matchPrice = item.price >= priceRange[0] && item.price <= priceRange[1];
      return matchName && matchCategory && matchRestaurant && matchPrice;
    });
    setFilteredData(filtered);
  }, [searchText, category, restaurantFilter, priceRange, data, restaurantsList]);

  // ===== CRUD =====
  const handleAdd = async () => {
  console.log("📦 Dữ liệu form gửi:", form);

  // ✅ Kiểm tra dữ liệu đầu vào
  if (!form.name.trim()) return message.warning("⚠️ Vui lòng nhập tên sản phẩm!");
  if (!form.restaurantId) return message.warning("⚠️ Vui lòng chọn nhà hàng!");
if (form.price === "" || isNaN(Number(form.price)))
  return message.warning("⚠️ Vui lòng nhập giá hợp lệ!");

  try {
    const restaurant = restaurantsList.find((r) => r.id === form.restaurantId);
    if (!restaurant) {
      message.error("❌ Nhà hàng không hợp lệ!");
      return;
    }

    const productData = {
      name: form.name.trim(),
      category: form.category.trim() || "Khác",
      restaurantId: form.restaurantId,
      restaurantName: restaurant.name, // ✅ thêm tên nhà hàng để tiện xem
      price: Number(form.price),
      img: form.img.trim() || "",
      description: form.description.trim() || "",
      createdAt: new Date().toISOString(),
    };

    console.log("🚀 Gửi lên Firestore:", productData);

    await addDoc(collection(db, "products"), productData);
    message.success(`✅ Đã thêm sản phẩm "${form.name}" cho ${restaurant.name}!`);

    // Reset form
    setShowAddModal(false);
    setForm({
      id: "",
      name: "",
      category: "",
      restaurantId: "",
      price: 0,
      img: "",
      description: "",
    });

    fetchProducts();
  } catch (err) {
    console.error("🔥 Lỗi khi thêm sản phẩm:", err);
    message.error("❌ Có lỗi xảy ra khi thêm sản phẩm!");
  }
};


  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này không?")) return;
    await deleteDoc(doc(db, "products", id));
    message.success("🗑️ Đã xóa sản phẩm!");
    fetchProducts();
  };

  const handleEdit = async () => {
    try {
      await updateDoc(doc(db, "products", form.id), form);
      message.success("✏️ Đã cập nhật sản phẩm!");
      setShowEditModal(false);
      fetchProducts();
    } catch (err) {
      console.error("🔥 Lỗi cập nhật:", err);
      message.error("❌ Cập nhật thất bại!");
    }
  };

  // ===== TABLE COLUMNS =====
  const columns = [
    {
      title: "Hình ảnh",
      dataIndex: "img",
      render: (img) => <img src={img} alt="product" className="product-thumb" />,
    },
    { title: "Tên sản phẩm", dataIndex: "name", sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: "Danh mục", dataIndex: "category" },
    { title: "Nhà hàng", render: (_, record) => getRestaurantName(record.restaurantId) },
    {
      title: "Giá (VND)",
      dataIndex: "price",
      render: (p) => p?.toLocaleString(),
      sorter: (a, b) => a.price - b.price,
    },
    { title: "Mô tả", dataIndex: "description", ellipsis: true },
    {
      title: "Hành động",
      render: (_, record) => (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="edit-btn"
            onClick={() => {
              setForm(record);
              setShowEditModal(true);
            }}
          >
            ✏️ Sửa
          </button>
          <button className="delete-btn" onClick={() => handleDelete(record.id)}>
            ❌ Xóa
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 60 }}>
        <Spin size="large" tip="Đang tải dữ liệu..." fullscreen />
      </div>
    );
  }

  return (
    <div className="products-page">
      <h1 className="page-title">🍔 Quản lý sản phẩm (Admin)</h1>

      {/* ===== FILTER ===== */}
      <div className="filter-container">
        <div className="filter-item">
          <label>Tìm kiếm:</label>
          <Input placeholder="Nhập tên sản phẩm..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        </div>

        <div className="filter-item">
          <label>Danh mục:</label>
          <Select value={category} onChange={setCategory} style={{ width: "100%" }}>
            {["Tất cả", ...new Set(data.map((item) => item.category || "Khác"))].map((cat, i) => (
              <Select.Option key={i} value={cat}>
                {cat}
              </Select.Option>
            ))}
          </Select>
        </div>

        <div className="filter-item">
          <label>Nhà hàng:</label>
          <Select
            value={restaurantFilter}
            onChange={setRestaurantFilter}
            style={{ width: "100%" }}
            loading={loadingRestaurants}
            placeholder={loadingRestaurants ? "Đang tải..." : "Chọn nhà hàng"}
          >
            {["Tất cả", ...restaurantsList.map((r) => r.name)].map((rest, i) => (
              <Select.Option key={i} value={rest}>
                {rest}
              </Select.Option>
            ))}
          </Select>
        </div>

        <div className="filter-item">
          <label>Khoảng giá:</label>
          <div className="price-range">
            <Slider
              range
              min={0}
              max={1000000}
              step={10000}
              value={priceRange}
              onChange={setPriceRange}
              tooltip={{ formatter: null }}
            />
            <div className="price-values">
              <span>{priceRange[0].toLocaleString()} ₫</span>
              <span>{priceRange[1].toLocaleString()} ₫</span>
            </div>
          </div>
        </div>

        <button className="add-btn" onClick={() => setShowAddModal(true)}>
          ➕ Thêm sản phẩm
        </button>
      </div>

      {/* ===== TABLE ===== */}
      <Table columns={columns} dataSource={filteredData} rowKey="id" pagination={{ pageSize: 6 }} />

      {/* ===== ADD MODAL ===== */}
      <Modal
        open={showAddModal}
        title="Thêm sản phẩm mới"
        onCancel={() => setShowAddModal(false)}
        onOk={handleAdd}
        okText="Thêm"
        centered
      >
        <label>Tên sản phẩm</label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

        <label>Nhà hàng</label>
        <Select
          value={form.restaurantId}
          onChange={(v) => setForm({ ...form, restaurantId: v })}
          style={{ width: "100%" }}
          placeholder="Chọn nhà hàng"
          loading={loadingRestaurants}
          getPopupContainer={(trigger) => trigger.parentNode} // ✅ FIX LỖI dropdown không hiện
        >
          {restaurantsList.map((r) => (
            <Select.Option key={r.id} value={r.id}>
              {r.name}
            </Select.Option>
          ))}
        </Select>

        <label>Danh mục</label>
        <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />

        <label>Giá</label>
        <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />

        <label>Hình ảnh (URL)</label>
        <Input value={form.img} onChange={(e) => setForm({ ...form, img: e.target.value })} />

        <label>Mô tả</label>
        <Input.TextArea
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Modal>

      {/* ===== EDIT MODAL ===== */}
      <Modal
        open={showEditModal}
        title="Chỉnh sửa sản phẩm"
        onCancel={() => setShowEditModal(false)}
        onOk={handleEdit}
        okText="Cập nhật"
        centered
      >
        <label>Tên sản phẩm</label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

        <label>Giá</label>
        <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />

        <label>Danh mục</label>
        <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />

        <label>Hình ảnh (URL)</label>
        <Input value={form.img} onChange={(e) => setForm({ ...form, img: e.target.value })} />

        <label>Mô tả</label>
        <Input.TextArea
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Modal>
    </div>
  );
}
