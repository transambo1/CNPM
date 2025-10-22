import React, { useEffect, useState } from "react";
import { Card, Statistic, Row, Col } from "antd";
import "./Dashboard.css";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
} from "recharts";

export default function Dashboard() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        todayVisits: 3000,
        monthlyOrders: 0,
        newReviews: 284,
        monthlyProfit: 0,
    });
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        fetch("http://localhost:5002/orders")
            .then((res) => res.json())
            .then((data) => {
                // ✅ Chỉ lấy đơn đã xử lý hoặc đã giao
                const validOrders = data.filter(
                    (o) => o.status === "Đã xử lý" || o.status === "Đã giao"
                );

                setOrders(data);
                const monthlyOrders = validOrders.length;
                const totalProfit = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);

                setStats((prev) => ({
                    ...prev,
                    monthlyOrders,
                    monthlyProfit: totalProfit,
                }));

                // ✅ Gom nhóm theo ngày
                const dailyStats = {};
                validOrders.forEach((order) => {
                    const date = order.date;
                    if (!dailyStats[date]) {
                        dailyStats[date] = { date, revenue: 0, count: 0 };
                    }
                    dailyStats[date].revenue += order.total || 0;
                    dailyStats[date].count += 1;
                });

                setChartData(Object.values(dailyStats));
            })
            .catch((err) => console.error("Lỗi khi load dữ liệu:", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="loading">Đang .</div>;
    }

    return (
        <div className="dashboard">
            <h1>📊 CHÀO MỪNG QUẢN TRỊ VIÊN MeoChick !!!</h1>

            {/* ====== THẺ THỐNG KÊ ====== */}
            <div className="cards">
                <div className="card purple">
                    <h2>{stats.todayVisits}</h2>
                    <p>Lượt truy cập hôm nay</p>
                </div>
                <div className="card green">
                    <h2>{stats.monthlyOrders}</h2>
                    <p>Đơn hàng đã xử lý / giao</p>
                </div>
                <div className="card orange">
                    <h2>{stats.newReviews}</h2>
                    <p>Đánh giá mới</p>
                </div>
                <div className="card blue">
                    <h2>{stats.monthlyProfit.toLocaleString()}đ</h2>
                    <p>Doanh thu tháng</p>
                </div>
            </div>

            {/* ====== BIỂU ĐỒ ====== */}
            <div className="charts">
                <div className="chart-container">
                    <h3>💰 Doanh thu theo ngày</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip formatter={(value) => `${value.toLocaleString()}đ`} />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#4f46e5"
                                strokeWidth={3}
                                name="Doanh thu"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-container">
                    <h3>📦 Số đơn hàng theo ngày</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#10b981" name="Số đơn hàng" barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ====== BẢNG ĐƠN HÀNG ====== */}
            <table className="orders-table">
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Mã ĐH</th>
                        <th>Người đặt</th>
                        <th>SDT</th>
                        <th>Thành tiền</th>
                        <th>Ngày</th>
                        <th>Tình trạng</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.length > 0 ? (
                        orders.map((order, index) => (
                            <tr key={order.id}>
                                <td>{index + 1}</td>
                                <td>{order.id}</td>
                                <td>{order.customer?.name}</td>
                                <td>{order.customer?.phone}</td>

                                <td>{(order.total ?? 0).toLocaleString()}đ</td>
                                <td>{order.date}</td>
                                <td
                                    className={
                                        order.status === "Đã giao"
                                            ? "done"
                                            : order.status === "Đã xử lý"
                                                ? "processing"
                                                : "pending"
                                    }
                                >
                                    {order.status}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                                Không có đơn hàng nào.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
