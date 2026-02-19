import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import {
  SYSTEM_PROMPT,
  ORDER_FUNCTION,
  LOOKUP_ORDER_FUNCTION,
  MODIFY_ORDER_FUNCTION,
} from "@/lib/prompts";
import {
  calculateItemPrice,
  calculateOrderTotal,
} from "@/lib/price-calculator";
import { getSupabase } from "@/lib/supabase";
import { validateModification, canAddItems } from "@/lib/modification-rules";

// All available functions for OpenAI
const ALL_FUNCTIONS = [ORDER_FUNCTION, LOOKUP_ORDER_FUNCTION, MODIFY_ORDER_FUNCTION];

// ---------- Types ----------

type ItemInput = {
  item_name: string;
  size: "small" | "large";
  temperature: "hot" | "iced" | "n/a";
  milk_type: "whole" | "skim" | "oat" | "almond" | "none";
  sweetness: string;
  ice_level: string;
  extra_shots: number;
  syrups: { name: string; pumps: number }[];
};

type ItemWithPrices = ItemInput & { item_price: number; modifiers_price: number };

type ReceiptItem = ItemWithPrices;

// ---------- Helpers ----------

function itemFingerprint(item: ReceiptItem): string {
  const syrupKey = item.syrups
    .map((s) => `${s.name}:${s.pumps}`)
    .sort()
    .join("|");
  return `${item.item_name}|${item.size}|${item.temperature}|${item.milk_type}|${item.sweetness}|${item.ice_level}|${item.extra_shots}|${syrupKey}`;
}

function buildReceiptText(
  orderNumber: number,
  items: ReceiptItem[],
  totalPrice: number
): string {
  const groupedMap = new Map<
    string,
    { item: ReceiptItem; quantity: number; totalPrice: number }
  >();
  for (const item of items) {
    const key = itemFingerprint(item);
    const unitPrice = item.item_price + item.modifiers_price;
    const existing = groupedMap.get(key);
    if (existing) {
      existing.quantity += 1;
      existing.totalPrice += unitPrice;
    } else {
      groupedMap.set(key, { item, quantity: 1, totalPrice: unitPrice });
    }
  }

  const receiptLines = Array.from(groupedMap.values()).map(
    ({ item, quantity, totalPrice: lineTotal }) => {
      const mods: string[] = [];
      if (item.size) mods.push(item.size === "large" ? "Large" : "Small");
      if (item.temperature && item.temperature !== "n/a")
        mods.push(item.temperature === "hot" ? "Hot" : "Iced");
      if (item.milk_type && item.milk_type !== "none" && item.milk_type !== "whole")
        mods.push(
          item.milk_type.charAt(0).toUpperCase() + item.milk_type.slice(1) + " milk"
        );
      if (item.sweetness && item.sweetness !== "normal" && item.sweetness !== "n/a")
        mods.push(item.sweetness.replace("_", " "));
      if (item.ice_level && item.ice_level !== "normal" && item.ice_level !== "n/a")
        mods.push(item.ice_level.replace("_", " "));
      if (item.extra_shots > 0)
        mods.push(`+${item.extra_shots} extra shot${item.extra_shots > 1 ? "s" : ""}`);
      for (const syrup of item.syrups) {
        mods.push(`${syrup.pumps}x ${syrup.name}`);
      }

      const prefix = quantity > 1 ? `${quantity}x ` : "";
      const modsStr = mods.length > 0 ? ` (${mods.join(", ")})` : "";
      return `- ${prefix}${item.item_name}${modsStr}: $${lineTotal.toFixed(2)}`;
    }
  );

  return `Order confirmed! Here's your receipt:\n\n**Order #${orderNumber}**\n${receiptLines.join("\n")}\n\n**Total: $${totalPrice.toFixed(2)}**\n\nYour order has been sent to the barista. Thanks for ordering at NYC Coffee!`;
}

function priceItems(items: ItemInput[]): ItemWithPrices[] {
  return items.map((item) => {
    const { item_price, modifiers_price } = calculateItemPrice(item);
    return { ...item, item_price, modifiers_price };
  });
}

function describeItem(item: { item_name: string; size: string; temperature: string }): string {
  const size = item.size === "large" ? "Large" : "Small";
  const temp =
    item.temperature === "n/a"
      ? ""
      : item.temperature === "hot"
      ? " Hot"
      : " Iced";
  return `${size}${temp} ${item.item_name}`;
}

// ---------- Function call follow-up ----------

