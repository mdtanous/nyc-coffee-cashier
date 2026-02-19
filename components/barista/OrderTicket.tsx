"use client";

import { Order, OrderItem, OrderModification, TicketStatus } from "@/lib/types";
import StatusBadge from "./StatusBadge";

interface OrderTicketProps {
  order: Order & { items: OrderItem[]; modifications: OrderModification[] };
  onUpdateStatus: (orderId: string, status: TicketStatus) => void;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatModValue(jsonStr: string): string {
  try {
    const val = JSON.parse(jsonStr);
    if (Array.isArray(val)) {
      // Syrups array
      return val.map((s: { name: string; pumps: number }) => `${s.pumps}x ${s.name}`).join(", ") || "none";
    }
    if (typeof val === "string") {
      return val.replace(/_/g, " ");
    }
    return String(val);
  } catch {
    return jsonStr;
  }
}

function formatFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    sweetness: "Sweetness",
    ice_level: "Ice",
    milk_type: "Milk",
    extra_shots: "Extra shots",
    syrups: "Syrups",
    notes: "Notes",
  };
  return labels[field] || field;
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
          {order.is_modified && (
            <span className="inline-block rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
              Modified
            </span>
          )}
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

          // Check for modifications on this item
          const itemChanges = order.modifications.filter(
            (m) => m.order_item_id === item.id && m.modification_type === "change"
          );
          const isAdded = order.modifications.some(
            (m) => m.order_item_id === item.id && m.modification_type === "add"
          );
          const hasChanges = itemChanges.length > 0;

          return (
            <div
              key={i}
              className={`text-sm ${
                hasChanges
                  ? "border-l-2 border-orange-400 pl-2"
                  : isAdded
                  ? "border-l-2 border-green-400 pl-2"
                  : ""
              }`}
            >
              <div className="font-medium text-gray-900">
                1x {sizeTemp ? `${sizeTemp} ` : ""}
                {item.item_name}
                {isAdded && (
                  <span className="ml-1.5 text-xs font-medium text-green-600">
                    Added
                  </span>
                )}
              </div>
              {mods && (
                <div className="ml-4 text-xs text-gray-500">{mods}</div>
              )}
              {hasChanges && (
                <div className="ml-4 mt-0.5 space-y-0.5">
                  {itemChanges.map((mod, j) => (
                    <div key={j} className="text-xs text-orange-600">
                      {formatFieldLabel(mod.field_name || "")}: {" "}
                      <span className="line-through text-gray-400">
                        {formatModValue(mod.old_value || "")}
                      </span>
                      {" → "}
                      <span className="font-medium">
                        {formatModValue(mod.new_value || "")}
                      </span>
                    </div>
                  ))}
                </div>
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
