"use client";

interface OrderItemData {
  item_name: string;
  size: string;
  temperature: string;
  milk_type: string;
  sweetness: string;
  ice_level: string;
  extra_shots: number;
  syrups: { name: string; pumps: number }[];
  item_price: number;
  modifiers_price: number;
}

interface OrderReceiptProps {
  orderNumber: number;
  totalPrice: number;
  items: OrderItemData[];
}

function itemFingerprint(item: OrderItemData): string {
  const syrupKey = item.syrups
    .map((s) => `${s.name}:${s.pumps}`)
    .sort()
    .join("|");
  return `${item.item_name}|${item.size}|${item.temperature}|${item.milk_type}|${item.sweetness}|${item.ice_level}|${item.extra_shots}|${syrupKey}`;
}

function groupItems(items: OrderItemData[]) {
  const map = new Map<
    string,
    { item: OrderItemData; quantity: number; totalPrice: number }
  >();
  for (const item of items) {
    const key = itemFingerprint(item);
    const unitPrice = item.item_price + item.modifiers_price;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += 1;
      existing.totalPrice += unitPrice;
    } else {
      map.set(key, { item, quantity: 1, totalPrice: unitPrice });
    }
  }
  return Array.from(map.values());
}

function formatSizeTemp(item: OrderItemData): string {
  if (item.temperature === "n/a") return "";
  const size = item.size === "large" ? "Lg" : "Sm";
  const temp = item.temperature === "hot" ? "Hot" : "Iced";
  return `${size} ${temp}`;
}

function formatMods(item: OrderItemData): string {
  const mods: string[] = [];
  if (
    item.milk_type &&
    item.milk_type !== "none" &&
    item.milk_type !== "whole"
  ) {
    mods.push(
      item.milk_type.charAt(0).toUpperCase() + item.milk_type.slice(1) + " milk"
    );
  }
  if (
    item.sweetness &&
    item.sweetness !== "normal" &&
    item.sweetness !== "n/a"
  ) {
    mods.push(item.sweetness.replace(/_/g, " "));
  }
  if (
    item.ice_level &&
    item.ice_level !== "normal" &&
    item.ice_level !== "n/a"
  ) {
    mods.push(item.ice_level.replace(/_/g, " "));
  }
  if (item.extra_shots > 0) {
    mods.push(`+${item.extra_shots} shot${item.extra_shots > 1 ? "s" : ""}`);
  }
  for (const syrup of item.syrups) {
    mods.push(`${syrup.pumps}x ${syrup.name}`);
  }
  return mods.join(", ");
}

export default function OrderReceipt({
  orderNumber,
  totalPrice,
  items,
}: OrderReceiptProps) {
  const grouped = groupItems(items);

  return (
    <div className="mb-3 flex justify-start">
      <div className="max-w-[85%] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div className="bg-gray-900 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">
              Order #{orderNumber}
            </span>
            <span className="text-xs text-gray-400">NYC Coffee</span>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2.5 px-4 py-3">
          {grouped.map(({ item, quantity, totalPrice: lineTotal }, i) => {
            const sizeTemp = formatSizeTemp(item);
            const mods = formatMods(item);
            return (
              <div key={i} className="flex justify-between gap-4 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-gray-900">
                    {quantity > 1 && (
                      <span className="text-gray-500">{quantity}x </span>
                    )}
                    {sizeTemp && (
                      <span className="text-gray-500">{sizeTemp} </span>
                    )}
                    {item.item_name}
                  </span>
                  {mods && (
                    <div className="mt-0.5 text-xs text-gray-400">{mods}</div>
                  )}
                </div>
                <span className="whitespace-nowrap text-sm text-gray-700">
                  ${lineTotal.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Divider + Total */}
        <div className="border-t border-dashed border-gray-200 px-4 py-2.5">
          <div className="flex justify-between text-sm">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-gray-900">
              ${totalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-green-50 px-4 py-2 text-center">
          <span className="text-xs font-medium text-green-700">
            Sent to barista
          </span>
        </div>
      </div>
    </div>
  );
}
