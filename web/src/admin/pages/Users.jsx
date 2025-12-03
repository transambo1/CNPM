import { useEffect, useState } from "react";
import {
  Table,
  Input,
  Select,
  Tag,
  Button,
  Modal,
  Form,
  message,
  Popover,
} from "antd";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
const [deleteUser, setDeleteUser] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [loadingIds, setLoadingIds] = useState([]);

  const roles = ["all", "admin", "customer", "restaurant"];

  // ==========================
  // LOAD USERS
  // ==========================
  const loadUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const data = snap.docs.map((d) => ({
        ...d.data(),
        id: d.id,
        status: d.data().status || "active",
      }));
      setUsers(data);
    } catch (err) {
      console.error("Lỗi load users:", err);
      message.error("Không tải được danh sách users");
    }
  };

  // ==========================
  // LOAD RESTAURANTS
  // ==========================
  const loadRestaurants = async () => {
    try {
      const snap = await getDocs(collection(db, "restaurants"));
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setRestaurants(data);
    } catch (err) {
      console.error("Lỗi load restaurants:", err);
    }
  };

  useEffect(() => {
    loadUsers();
    loadRestaurants();
  }, []);

  // ==========================
  // LẤY TÊN NHÀ HÀNG
  // ==========================
  const getRestaurantName = (restaurantId) => {
    const res = restaurants.find((r) => r.id === restaurantId);
    return res ? res.name : "—";
  };

  // ==========================
  // FILTER USERS
  // ==========================
  const filteredUsers = users.filter((u) => {
    const fullname = `${u.firstname || ""} ${u.lastname || ""}`.toLowerCase();
    const matchName = fullname.includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchName && matchRole;
  });

  // ==========================
  // UPDATE STATUS
  // ==========================
  const handleChangeStatus = async (user, newStatus) => {
    if (user.status === newStatus) return;

    setLoadingIds((prev) => [...prev, user.id]);

    try {
      await updateDoc(doc(db, "users", user.id), { status: newStatus });

      // Nếu là nhà hàng → update restaurant.status
      if (user.role === "restaurant" && user.restaurantId) {
        await updateDoc(doc(db, "restaurants", user.restaurantId), {
          status: newStatus,
        });
      }

      message.success(
        newStatus === "banned"
          ? "🔴 Nhà hàng đã bị khóa"
          : "🟢 Nhà hàng đã mở khóa"
      );

      loadUsers();
    } catch (err) {
      console.error(err);
      message.error("Cập nhật trạng thái thất bại");
    } finally {
      setLoadingIds((prev) => prev.filter((id) => id !== user.id));
    }
  };

  // ==========================
  // DELETE USER + RELATED DATA
  // ==========================
  const handleDeleteUser = async (user) => {
  try {
    // XÓA USER
    await deleteDoc(doc(db, "users", user.id));

    // Nếu là nhà hàng
    if (user.role === "restaurant" && user.restaurantId) {
      // Xóa nhà hàng
      await deleteDoc(doc(db, "restaurants", user.restaurantId));

      // Xóa sản phẩm
      const qProducts = query(
        collection(db, "products"),
        where("restaurantId", "==", user.restaurantId)
      );
      const snapProducts = await getDocs(qProducts);
      snapProducts.forEach((p) => deleteDoc(doc(db, "products", p.id)));

      // Xóa drone
      const qDrones = query(
        collection(db, "drones"),
        where("restaurantId", "==", user.restaurantId)
      );
      const snapDrones = await getDocs(qDrones);
      snapDrones.forEach((d) => deleteDoc(doc(db, "drones", d.id)));

      // Xóa đơn hàng theo nhà hàng
      const qOrdersByRestaurant = query(
        collection(db, "orders"),
        where("restaurantId", "==", user.restaurantId)
      );
      const snapOrdersRestaurant = await getDocs(qOrdersByRestaurant);
      snapOrdersRestaurant.forEach((o) =>
        deleteDoc(doc(db, "orders", o.id))
      );
    }

    // Xóa đơn hàng do user đặt
    const qOrdersByUser = query(
      collection(db, "orders"),
      where("userId", "==", user.id)
    );
    const snapUserOrders = await getDocs(qOrdersByUser);
    snapUserOrders.forEach((o) =>
      deleteDoc(doc(db, "orders", o.id))
    );

    message.success("Đã xóa thành công!");
    loadUsers();
  } catch (err) {
    console.error(err);
    message.error("Xóa thất bại");
  }
};


  // ==========================
  // EDIT USER
  // ==========================
  const handleEdit = (user) => {
    setEditingUser(user);
    setModalVisible(true);
  };

  const handleSave = async (values) => {
    try {
      await updateDoc(doc(db, "users", editingUser.id), values);
      message.success("Cập nhật thành công!");
      setModalVisible(false);
      setEditingUser(null);
      loadUsers();
    } catch {
      message.error("Cập nhật thất bại");
    }
  };

  // ==========================
  // TABLE COLUMNS
  // ==========================
  const columns = [
    { title: "ID", dataIndex: "id", key: "id" },

    {
      title: "Nhà hàng",
      key: "restaurantName",
      render: (_, user) =>
        user.role === "restaurant"
          ? getRestaurantName(user.restaurantId)
          : "—",
    },

    {
      title: "Tên đầy đủ",
      key: "fullname",
      render: (_, r) => `${r.firstname || ""} ${r.lastname || ""}`,
    },

    {
      title: "SĐT",
      dataIndex: "phonenumber",
      key: "phonenumber",
      render: (v) => v || "—",
    },

    {
      title: "Địa chỉ",
      dataIndex: "address",
      key: "address",
      render: (v) => v || "—",
    },

    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role) => (
        <Tag
          color={role === "admin" ? "purple" : "green"}
          style={{ padding: "5px 10px", borderRadius: 14 }}
        >
          {role}
        </Tag>
      ),
    },

    {
      title: "Trạng thái",
      key: "status",
      render: (_, user) => {
        const status = user.status || "active";
        const loading = loadingIds.includes(user.id);

        const menu = (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              onClick={() => handleChangeStatus(user, "active")}
              style={{
                padding: 6,
                cursor: "pointer",
                borderRadius: 6,
                background: status === "active" ? "#E8F5E9" : "",
              }}
            >
              🟢 Active
            </div>

            <div
              onClick={() => handleChangeStatus(user, "banned")}
              style={{
                padding: 6,
                cursor: "pointer",
                borderRadius: 6,
                background: status === "banned" ? "#FFEBEE" : "",
              }}
            >
              🔴 Banned
            </div>
          </div>
        );

        return (
          <Popover content={menu} trigger="click">
            <Tag
              color={status === "banned" ? "red" : "green"}
              style={{
                padding: "6px 12px",
                borderRadius: 14,
                cursor: "pointer",
                opacity: loading ? 0.5 : 1,
              }}
            >
              {status === "banned" ? "Banned" : "Active"} ⌄
            </Tag>
          </Popover>
        );
      },
    },

    {
      title: "Hành động",
      key: "action",
      render: (_, r) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={() => handleEdit(r)}>Sửa</Button>
          <Button danger onClick={() => setDeleteUser(r)}>Xóa</Button>
        </div>
      ),
    },
  ];

  // ==========================
  // RETURN JSX
  // ==========================
  return (
    <div className="users-page">
      <h1> Quản lý người dùng</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Input.Search
          placeholder="Tìm kiếm theo tên..."
          style={{ width: 300 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />

        <Select
          value={roleFilter}
          onChange={setRoleFilter}
          style={{ width: 200 }}
        >
          {roles.map((r) => (
            <Select.Option key={r} value={r}>
              {r === "all" ? "Tất cả" : r}
            </Select.Option>
          ))}
        </Select>
      </div>

      <Table
        columns={columns}
        dataSource={filteredUsers}
        rowKey="id"
        pagination={{ pageSize: 6 }}
      />

      {/* MODAL EDIT */}
      <Modal
        title="Chỉnh sửa người dùng"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingUser(null);
        }}
        footer={null}
      >
        {editingUser && (
          <Form layout="vertical" initialValues={editingUser} onFinish={handleSave}>
            <Form.Item label="Tên" name="firstname">
              <Input />
            </Form.Item>
            <Form.Item label="Họ" name="lastname">
              <Input />
            </Form.Item>
            <Form.Item label="SĐT" name="phonenumber">
              <Input />
            </Form.Item>
            <Form.Item label="Địa chỉ" name="address">
              <Input />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" style={{ width: "100%" }}>
                Lưu
              </Button>
            </Form.Item>
          </Form>
        )}
      </Modal>
      <Modal
  title="Xác nhận xóa người dùng"
  open={!!deleteUser}
  okText="Xóa"
  okType="danger"
  cancelText="Hủy"
  onCancel={() => setDeleteUser(null)}
  onOk={() => {
    handleDeleteUser(deleteUser);
    setDeleteUser(null);
  }}
>
  <p>Bạn có chắc muốn xóa người dùng này?</p>
  <p style={{color:"red"}}>Hành động này sẽ xóa TẤT CẢ dữ liệu liên quan!</p>
</Modal>

    </div>
  );
}
