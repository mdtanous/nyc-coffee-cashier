"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import { Order, OrderItem, OrderModification, TicketStatus } from "@/lib/types";
import OrderTicket from "./OrderTicket";

type OrderWithItems = Order & { items: OrderItem[]; modifications: OrderModification[] };

export default function TicketQueue() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const orderIds = ordersData.map((o) => o.id);

      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);

      if (itemsError) throw itemsError;

      const { data: modsData } = await supabase
        .from("order_modifications")
        .select("*")
        .in("order_id", orderIds);

      const ordersWithItems: OrderWithItems[] = ordersData.map((order) => ({
        ...order,
        items: (itemsData || []).filter((item) => item.order_id === order.id),
        modifications: (modsData || []).filter((mod) => mod.order_id === order.id),
      }));

      setOrders(ordersWithItems);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    // Subscribe to real-time changes on the orders table
    let channel: ReturnType<ReturnType<typeof getSupabase>["channel"]> | null = null;
    try {
      const supabase = getSupabase();
      channel = supabase
        .channel("orders-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          () => {
            fetchOrders();
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "order_items" },
          () => {
            fetchOrders();
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "order_modifications" },
          () => {
            fetchOrders();
          }
        )
        .subscribe();
    } catch {
      // Supabase not configured yet
    }

    return () => {
      if (channel) {
        try {
          getSupabase().removeChannel(channel);
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId: string, newStatus: TicketStatus) => {
    try {
      const supabase = getSupabase();
      const updateData: Record<string, string> = { status: newStatus };
      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;

      // Optimistic update
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: newStatus, completed_at: updateData.completed_at || o.completed_at }
            : o
        )
      );
    } catch (err) {
      console.error("Error updating order status:", err);
    }
  };

  // Sort: pending first, then in_progress, then completed
  const sortedOrders = [...orders].sort((a, b) => {
    const statusOrder = { pending: 0, in_progress: 1, completed: 2 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-center justify-center">
        <p className="text-gray-500">Loading orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">No orders yet</p>
          <p className="mt-1 text-sm text-gray-500">
            New orders will appear here in real-time
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-57px)] bg-gray-50 p-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Order Queue</h1>
          <span className="text-sm text-gray-500">
            {orders.filter((o) => o.status !== "completed").length} active order
            {orders.filter((o) => o.status !== "completed").length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="space-y-3">
          {sortedOrders.map((order) => (
            <OrderTicket
              key={order.id}
              order={order}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
