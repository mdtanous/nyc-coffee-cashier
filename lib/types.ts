export interface Order {
  id: string;
  order_number: number;
  status: "pending" | "in_progress" | "completed";
  total_price: number;
  is_modified: boolean;
  created_at: string;
  completed_at: string | null;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_name: string;
  size: "small" | "large";
  temperature: "hot" | "iced" | "n/a";
  milk_type: "whole" | "skim" | "oat" | "almond" | "none" | null;
  sweetness: "no_sugar" | "less_sugar" | "normal" | "extra_sugar" | "n/a" | null;
  ice_level: "no_ice" | "less_ice" | "normal" | "extra_ice" | "n/a" | null;
  extra_shots: number;
  syrups: Syrup[];
  item_price: number;
  modifiers_price: number;
  notes: string | null;
  created_at: string;
}

export interface Syrup {
  name: string;
  pumps: number;
}

export interface MenuItem {
  name: string;
  category: "coffee" | "tea" | "pastry";
  prices: {
    small: number;
    large: number;
  };
  canBeHot: boolean;
  canBeIced: boolean;
  hasMilk: boolean;
  canAddEspresso: boolean;
  canAddMatcha: boolean;
  canCustomize: boolean;
}

export interface AddOn {
  name: string;
  price: number;
  type: "milk" | "shot" | "syrup";
}

export interface OrderModification {
  id: string;
  order_id: string;
  order_item_id: string | null;
  modification_type: "change" | "add";
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  item_description: string | null;
  modified_at: string;
}

export type TicketStatus = "pending" | "in_progress" | "completed";
