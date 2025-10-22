import { useEffect, useState } from "react";
import { Table, Input, Select, Tag, Button, Modal, Form, message } from "antd";
import "./Users.css";

export default function Users() {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [modalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const roles = ["all", "admin", "customer"];

    const loadUsers = () => {
        fetch("http://localhost:5002/users")
            .then((res) => res.json())
            .then((data) => setUsers(data))
            .catch(() => message.error("Không tải được dữ liệu users"));
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const filteredUsers = users.filter((u) => {
        const fullname = `${u.firstname || ""} ${u.lastname || ""}`.toLowerCase();
        const matchName = fullname.includes(search.toLowerCase());
        const matchRole = roleFilter === "all" || u.role === roleFilter;
        return matchName && matchRole;
    });

    const handleDelete = (id, username) => {
        Modal.confirm({
            title: `Bạn có chắc chắn muốn xóa user "${username}"?`,
            okText: "Xóa",
            okType: "danger",
            cancelText: "Hủy",
            onOk: async () => {
                try {
                    const res = await fetch(`http://localhost:5002/users/${id}`, {
                        method: "DELETE",
                    });

                    if (!res.ok) throw new Error("Xóa thất bại");

                    // Cập nhật state ngay lập tức
                    setUsers((prev) => prev.filter((user) => user.id !== id));

                    message.success(`Xóa user "${username}" thành công!`);
                } catch (err) {
                    console.error(err);
                    message.error(`Xóa user "${username}" thất bại!`);
                }
            },
        });
    };


    const handleEdit = (user) => {
        setEditingUser(user);
        setModalVisible(true);
    };

    const handleSave = (values) => {
        fetch(`http://localhost:5002/users/${editingUser.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
        })
            .then(() => {
                message.success("Cập nhật thành công");
                setModalVisible(false);
                setEditingUser(null);
                loadUsers();
            })
            .catch(() => message.error("Cập nhật thất bại"));
    };

    const columns = [
        { title: "ID", dataIndex: "id", key: "id" },
        {
            title: "Tên đầy đủ",
            key: "fullname",
            render: (_, record) => `${record.firstname || ""} ${record.lastname || ""}`,
        },
        { title: "Tên đăng nhập", dataIndex: "username", key: "username" },
        { title: "SĐT", dataIndex: "phonenumber", key: "phonenumber", render: (v) => v || "-" },
        { title: "Địa chỉ", dataIndex: "address", key: "address", render: (v) => v || "-" },
        {
            title: "Role",
            dataIndex: "role",
            key: "role",
            render: (role) => (
                <Tag color={role === "admin" ? "purple" : "green"}>{role}</Tag>
            ),
        },
        {
            title: "Hành động",
            key: "action",
            render: (_, record) => (
                <div className="action-buttons">
                    <Button className="edit-btn" onClick={() => handleEdit(record)}>
                        Sửa
                    </Button>
                    <Button
                        className="delete-btn"
                        onClick={() => handleDelete(record.id, record.username)}
                    >
                        Xóa
                    </Button>

                </div>
            ),
        },
    ];

    return (
        <div className="users-page">
            <h1>👥 Quản lý người dùng</h1>

            <div className="filter-bar">
                <Input.Search
                    placeholder="Tìm kiếm theo tên..."
                    style={{ width: 300 }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    allowClear
                />
                <Select
                    value={roleFilter}
                    onChange={(value) => setRoleFilter(value)}
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
                pagination={{ pageSize: 3 }}
                className="users-table"
            />

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
                    <Form
                        layout="vertical"
                        initialValues={editingUser}
                        onFinish={handleSave}
                    >
                        <Form.Item label="Tên" name="firstname">
                            <Input />
                        </Form.Item>
                        <Form.Item label="Họ" name="lastname">
                            <Input />
                        </Form.Item>
                        <Form.Item label="Tên đăng nhập" name="username">
                            <Input />
                        </Form.Item>
                        <Form.Item label="SĐT" name="phonenumber">
                            <Input />
                        </Form.Item>
                        <Form.Item label="Địa chỉ" name="address">
                            <Input />
                        </Form.Item>
                        <Form.Item label="Role" name="role">
                            <Select>
                                <Select.Option value="admin">Admin</Select.Option>
                                <Select.Option value="customer">Customer</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" style={{ width: "100%" }}>
                                Lưu
                            </Button>
                        </Form.Item>
                    </Form>
                )}
            </Modal>
        </div>
    );
}
