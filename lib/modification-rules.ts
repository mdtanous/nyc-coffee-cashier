/**
 * Modification rules for order items.
 *
 * Low-effort changes (barista can adjust without remaking) are allowed.
 * Changes that require remaking the drink are rejected.
 * Items can be ADDED to any non-completed order.
 * Items can NOT be removed (inventory loss — ingredients already pulled/prepped).
 */

// Fields that ALWAYS require remaking the drink
const REMAKE_FIELDS = ["item_name", "temperature", "size"];

// Fields that can only change on pending orders (not in_progress)
const PENDING_ONLY_FIELDS = ["milk_type"];

export interface ModificationValidation {
  allowed: boolean;
  reason?: string;
}

/**
 * Validate whether a single field change is allowed based on order status.
 */
export function validateModification(
  fieldName: string,
  orderStatus: "pending" | "in_progress",
  oldValue: unknown,
  newValue: unknown
): ModificationValidation {
  // Remake-required fields are always rejected
  if (REMAKE_FIELDS.includes(fieldName)) {
    const label = fieldName.replace("_", " ");
    return {
      allowed: false,
      reason: `Changing the ${label} requires remaking the drink. Please place a new order instead.`,
    };
  }

  // Milk type can only change on pending orders (milk already steamed if in_progress)
  if (PENDING_ONLY_FIELDS.includes(fieldName) && orderStatus === "in_progress") {
    return {
      allowed: false,
      reason: `Can't change the milk type — the drink is already being made with the current milk.`,
    };
  }

  // Extra shots: can add but not remove if in_progress (shots already pulled)
  if (fieldName === "extra_shots" && orderStatus === "in_progress") {
    if (Number(newValue) < Number(oldValue)) {
      return {
        allowed: false,
        reason: `Can't remove espresso shots — they've already been pulled.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Adding new items is always allowed on non-completed orders.
 */
export function canAddItems(
  orderStatus: "pending" | "in_progress"
): boolean {
  return orderStatus === "pending" || orderStatus === "in_progress";
}
