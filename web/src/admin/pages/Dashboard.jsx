import React, { useEffect, useState } from "react";
import { message } from "antd";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
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

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRestaurants: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [restaurantMap, setRestaurantMap] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const [orderSnap, userSnap, restSnap] = await Promise.all([
          getDocs(collection(db, "orders")),
          getDocs(collection(db, "users")),
          getDocs(collection(db, "restaurants")),
        ]);

        const orderData = orderSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const userData = userSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const restData = restSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        setOrders(orderData);
        setUsers(userData);
        setRestaurants(restData);

        // 🔹 Map id → name để hiển thị tên nhà hàng
        const restMap = {};
        restData.forEach((r) => (restMap[r.id] = r.name));
        setRestaurantMap(restMap);

        // ✅ Thống kê tổng quan
        const doneOrders = orderData.filter((o) =>
          (o.status || "").toLowerCase().includes("đã giao")
        );
        const totalRevenue = doneOrders.reduce((sum, o) => sum + (o.total || 0), 0);

        setStats({
          totalUsers: userData.length,
          totalRestaurants: restData.length,
          totalOrders: orderData.length,
          totalRevenue,
        });

        // ✅ Gom nhóm doanh thu theo ngày (fix chuẩn lỗi sort)
        const dailyStats = {};
        doneOrders.forEach((o) => {
          let dateObj;

          if (o.createdAt?.seconds) {
            dateObj = new Date(o.createdAt.seconds * 1000);
          } else if (o.date) {
            const [day, month, year] = o.date.split("/").map(Number);
            dateObj = new Date(year, month - 1, day);
          } else {
            dateObj = new Date();
          }

          const dateKey = dateObj.toLocaleDateString("vi-VN");
          const timestamp = dateObj.getTime();

          if (!dailyStats[dateKey]) {
            dailyStats[dateKey] = {
              date: dateKey,
              revenue: 0,
              count: 0,
              timestamp,
            };
          }

          dailyStats[dateKey].revenue += o.total || 0;
          dailyStats[dateKey].count += 1;
        });

        setChartData(
          Object.values(dailyStats).sort((a, b) => a.timestamp - b.timestamp)
        );
      } catch (err) {
        console.error("🔥 Lỗi tải dữ liệu Dashboard:", err);
        message.error("Không thể tải dữ liệu Dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <div className="loading">⏳ Đang tải dữ liệu...</div>;

  return (
    <div className="dashboard">
      <h1>📊 BẢNG QUẢN TRỊ HỆ THỐNG</h1>

      {/* ==== THẺ THỐNG KÊ ==== */}
      <div className="cards">
        <div className="card purple">
          <h2>{stats.totalUsers}</h2>
          <p>Tổng người dùng</p>
        </div>
        <div className="card orange">
          <h2>{stats.totalRestaurants}</h2>
          <p>Tổng số nhà hàng</p>
        </div>
        <div className="card green">
          <h2>{stats.totalOrders}</h2>
          <p>Tổng số đơn hàng</p>
        </div>
        <div className="card blue">
          <h2>{stats.totalRevenue.toLocaleString()}₫</h2>
          <p>Tổng doanh thu</p>
        </div>
      </div>

      {/* ==== BIỂU ĐỒ ==== */}
      <div className="charts">
        <div className="chart-container">
          <h3>💰 Doanh thu theo ngày</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(v) => `${v.toLocaleString()}₫`} />
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
              <Bar
                dataKey="count"
                fill="#10b981"
                name="Số đơn hàng"
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
