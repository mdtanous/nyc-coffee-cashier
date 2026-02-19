"use client";

interface ModificationReceiptProps {
  orderNumber: number;
  changes: { field: string; old_value: string; new_value: string }[];
  addedItems: { description: string; price: number }[];
  newTotal: number;
}

function formatFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    sweetness: "Sweetness",
    ice_level: "Ice level",
    milk_type: "Milk",
    extra_shots: "Extra shots",
    syrups: "Syrups",
    notes: "Notes",
  };
  return labels[field] || field;
}

function formatValue(jsonStr: string): string {
  try {
    const val = JSON.parse(jsonStr);
    if (Array.isArray(val)) {
      return (
        val
          .map((s: { name: string; pumps: number }) => `${s.pumps}x ${s.name}`)
          .join(", ") || "none"
      );
    }
    if (typeof val === "string") {
      return val.replace(/_/g, " ");
    }
    return String(val);
  } catch {
    return jsonStr;
  }
}

export default function ModificationReceipt({
  orderNumber,
  changes,
  addedItems,
  newTotal,
}: ModificationReceiptProps) {
  return (
    <div className="mb-3 flex justify-start">
      <div className="max-w-[85%] overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm">
        {/* Header */}
        <div className="bg-orange-500 px-4 py-2.5">
          <span className="text-sm font-bold text-white">
            Order #{orderNumber} — Modified
          </span>
        </div>

        {/* Changes */}
        <div className="space-y-2 px-4 py-3">
          {changes.map((c, i) => (
            <div key={i} className="text-sm text-gray-700">
              <span className="text-gray-500">{formatFieldLabel(c.field)}:</span>{" "}
              <span className="line-through text-gray-400">
                {formatValue(c.old_value)}
              </span>{" "}
              <span className="text-gray-400">&rarr;</span>{" "}
              <span className="font-medium">{formatValue(c.new_value)}</span>
            </div>
          ))}

          {addedItems.map((item, i) => (
            <div key={`add-${i}`} className="flex justify-between gap-4 text-sm">
              <div>
                <span className="font-medium text-green-600">+ </span>
                <span className="font-medium text-gray-900">
                  {item.description}
                </span>
              </div>
              <span className="whitespace-nowrap text-sm text-gray-700">
                ${item.price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Divider + Total */}
        <div className="border-t border-dashed border-orange-200 px-4 py-2.5">
          <div className="flex justify-between text-sm">
            <span className="font-bold text-gray-900">New Total</span>
            <span className="font-bold text-gray-900">
              ${newTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-orange-50 px-4 py-2 text-center">
          <span className="text-xs font-medium text-orange-700">
            Update sent to barista
          </span>
        </div>
      </div>
    </div>
  );
}
