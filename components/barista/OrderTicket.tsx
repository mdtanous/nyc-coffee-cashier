"use client";

import { Order, OrderItem, TicketStatus } from "@/lib/types";
import StatusBadge from "./StatusBadge";

interface OrderTicketProps {
  order: Order & { items: OrderItem[] };
  onUpdateStatus: (orderId: string, status: TicketStatus) => void;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatModifications(item: OrderItem): string {
  const mods: string[] = [];

  if (item.milk_type && item.milk_type !== "none" && item.milk_type !== "whole") {
    mods.push(item.milk_type.charAt(0).toUpperCase() + item.milk_type.slice(1) + " milk");
  }
  if (item.sweetness && item.sweetness !== "normal" && item.sweetness !== "n/a") {
    mods.push(item.sweetness.replace(/_/g, " "));
  }
  if (item.ice_level && item.ice_level !== "normal" && item.ice_level !== "n/a") {
    mods.push(item.ice_level.replace(/_/g, " "));
  }
  if (item.extra_shots > 0) {
    mods.push(`+${item.extra_shots} extra shot${item.extra_shots > 1 ? "s" : ""}`);
  }
  if (item.syrups && item.syrups.length > 0) {
    for (const syrup of item.syrups) {
      mods.push(`${syrup.pumps}x ${syrup.name}`);
    }
  }

  return mods.join(", ");
}

export default function OrderTicket({ order, onUpdateStatus }: OrderTicketProps) {
  const isCompleted = order.status === "completed";

  return (
    <div
      className={`rounded-lg border p-4 ${
        isCompleted
          ? "border-gray-200 bg-gray-50 opacity-60"
          : order.status === "in_progress"
          ? "border-blue-300 bg-blue-50"
          : "border-gray-200 bg-white"
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">
            Order #{order.order_number}
          </span>
          <StatusBadge status={order.status} />
        </div>
        <span className="text-xs text-gray-500">
          {formatTime(order.created_at)}
        </span>
      </div>

      {/* Items */}
      <div className="mb-3 space-y-2">
        {order.items.map((item, i) => {
          const mods = formatModifications(item);
          const sizeTemp =
            item.temperature === "n/a"
              ? ""
              : `${item.size === "large" ? "Large" : "Small"} ${
                  item.temperature === "hot" ? "Hot" : "Iced"
                }`;

          return (
            <div key={i} className="text-sm">
              <div className="font-medium text-gray-900">
                1x {sizeTemp ? `${sizeTemp} ` : ""}
                {item.item_name}
              </div>
              {mods && (
                <div className="ml-4 text-xs text-gray-500">{mods}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="text-sm font-medium text-gray-700">
          Total: ${Number(order.total_price).toFixed(2)}
        </span>

        {!isCompleted && (
          <div className="flex gap-2">
            {order.status === "pending" && (
              <button
                onClick={() => onUpdateStatus(order.id, "in_progress")}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                Start Making
              </button>
            )}
            {order.status === "in_progress" && (
              <button
                onClick={() => onUpdateStatus(order.id, "completed")}
                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
              >
                Complete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