async function getFollowUpResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assistantMessage: any,
  functionName: string,
  functionResult: unknown
) {
  const followUp = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
      assistantMessage,
      {
        role: "function",
        name: functionName,
        content: JSON.stringify(functionResult),
      },
    ],
    functions: ALL_FUNCTIONS,
    function_call: "none", // Don't allow another function call in the follow-up
    temperature: 0.7,
    max_tokens: 1024,
  });
  return followUp.choices[0].message;
}

// ---------- Handler: submit_order ----------

async function handleSubmitOrder(functionArgs: { items: ItemInput[] }) {
  const itemsWithPrices = priceItems(functionArgs.items);
  const total_price = calculateOrderTotal(itemsWithPrices);

  const { data: order, error: orderError } = await getSupabase()
    .from("orders")
    .insert({ status: "pending", total_price })
    .select()
    .single();

  if (orderError) {
    console.error("Error creating order:", orderError);
    return {
      response: {
        role: "assistant",
        content:
          "I'm sorry, there was an issue submitting your order. Could you try again?",
      },
    };
  }

  const orderItems = itemsWithPrices.map((item) => ({
    order_id: order.id,
    item_name: item.item_name,
    size: item.size,
    temperature: item.temperature,
    milk_type: item.milk_type,
    sweetness: item.sweetness,
    ice_level: item.ice_level,
    extra_shots: item.extra_shots,
    syrups: item.syrups,
    item_price: item.item_price,
    modifiers_price: item.modifiers_price,
  }));

  const { error: itemsError } = await getSupabase()
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error("Error creating order items:", itemsError);
  }

  const receipt = buildReceiptText(order.order_number, itemsWithPrices, total_price);

  return {
    response: {
      role: "assistant",
      content: receipt,
      order: {
        id: order.id,
        order_number: order.order_number,
        total_price,
        items: itemsWithPrices,
      },
    },
  };
}

// ---------- Handler: lookup_order ----------

async function handleLookupOrder(functionArgs: {
  order_number?: number;
  item_name?: string;
}) {
  const supabase = getSupabase();

  if (functionArgs.order_number) {
    // Look up by order number
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("order_number", functionArgs.order_number)
      .in("status", ["pending", "in_progress"])
      .single();

    if (error || !order) {
      return {
        functionResult: {
          not_found: true,
          message: `No active order found with number ${functionArgs.order_number}. It may have already been completed.`,
        },
      };
    }

    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    return {
      functionResult: {
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          total_price: Number(order.total_price),
          created_at: order.created_at,
          items: (items || []).map(
            (item: {
              id: string;
              item_name: string;
              size: string;
              temperature: string;
              milk_type: string;
              sweetness: string;
              ice_level: string;
              extra_shots: number;
              syrups: { name: string; pumps: number }[];
              item_price: string | number;
              modifiers_price: string | number;
              notes: string | null;
            }) => ({
              id: item.id,
              item_name: item.item_name,
              size: item.size,
              temperature: item.temperature,
              milk_type: item.milk_type,
              sweetness: item.sweetness,
              ice_level: item.ice_level,
              extra_shots: item.extra_shots,
              syrups: item.syrups,
              item_price: Number(item.item_price),
              modifiers_price: Number(item.modifiers_price),
              notes: item.notes,
            })
          ),
        },
      },
    };
  }

  if (functionArgs.item_name) {
    // Search by item name across non-completed orders
    const { data: matchingItems, error } = await supabase
      .from("order_items")
      .select("order_id, item_name, orders!inner(id, order_number, status, total_price, created_at)")
      .ilike("item_name", `%${functionArgs.item_name}%`);

    if (error) {
      console.error("Error looking up by item name:", error);
      return {
        functionResult: { not_found: true, message: "Error searching for orders." },
      };
    }

    // Filter to non-completed orders
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeMatches = (matchingItems || []).filter((m: any) => {
      const orderData = Array.isArray(m.orders) ? m.orders[0] : m.orders;
      return orderData && (orderData.status === "pending" || orderData.status === "in_progress");
    });

    if (activeMatches.length === 0) {
      return {
        functionResult: {
          not_found: true,
          message: `No active orders found containing "${functionArgs.item_name}".`,
        },
      };
    }

    // Get distinct order IDs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const distinctOrders = new Map<string, any>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const match of activeMatches as any[]) {
      const orderData = Array.isArray(match.orders) ? match.orders[0] : match.orders;
      if (orderData && !distinctOrders.has(orderData.id)) {
        distinctOrders.set(orderData.id, orderData);
      }
    }

    if (distinctOrders.size > 1) {
      // Multiple orders match — ask customer to clarify
      const orderSummaries = Array.from(distinctOrders.values()).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (o: any) => ({
          order_number: o.order_number,
          status: o.status,
          total_price: Number(o.total_price),
        })
      );
      return {
        functionResult: {
          ambiguous: true,
          message: `Found multiple active orders containing "${functionArgs.item_name}". Please ask the customer for their order number.`,
          matching_orders: orderSummaries,
        },
      };
    }

    // Exactly one order — fetch full details
    const orderId = Array.from(distinctOrders.keys())[0];
    const orderData = distinctOrders.get(orderId);

    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    return {
      functionResult: {
        order: {
          id: orderId,
          order_number: orderData.order_number,
          status: orderData.status,
          total_price: Number(orderData.total_price),
          created_at: orderData.created_at,
          items: (items || []).map(
            (item: {
              id: string;
              item_name: string;
              size: string;
              temperature: string;
              milk_type: string;
              sweetness: string;
              ice_level: string;
              extra_shots: number;
              syrups: { name: string; pumps: number }[];
              item_price: string | number;
              modifiers_price: string | number;
              notes: string | null;
            }) => ({
              id: item.id,
              item_name: item.item_name,
              size: item.size,
              temperature: item.temperature,
              milk_type: item.milk_type,
              sweetness: item.sweetness,
              ice_level: item.ice_level,
              extra_shots: item.extra_shots,
              syrups: item.syrups,
              item_price: Number(item.item_price),
              modifiers_price: Number(item.modifiers_price),
              notes: item.notes,
            })
          ),
        },
      },
    };
  }

  return {
    functionResult: {
      not_found: true,
      message: "Please provide either an order number or an item name to look up.",
    },
  };
}

