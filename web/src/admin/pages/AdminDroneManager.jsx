import React, { useEffect, useState } from "react";
import { Table, Modal, Input, Select, message, Spin } from "antd";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import "./AdminDroneManager.css";

export default function AdminDroneManager() {
  const [drones, setDrones] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingDrone, setEditingDrone] = useState(null);

  // Filter state
  const [searchText, setSearchText] = useState("");
  const [restaurantFilter, setRestaurantFilter] = useState("Tất cả");
  const [statusFilter, setStatusFilter] = useState("Tất cả");

  const [form, setForm] = useState({
    name: "",
    status: "Rảnh",
    battery: 100,
    restaurantId: "",
    restaurantName: "",
  });

  // 🔹 Fetch toàn bộ dữ liệu
  const fetchAll = async () => {
    try {
      const [dronesSnap, restaurantsSnap, ordersSnap] = await Promise.all([
        getDocs(collection(db, "drones")),
        getDocs(collection(db, "restaurants")),
        getDocs(collection(db, "orders")),
      ]);

      setDrones(dronesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setRestaurants(restaurantsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setOrders(ordersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("❌ Lỗi tải dữ liệu:", err);
      message.error("Không thể tải dữ liệu drone!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // 🔹 Render trạng thái drone
  const renderStatus = (status) => {
    switch (status) {
      case "Đang giao":
        return <span className="drone-status busy">🔵 Đang giao</span>;
      case "Rảnh":
        return <span className="drone-status idle">🟢 Rảnh</span>;
      case "Bảo trì":
        return <span className="drone-status maintenance">🔴 Bảo trì</span>;
      default:
        return status;
    }
  };

  // 🔹 Tìm đơn hàng đang giao
  const getOrder = (id) => orders.find((o) => o.id === id);

  // 🔹 Tìm tên nhà hàng
  const getRestaurantName = (id) => restaurants.find((r) => r.id === id)?.name || "—";

  // 🔹 Xử lý thêm mới
  const handleAdd = async () => {
    if (!form.name.trim() || !form.restaurantId) {
      return message.warning("⚠️ Nhập tên drone và chọn nhà hàng!");
    }

    try {
      const payload = {
        name: form.name.trim(),
        status: form.status,
        battery: Number(form.battery),
        restaurantId: form.restaurantId,
        restaurantName: form.restaurantName || getRestaurantName(form.restaurantId),
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "drones"), payload);
      message.success("✅ Đã thêm drone mới!");
      setModalVisible(false);
      setForm({ name: "", status: "Rảnh", battery: 100, restaurantId: "", restaurantName: "" });
      fetchAll();
    } catch (err) {
      console.error("🔥 Lỗi thêm drone:", err);
      message.error("❌ Thêm drone thất bại!");
    }
  };

  // 🔹 Cập nhật drone
  const handleUpdate = async () => {
    try {
      const ref = doc(db, "drones", editingDrone.id);
      await updateDoc(ref, {
        name: form.name,
        status: form.status,
        battery: Number(form.battery),
        restaurantId: form.restaurantId,
        restaurantName: form.restaurantName || getRestaurantName(form.restaurantId),
      });
      message.success("✏️ Cập nhật thành công!");
      setModalVisible(false);
      fetchAll();
    } catch (err) {
      console.error("🔥 Lỗi cập nhật drone:", err);
      message.error("❌ Cập nhật thất bại!");
    }
  };

  // 🔹 Xóa drone
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa drone này không?")) return;
    try {
      await deleteDoc(doc(db, "drones", id));
      message.success("🗑️ Đã xóa drone!");
      fetchAll();
    } catch (err) {
      console.error("🔥 Lỗi khi xóa drone:", err);
      message.error("❌ Không thể xóa drone!");
    }
  };

  // ✅ Lọc danh sách drone (đã bỏ lọc pin)
  const filteredDrones = drones.filter((d) => {
    const matchName = d.name.toLowerCase().includes(searchText.toLowerCase());
    const matchRestaurant =
      restaurantFilter === "Tất cả" || getRestaurantName(d.restaurantId) === restaurantFilter;
    const matchStatus = statusFilter === "Tất cả" || d.status === statusFilter;
    return matchName && matchRestaurant && matchStatus;
  });

  const columns = [
    { title: "ID", dataIndex: "id", width: 80 },
    { title: "Tên Drone", dataIndex: "name" },
    { title: "Trạng thái", dataIndex: "status", render: renderStatus },
    { title: "Pin (%)", dataIndex: "battery", render: (b) => `${b ?? "?"}%` },
    { title: "Nhà hàng", render: (_, d) => getRestaurantName(d.restaurantId) },
    {
      title: "Đơn đang giao",
      render: (_, d) => {
        const order = d.currentOrderId ? getOrder(d.currentOrderId) : null;
        return order ? (
          <span>
            #{order.id} — {order.customer?.name || "Khách không rõ"}
          </span>
        ) : (
          "—"
        );
      },
    },
    {
      title: "Hành động",
      render: (_, d) => (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="edit-btn"
            onClick={() => {
              setEditingDrone(d);
              setForm({
                name: d.name,
                status: d.status,
                battery: d.battery,
                restaurantId: d.restaurantId,
                restaurantName: d.restaurantName || getRestaurantName(d.restaurantId),
              });
              setModalVisible(true);
            }}
          >
            ✏️ Sửa
          </button>
          <button className="delete-btn" onClick={() => handleDelete(d.id)}>
            ❌ Xóa
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="loading">
        <Spin tip="Đang tải danh sách drone..." fullscreen />
      </div>
    );
  }

  return (
    <div className="admin-drones-page">
      <h1 className="page-title">🚁 Quản lý Drone (Admin)</h1>

      {/* Bộ lọc */}
      <div className="filter-container">
        <div className="filter-item">
          <label>Tìm theo tên:</label>
          <Input
            placeholder="Nhập tên drone..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <div className="filter-item">
          <label>Nhà hàng:</label>
          <Select
            value={restaurantFilter}
            onChange={setRestaurantFilter}
            style={{ width: "100%" }}
          >
            {["Tất cả", ...restaurants.map((r) => r.name)].map((name) => (
              <Select.Option key={name} value={name}>
                {name}
              </Select.Option>
            ))}
          </Select>
        </div>

        <div className="filter-item">
          <label>Trạng thái:</label>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: "100%" }}
          >
            {["Tất cả", "Rảnh", "Đang giao", "Bảo trì"].map((s) => (
              <Select.Option key={s} value={s}>
                {s}
              </Select.Option>
            ))}
          </Select>
        </div>

        <button className="add-btn" onClick={() => setModalVisible(true)}>
          ➕ Thêm drone
        </button>
      </div>

      {/* Bảng danh sách */}
      <Table
        columns={columns}
        dataSource={filteredDrones}
        rowKey="id"
        pagination={{ pageSize: 6 }}
        className="drone-table"
      />

      {/* Modal thêm / sửa */}
      <Modal
        open={modalVisible}
        title={editingDrone ? "Chỉnh sửa Drone" : "Thêm Drone"}
        onCancel={() => {
          setModalVisible(false);
          setEditingDrone(null);
        }}
        onOk={editingDrone ? handleUpdate : handleAdd}
        okText={editingDrone ? "Cập nhật" : "Thêm"}
        centered
      >
        <label>Tên drone</label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <label>Trạng thái</label>
        <Select
          value={form.status}
          onChange={(v) => setForm({ ...form, status: v })}
          style={{ width: "100%" }}
          getPopupContainer={(trigger) => trigger.parentNode}
        >
          <Select.Option value="Rảnh">🟢 Rảnh</Select.Option>
          <Select.Option value="Đang giao">🔵 Đang giao</Select.Option>
          <Select.Option value="Bảo trì">🔴 Bảo trì</Select.Option>
        </Select>

        <label>Mức pin (%)</label>
        <Input
          type="number"
          min={0}
          max={100}
          value={form.battery}
          onChange={(e) => setForm({ ...form, battery: e.target.value })}
        />

        <label>Nhà hàng</label>
        <Select
          placeholder="Chọn nhà hàng"
          value={form.restaurantId || undefined}
          onChange={(v, option) =>
            setForm({
              ...form,
              restaurantId: v,
              restaurantName: option?.children || "",
            })
          }
          style={{ width: "100%" }}
          getPopupContainer={(trigger) => trigger.parentNode}
          showSearch
          optionFilterProp="children"
        >
          {restaurants.map((r) => (
            <Select.Option key={r.id} value={r.id}>
              {r.name}
            </Select.Option>
          ))}
        </Select>
      </Modal>
    </div>
  );
}
