import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// NYC Coffee is in New York — all analytics should display in Eastern Time
const NYC_TIMEZONE = "America/New_York";

/** Extract the hour (0-23) in Eastern Time from an ISO timestamp */
function getEasternHour(isoTimestamp: string): number {
  const etHour = new Date(isoTimestamp).toLocaleString("en-US", {
    timeZone: NYC_TIMEZONE,
    hour: "numeric",
    hour12: false,
  });
  return parseInt(etHour, 10);
}

/** Get midnight Eastern Time as a UTC ISO string (for "today" filter) */
function getEasternMidnightUTC(): string {
  const now = new Date();
  const parts: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-US", {
    timeZone: NYC_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now)) {
    parts[p.type] = p.value;
  }
  const secsSinceMidnight =
    parseInt(parts.hour) * 3600 +
    parseInt(parts.minute) * 60 +
    parseInt(parts.second);
  return new Date(now.getTime() - secsSinceMidnight * 1000).toISOString();
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "all";

    // Calculate date filter
    let dateFilter: string | null = null;
    const now = new Date();
    if (period === "today") {
      dateFilter = getEasternMidnightUTC();
    } else if (period === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = weekAgo.toISOString();
    }

    // Fetch orders
    let ordersQuery = supabase.from("orders").select("*");
    if (dateFilter) {
      ordersQuery = ordersQuery.gte("created_at", dateFilter);
    }
    const { data: orders, error: ordersError } = await ordersQuery;
    if (ordersError) throw ordersError;

    // Fetch order items
    let itemsQuery = supabase.from("order_items").select("*");
    if (dateFilter) {
      itemsQuery = itemsQuery.gte("created_at", dateFilter);
    }
    const { data: items, error: itemsError } = await itemsQuery;
    if (itemsError) throw itemsError;

    const allOrders = orders || [];
    const allItems = items || [];

    // --- Tier 1: Revenue Metrics ---
    const totalRevenue = allOrders.reduce(
      (sum, o) => sum + Number(o.total_price),
      0
    );
    const totalOrders = allOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Revenue by hour
    const revenueByHour: Record<number, number> = {};
    const ordersByHour: Record<number, number> = {};
    for (let h = 0; h < 24; h++) {
      revenueByHour[h] = 0;
      ordersByHour[h] = 0;
    }
    for (const order of allOrders) {
      const hour = getEasternHour(order.created_at);
      revenueByHour[hour] += Number(order.total_price);
      ordersByHour[hour] += 1;
    }

    const hourlyData = Object.keys(revenueByHour).map((h) => ({
      hour: `${Number(h) % 12 || 12}${Number(h) < 12 ? "AM" : "PM"}`,
      revenue: Math.round(revenueByHour[Number(h)] * 100) / 100,
      orders: ordersByHour[Number(h)],
    }));

    // --- Tier 2: Operations Metrics ---
    const completedOrders = allOrders.filter((o) => o.status === "completed");
    let avgFulfillmentTime = 0;
    if (completedOrders.length > 0) {
      const totalTime = completedOrders.reduce((sum, o) => {
        if (o.completed_at) {
          const diff =
            new Date(o.completed_at).getTime() -
            new Date(o.created_at).getTime();
          return sum + diff / 1000 / 60; // minutes
        }
        return sum;
      }, 0);
      avgFulfillmentTime = totalTime / completedOrders.length;
    }

    // --- Tier 3: Product Insights ---
    // Top items by quantity
    const itemCounts: Record<string, { count: number; revenue: number }> = {};
    for (const item of allItems) {
      const name = item.item_name;
      if (!itemCounts[name]) {
        itemCounts[name] = { count: 0, revenue: 0 };
      }
      itemCounts[name].count += 1;
      itemCounts[name].revenue += Number(item.item_price) + Number(item.modifiers_price);
    }

    const topItemsByQuantity = Object.entries(itemCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data]) => ({ name, count: data.count }));

    const topItemsByRevenue = Object.entries(itemCounts)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([name, data]) => ({
        name,
        revenue: Math.round(data.revenue * 100) / 100,
      }));

    // Popular modifications
    const modCounts: Record<string, number> = {};
    for (const item of allItems) {
      if (item.milk_type && item.milk_type !== "none" && item.milk_type !== "whole") {
        const mod = item.milk_type.charAt(0).toUpperCase() + item.milk_type.slice(1) + " milk";
        modCounts[mod] = (modCounts[mod] || 0) + 1;
      }
      if (item.extra_shots > 0) {
        modCounts["Extra shots"] = (modCounts["Extra shots"] || 0) + item.extra_shots;
      }
      if (item.syrups && Array.isArray(item.syrups)) {
        for (const syrup of item.syrups) {
          modCounts[syrup.name] = (modCounts[syrup.name] || 0) + syrup.pumps;
        }
      }
      if (item.sweetness && item.sweetness !== "normal" && item.sweetness !== "n/a") {
        const label = item.sweetness.replace(/_/g, " ");
        modCounts[label] = (modCounts[label] || 0) + 1;
      }
    }

    const popularModifications = Object.entries(modCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Size distribution
    const drinkItems = allItems.filter(
      (item) => item.temperature !== "n/a"
    );
    const smallCount = drinkItems.filter((i) => i.size === "small").length;
    const largeCount = drinkItems.filter((i) => i.size === "large").length;

    return NextResponse.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      avgFulfillmentTime: Math.round(avgFulfillmentTime * 10) / 10,
      hourlyData,
      topItemsByQuantity,
      topItemsByRevenue,
      popularModifications,
      sizeDistribution: {
        small: smallCount,
        large: largeCount,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