// ---------- Handler: modify_order ----------

interface ItemModification {
  order_item_id: string;
  sweetness?: string;
  ice_level?: string;
  milk_type?: string;
  extra_shots?: number;
  syrups?: { name: string; pumps: number }[];
  notes?: string;
}

async function handleModifyOrder(functionArgs: {
  order_id: string;
  item_modifications?: ItemModification[];
  add_items?: ItemInput[];
}) {
  const supabase = getSupabase();

  // 1. Fetch order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", functionArgs.order_id)
    .single();

  if (orderError || !order) {
    return { functionResult: { success: false, error: "Order not found." } };
  }

  if (order.status === "completed") {
    return {
      functionResult: {
        success: false,
        error: "This order has already been completed and cannot be modified.",
      },
    };
  }

  const orderStatus = order.status as "pending" | "in_progress";

  // 2. Fetch current items
  const { data: currentItems, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", functionArgs.order_id);

  if (itemsError || !currentItems) {
    return { functionResult: { success: false, error: "Could not fetch order items." } };
  }

  const modifications: {
    order_id: string;
    order_item_id: string;
    modification_type: "change";
    field_name: string;
    old_value: string;
    new_value: string;
  }[] = [];
  const rejections: string[] = [];
  const appliedChanges: { field: string; old_value: string; new_value: string }[] = [];

  // 3. Process item modifications
  if (functionArgs.item_modifications) {
    for (const itemMod of functionArgs.item_modifications) {
      const currentItem = currentItems.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (i: any) => i.id === itemMod.order_item_id
      );
      if (!currentItem) {
        rejections.push(`Item not found: ${itemMod.order_item_id}`);
        continue;
      }

      const modifiableFields = [
        "sweetness",
        "ice_level",
        "milk_type",
        "extra_shots",
        "syrups",
        "notes",
      ];

      const updateFields: Record<string, unknown> = {};

      for (const field of modifiableFields) {
        const newValue = (itemMod as unknown as Record<string, unknown>)[field];
        if (newValue === undefined) continue;

        const oldValue = currentItem[field];

        // Skip if no actual change
        if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;

        const validation = validateModification(
          field,
          orderStatus,
          oldValue,
          newValue
        );

        if (!validation.allowed) {
          rejections.push(validation.reason || `Cannot change ${field}.`);
          continue;
        }

        modifications.push({
          order_id: functionArgs.order_id,
          order_item_id: itemMod.order_item_id,
          modification_type: "change",
          field_name: field,
          old_value: JSON.stringify(oldValue),
          new_value: JSON.stringify(newValue),
        });

        updateFields[field] = newValue;
        appliedChanges.push({
          field,
          old_value: JSON.stringify(oldValue),
          new_value: JSON.stringify(newValue),
        });
      }

      // Apply updates to the item
      if (Object.keys(updateFields).length > 0) {
        // Merge with current item for price recalculation
        const mergedItem = { ...currentItem, ...updateFields };
        const { item_price, modifiers_price } = calculateItemPrice(mergedItem as ItemInput);
        updateFields.item_price = item_price;
        updateFields.modifiers_price = modifiers_price;

        await supabase
          .from("order_items")
          .update(updateFields)
          .eq("id", itemMod.order_item_id);
      }
    }
  }

  // 4. Process add items
  const addedItems: { description: string; price: number }[] = [];

  if (functionArgs.add_items && functionArgs.add_items.length > 0) {
    if (!canAddItems(orderStatus)) {
      rejections.push("Cannot add items to this order in its current state.");
    } else {
      const newItemsWithPrices = priceItems(functionArgs.add_items);

      const newOrderItems = newItemsWithPrices.map((item) => ({
        order_id: functionArgs.order_id,
        item_name: item.item_name,
        size: item.size,
        temperature: item.temperature,
        milk_type: item.milk_type,
        sweetness: item.sweetness,
        ice_level: item.ice_level,
        extra_shots: item.extra_shots,
        syrups: item.syrups,
        item_price: item.item_price,
        modifiers_price: item.modifiers_price,
      }));

      const { data: insertedItems, error: insertError } = await supabase
        .from("order_items")
        .insert(newOrderItems)
        .select();

      if (insertError) {
        console.error("Error adding items:", insertError);
        rejections.push("Failed to add new items to the order.");
      } else if (insertedItems) {
        // Record add modifications
        for (let i = 0; i < insertedItems.length; i++) {
          const desc = describeItem(newItemsWithPrices[i]);
          const price = newItemsWithPrices[i].item_price + newItemsWithPrices[i].modifiers_price;

          await supabase.from("order_modifications").insert({
            order_id: functionArgs.order_id,
            order_item_id: insertedItems[i].id,
            modification_type: "add",
            item_description: desc,
          });

          addedItems.push({ description: desc, price });
        }
      }
    }
  }

  // 5. Insert change modification records
  if (modifications.length > 0) {
    await supabase.from("order_modifications").insert(modifications);
  }

  // 6. Recalculate order total
  const { data: updatedItems } = await supabase
    .from("order_items")
    .select("item_price, modifiers_price")
    .eq("order_id", functionArgs.order_id);

  const newTotal = calculateOrderTotal(
    (updatedItems || []).map((i: { item_price: string | number; modifiers_price: string | number }) => ({
      item_price: Number(i.item_price),
      modifiers_price: Number(i.modifiers_price),
    }))
  );

  // 7. Update order
  const hasChanges = modifications.length > 0 || addedItems.length > 0;
  if (hasChanges) {
    await supabase
      .from("orders")
      .update({ total_price: newTotal, is_modified: true })
      .eq("id", functionArgs.order_id);
  }

  return {
    functionResult: {
      success: hasChanges,
      modifications_applied: modifications.length,
      items_added: addedItems.length,
      added_items: addedItems,
      rejections: rejections.length > 0 ? rejections : undefined,
      new_total: newTotal,
      order_number: order.order_number,
    },
    modification:
      hasChanges
        ? {
            order_number: order.order_number,
            changes: appliedChanges,
            added_items: addedItems,
            new_total: newTotal,
          }
        : undefined,
  };
}

