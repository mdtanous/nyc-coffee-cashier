"use client";

import { useState, useEffect, useCallback } from "react";
import MetricCard from "./MetricCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  avgFulfillmentTime: number;
  hourlyData: { hour: string; revenue: number; orders: number }[];
  topItemsByQuantity: { name: string; count: number }[];
  topItemsByRevenue: { name: string; revenue: number }[];
  popularModifications: { name: string; count: number }[];
  sizeDistribution: { small: number; large: number };
}

type Period = "today" | "week" | "all";

export default function Dashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<Period>("all");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-center justify-center">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-center justify-center">
        <p className="text-gray-500">Failed to load dashboard data</p>
      </div>
    );
  }

  const totalDrinks = data.sizeDistribution.small + data.sizeDistribution.large;
  const smallPct = totalDrinks > 0 ? Math.round((data.sizeDistribution.small / totalDrinks) * 100) : 0;
  const largePct = totalDrinks > 0 ? Math.round((data.sizeDistribution.large / totalDrinks) * 100) : 0;

  return (
    <div className="min-h-[calc(100vh-57px)] bg-gray-50 p-4">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Business Dashboard</h1>
          <div className="flex rounded-lg border border-gray-200 bg-white">
            {(["today", "week", "all"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium ${
                  period === p
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                } ${p === "today" ? "rounded-l-lg" : ""} ${
                  p === "all" ? "rounded-r-lg" : ""
                }`}
              >
                {p === "all" ? "All Time" : p === "week" ? "This Week" : "Today"}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard
            title="Total Revenue"
            value={`$${data.totalRevenue.toFixed(2)}`}
          />
          <MetricCard
            title="Total Orders"
            value={data.totalOrders.toString()}
          />
          <MetricCard
            title="Avg Order Value"
            value={`$${data.avgOrderValue.toFixed(2)}`}
          />
          <MetricCard
            title="Avg Fulfillment"
            value={
              data.avgFulfillmentTime > 0
                ? `${data.avgFulfillmentTime.toFixed(1)} min`
                : "N/A"
            }
          />
        </div>

        {/* Charts Row */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Revenue by Hour */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-medium text-gray-700">
              Revenue by Hour
            </h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourlyData.filter((d) => d.revenue > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="#1f2937" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Orders by Hour */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-medium text-gray-700">
              Orders by Hour
            </h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourlyData.filter((d) => d.orders > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value) => [value, "Orders"]}
                  />
                  <Bar dataKey="orders" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Product Insights Row */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Top Items by Quantity */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-medium text-gray-700">
              Top Items (by orders)
            </h2>
            {data.topItemsByQuantity.length === 0 ? (
              <p className="text-xs text-gray-400">No data yet</p>
            ) : (
              <div className="space-y-2">
                {data.topItemsByQuantity.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{item.name}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Items by Revenue */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-medium text-gray-700">
              Top Items (by revenue)
            </h2>
            {data.topItemsByRevenue.length === 0 ? (
              <p className="text-xs text-gray-400">No data yet</p>
            ) : (
              <div className="space-y-2">
                {data.topItemsByRevenue.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{item.name}</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${item.revenue.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Popular Modifications */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-medium text-gray-700">
              Popular Modifications
            </h2>
            {data.popularModifications.length === 0 ? (
              <p className="text-xs text-gray-400">No data yet</p>
            ) : (
              <div className="space-y-2">
                {data.popularModifications.map((mod, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{mod.name}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {mod.count}x
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Size Distribution */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-gray-700">
            Size Distribution
          </h2>
          {totalDrinks === 0 ? (
            <p className="text-xs text-gray-400">No data yet</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full bg-gray-900 transition-all"
                  style={{ width: `${smallPct}%` }}
                />
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-700">
                  Small: <strong>{smallPct}%</strong>
                </span>
                <span className="text-gray-700">
                  Large: <strong>{largePct}%</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
