import { useEffect, useState } from "react";
import { Table, Input, Select, Tag, Button, Modal, Form, message, Popover } from "antd";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [loadingIds, setLoadingIds] = useState([]);

  const roles = ["all", "admin", "customer", "restaurant"];

  // ✅ Load Users (Không override ID)
  const loadUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const data = querySnapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id, // ĐÚNG → Dùng doc.id thật của Firestore
        status: d.data().status || "active",
      }));
      setUsers(data);
    } catch (error) {
      console.error("Lỗi tải users:", error);
      message.error("Không tải được dữ liệu users");
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 🔍 Filter
  const filteredUsers = users.filter((u) => {
    const fullname = `${u.firstname || ""} ${u.lastname || ""}`.toLowerCase();
    const matchName = fullname.includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchName && matchRole;
  });

  // 🗑 Xóa user
  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      await deleteDoc(doc(db, "users", deletingId));
      setUsers((prev) => prev.filter((u) => u.id !== deletingId));
      message.success("✅ Đã xóa người dùng khỏi Firestore!");
    } catch (err) {
      console.error(err);
      message.error("❌ Xóa thất bại!");
    } finally {
      setConfirmVisible(false);
      setDeletingId(null);
    }
  };

  const showConfirm = (id) => {
    setDeletingId(id);
    setConfirmVisible(true);
  };

  // 🟡 Change status
  const handleChangeStatus = async (user, newStatus) => {
    if (user.status === newStatus) return;

    setLoadingIds((prev) => [...prev, user.id]); // Loading cho đúng user

    try {
      await updateDoc(doc(db, "users", user.id), { status: newStatus });
      message.success(newStatus === "banned" ? "🔴 Đã khóa tài khoản" : "🟢 Đã mở khóa tài khoản");
      loadUsers();
    } catch (error) {
      console.error(error);
      message.error("Cập nhật trạng thái thất bại");
    } finally {
      setLoadingIds((prev) => prev.filter((id) => id !== user.id));
    }
  };

  // ✏️ Edit User
  const handleEdit = (user) => {
    setEditingUser(user);
    setModalVisible(true);
  };

  const handleSave = async (values) => {
    try {
      await updateDoc(doc(db, "users", editingUser.id), values);
      message.success("✅ Cập nhật thành công");
      setModalVisible(false);
      setEditingUser(null);
      loadUsers();
    } catch {
      message.error("❌ Cập nhật thất bại");
    }
  };

  // 📍 Table Columns
  const columns = [
    { title: "ID", dataIndex: "id", key: "id" },

    {
      title: "Tên đầy đủ",
      key: "fullname",
      render: (_, r) => `${r.firstname || ""} ${r.lastname || ""}`,
    },

    { title: "SĐT", dataIndex: "phonenumber", key: "phonenumber", render: (v) => v || "-" },
    { title: "Địa chỉ", dataIndex: "address", key: "address", render: (v) => v || "-" },

    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role) => (
        <Tag color={role === "admin" ? "purple" : "green"} style={{ padding: "5px 10px", borderRadius: "14px", fontSize: 13 }}>
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
            <div onClick={() => handleChangeStatus(user, "active")} style={{ padding: 6, cursor: "pointer", borderRadius: 6, background: status === "active" ? "#E8F5E9" : "" }}>
              🟢 Active
            </div>
            <div onClick={() => handleChangeStatus(user, "banned")} style={{ padding: 6, cursor: "pointer", borderRadius: 6, background: status === "banned" ? "#FFEBEE" : "" }}>
              🔴 Banned
            </div>
          </div>
        );

        return (
          <Popover content={menu} trigger="click">
            <Tag color={status === "banned" ? "red" : "green"} style={{ padding: "6px 12px", borderRadius: "14px", fontSize: 13, cursor: "pointer", opacity: loading ? 0.5 : 1 }}>
              {status === "banned" ? "Banned" : "Active"} ⌄
            </Tag>
          </Popover>
        );
      },
    },

    {
      title: "Hành động",
      key: "action",
      render: (_, record) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={() => handleEdit(record)}>Sửa</Button>
          <Button danger onClick={() => showConfirm(record.id)}>Xóa</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="users-page">
      <h1>👥 Quản lý người dùng</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Input.Search placeholder="Tìm kiếm theo tên..." style={{ width: 300 }} value={search} onChange={(e) => setSearch(e.target.value)} allowClear />
        <Select value={roleFilter} onChange={setRoleFilter} style={{ width: 200 }}>
          {roles.map((r) => (
            <Select.Option key={r} value={r}>
              {r === "all" ? "Tất cả" : r}
            </Select.Option>
          ))}
        </Select>
      </div>

      <Table columns={columns} dataSource={filteredUsers} rowKey="id" pagination={{ pageSize: 6 }} />

      {/* ✅ Confirm Delete Modal */}
      <Modal title="Xác nhận xóa" open={confirmVisible} onCancel={() => setConfirmVisible(false)}
        onOk={confirmDelete} okText="Xóa" okType="danger" cancelText="Hủy" centered>
        <p>Bạn có chắc chắn muốn xóa người dùng này?</p>
      </Modal>

      {/* ✏️ Edit Modal */}
      <Modal title="Chỉnh sửa người dùng" open={modalVisible}
        onCancel={() => { setModalVisible(false); setEditingUser(null); }} footer={null}>
        {editingUser && (
          <Form layout="vertical" initialValues={editingUser} onFinish={handleSave}>
            <Form.Item label="Tên" name="firstname"><Input /></Form.Item>
            <Form.Item label="Họ" name="lastname"><Input /></Form.Item>
            <Form.Item label="SĐT" name="phonenumber"><Input /></Form.Item>
            <Form.Item label="Địa chỉ" name="address"><Input /></Form.Item>
           
            <Form.Item><Button type="primary" htmlType="submit" style={{ width: "100%" }}>Lưu</Button></Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
