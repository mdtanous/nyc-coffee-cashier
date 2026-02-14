import { MENU_ITEMS, ADD_ONS } from "./menu";

interface OrderItemInput {
  item_name: string;
  size: "small" | "large";
  temperature: "hot" | "iced" | "n/a";
  milk_type: "whole" | "skim" | "oat" | "almond" | "none";
  sweetness: string;
  ice_level: string;
  extra_shots: number;
  syrups: { name: string; pumps: number }[];
}

export function calculateItemPrice(item: OrderItemInput): {
  item_price: number;
  modifiers_price: number;
} {
  const menuItem = MENU_ITEMS.find(
    (m) => m.name.toLowerCase() === item.item_name.toLowerCase()
  );

  if (!menuItem) {
    return { item_price: 0, modifiers_price: 0 };
  }

  const item_price = menuItem.prices[item.size] || menuItem.prices.small;

  let modifiers_price = 0;

  // Milk substitution cost
  if (item.milk_type === "oat") {
    const addon = ADD_ONS.find((a) => a.name === "Oat Milk");
    if (addon) modifiers_price += addon.price;
  } else if (item.milk_type === "almond") {
    const addon = ADD_ONS.find((a) => a.name === "Almond Milk");
    if (addon) modifiers_price += addon.price;
  }

  // Extra shots
  if (item.extra_shots > 0) {
    const shotAddon = menuItem.canAddMatcha
      ? ADD_ONS.find((a) => a.name === "Extra Matcha Shot")
      : ADD_ONS.find((a) => a.name === "Extra Espresso Shot");
    if (shotAddon) {
      modifiers_price += shotAddon.price * item.extra_shots;
    }
  }

  // Syrups
  for (const syrup of item.syrups) {
    const syrupAddon = ADD_ONS.find((a) =>
      a.name.toLowerCase().includes(syrup.name.toLowerCase().replace(" syrup", ""))
    );
    if (syrupAddon) {
      modifiers_price += syrupAddon.price * syrup.pumps;
    }
  }

  return { item_price, modifiers_price };
}

export function calculateOrderTotal(
  items: { item_price: number; modifiers_price: number }[]
): number {
  return items.reduce(
    (sum, item) => sum + item.item_price + item.modifiers_price,
    0
  );
}
