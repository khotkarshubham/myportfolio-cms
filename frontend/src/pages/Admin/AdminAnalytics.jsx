import { useEffect, useState } from "react";
import API from "../../services/api";
import { io } from "socket.io-client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function AdminAnalytics() {

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(0);

  /* ---------------- LOAD ALL DATA ---------------- */

  const loadData = async () => {
    try {
      const res = await API.get("/admin/analytics", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`
        }
      });

      setStats(res.data);

    } catch (err) {
      console.error("Analytics error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- SOCKET ---------------- */

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL.replace("/api", ""));

    socket.on("liveUsers", (count) => {
      setLive(count);
    });

    return () => socket.disconnect();
  }, []);

  /* ---------------- INITIAL LOAD ---------------- */

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !stats) {
    return (
      <div className="text-center text-gray-400 mt-10 animate-pulse">
        Loading analytics...
      </div>
    );
  }

  const chartData = stats.chart || [];

  /* ---------------- CARD ---------------- */

  const Card = ({ title, value, icon }) => (
    <div className="
      bg-tech-card border border-gray-700
      p-5 rounded-xl shadow-lg
      hover:border-tech-accent hover:shadow-tech-accent/20
      transition
    ">
      <div className="flex justify-between mb-2">
        <h3 className="text-gray-400 text-sm">{title}</h3>
        <span className="text-xl">{icon}</span>
      </div>

      <p className="text-2xl sm:text-3xl font-bold text-tech-accent">
        {value}
      </p>
    </div>
  );

  return (

    <div className="space-y-6 sm:space-y-8">

      <h2 className="text-2xl sm:text-3xl font-bold text-tech-accent">
        Analytics Dashboard 📊
      </h2>

      {/* 🔥 STATS */}

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <Card title="Visits" value={stats.totalVisits} icon="👀" />
        <Card title="Users" value={stats.uniqueVisitors} icon="🧑‍💻" />
        <Card title="Resume" value={stats.resumeClicks} icon="📄" />
        <Card title="Live" value={live} icon="🔥" />

      </div>

      {/* 📊 CHART */}

      <div className="bg-tech-card border border-gray-700 p-4 sm:p-6 rounded-xl">
        <h3 className="text-tech-accent mb-4">Last 7 Days</h3>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <XAxis dataKey="_id" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="visits" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 🔥 HEATMAP */}

      <div className="bg-tech-card p-4 sm:p-6 rounded-xl">
        <h3 className="text-tech-accent mb-4">Activity Heatmap</h3>

        <div className="grid grid-cols-7 gap-2">
          {chartData.map((d, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded"
              style={{
                backgroundColor:
                  d.visits > 10 ? "#22c55e" :
                  d.visits > 5 ? "#4ade80" :
                  d.visits > 2 ? "#86efac" :
                  "#1e293b"
              }}
            />
          ))}
        </div>
      </div>

      {/* 🌍 COUNTRIES + TOP PAGES */}

      <div className="grid md:grid-cols-2 gap-4">

        {/* COUNTRIES */}

        <div className="bg-tech-card p-4 sm:p-6 rounded-xl">
          <h3 className="text-tech-accent mb-4">Top Countries 🌍</h3>

          {stats.countries?.map((c, i) => (
            <div key={i} className="flex justify-between text-sm text-gray-300 py-1">
              <span>{c._id}</span>
              <span>{c.count}</span>
            </div>
          ))}
        </div>

        {/* TOP PAGES */}

        <div className="bg-tech-card p-4 sm:p-6 rounded-xl">
          <h3 className="text-tech-accent mb-4">Top Pages 🚀</h3>

          {stats.topPages?.map((p, i) => (
            <div key={i} className="flex justify-between text-sm text-gray-300 py-1">
              <span>{p._id}</span>
              <span>{p.count}</span>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}