// ---------- Main POST handler ----------

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      functions: ALL_FUNCTIONS,
      function_call: "auto",
      temperature: 0.7,
      max_tokens: 1024,
    });

    const assistantMessage = response.choices[0].message;

    // No function call — regular chat response
    if (!assistantMessage.function_call) {
      return NextResponse.json({
        role: "assistant",
        content: assistantMessage.content,
      });
    }

    const functionName = assistantMessage.function_call.name;
    const functionArgs = JSON.parse(assistantMessage.function_call.arguments);

    // ---------- submit_order ----------
    if (functionName === "submit_order") {
      const result = await handleSubmitOrder(functionArgs);
      return NextResponse.json(result.response);
    }

    // ---------- lookup_order ----------
    if (functionName === "lookup_order") {
      const { functionResult } = await handleLookupOrder(functionArgs);

      // Feed result back to OpenAI for natural language summary
      const followUpMessage = await getFollowUpResponse(
        messages,
        assistantMessage,
        "lookup_order",
        functionResult
      );

      return NextResponse.json({
        role: "assistant",
        content: followUpMessage.content,
      });
    }

    // ---------- modify_order ----------
    if (functionName === "modify_order") {
      const { functionResult, modification } = await handleModifyOrder(functionArgs);

      // Feed result back to OpenAI for natural language confirmation
      const followUpMessage = await getFollowUpResponse(
        messages,
        assistantMessage,
        "modify_order",
        functionResult
      );

      return NextResponse.json({
        role: "assistant",
        content: followUpMessage.content,
        ...(modification && { modification }),
      });
    }

    // Unknown function call — return the assistant message as-is
    return NextResponse.json({
      role: "assistant",
      content: assistantMessage.content || "I'm not sure how to handle that request.",
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
