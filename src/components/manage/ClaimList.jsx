import React, { useEffect, useState } from "react";
import "./ClaimList.css";

function ClaimList() {
    const [claims, setClaims] = useState([]);
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    useEffect(() => {
        if (currentUser && currentUser.id) {
            fetch(`http://localhost:5005/claims?userId=${currentUser.id}`)
                .then((res) => res.json())
                .then((data) => setClaims(data))
                .catch((err) => console.error(err));
        }
    }, [currentUser]);

    // 🧩 Hàm cập nhật trạng thái yêu cầu bồi thường
    const updateStatus = async (id, newStatus) => {
        try {
            // Gửi PUT (hoặc PATCH) lên JSON Server để cập nhật
            await fetch(`http://localhost:5005/claims/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            // Cập nhật lại dữ liệu trong state cho hiển thị ngay lập tức
            setClaims((prevClaims) =>
                prevClaims.map((claim) =>
                    claim.id === id ? { ...claim, status: newStatus } : claim
                )
            );


        } catch (error) {
            console.error("Lỗi cập nhật trạng thái:", error);
            alert("❌ Lỗi khi cập nhật trạng thái!");
        }
    };

    return (
        <div className="container">
            <h2>Danh sách yêu cầu bồi thường</h2>
            {claims.length === 0 ? (
                <p>Bạn chưa có yêu cầu bồi thường nào</p>
            ) : (
                <div className="container1">
                    <table border="1" cellPadding="10" style={{ width: "100%", marginTop: "20px" }}>
                        <thead>
                            <tr>
                                <th>Mã yêu cầu</th>
                                <th>Thông tin khách hàng</th>
                                <th>Số điện thoại</th>
                                <th>Địa chỉ</th>
                                <th>Loại bảo hiểm</th>
                                <th>Tổng tiền bảo hiểm</th>
                                <th>Tiền đền bù tối đa</th>
                                <th>Ngày gửi yêu cầu</th>
                                <th>Trạng thái xử lý</th>
                            </tr>
                        </thead>
                        <tbody>
                            {claims.map((claim) => (
                                <tr key={claim.id}>
                                    <td>{claim.id}</td>
                                    <td>{claim.customer.name}</td>
                                    <td>{claim.customer.phone}</td>
                                    <td>{claim.customer.address}</td>
                                    <td>
                                        {claim.items.map((item, index) => (
                                            <div key={index}>
                                                {item.name} x {item.quantity}
                                            </div>
                                        ))}
                                    </td>
                                    <td>{claim.total.toLocaleString()}đ</td>
                                    <td>
                                        {claim.items.map((item, index) => (
                                            <div key={index}>
                                                {Number(item.claim).toLocaleString()}đ
                                            </div>
                                        ))}
                                    </td>
                                    <td>{new Date(claim.date).toLocaleString()}</td>
                                    <td>
                                        <select
                                            value={claim.status}
                                            onChange={(e) =>
                                                updateStatus(claim.id, e.target.value)
                                            }
                                        >
                                            <option value="Đang xử lý">Đang xử lý</option>
                                            <option value="Đã xử lý">Đã xử lý</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default ClaimList;
