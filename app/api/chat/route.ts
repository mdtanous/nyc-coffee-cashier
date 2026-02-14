import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { SYSTEM_PROMPT, ORDER_FUNCTION } from "@/lib/prompts";
import { calculateItemPrice, calculateOrderTotal } from "@/lib/price-calculator";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      functions: [ORDER_FUNCTION],
      function_call: "auto",
      temperature: 0.7,
      max_tokens: 1024,
    });

    const assistantMessage = response.choices[0].message;

    // Check if the AI wants to call the submit_order function
    if (
      assistantMessage.function_call &&
      assistantMessage.function_call.name === "submit_order"
    ) {
      const functionArgs = JSON.parse(
        assistantMessage.function_call.arguments
      );

      // Calculate prices for each item
      const itemsWithPrices = functionArgs.items.map(
        (item: {
          item_name: string;
          size: "small" | "large";
          temperature: "hot" | "iced" | "n/a";
          milk_type: "whole" | "skim" | "oat" | "almond" | "none";
          sweetness: string;
          ice_level: string;
          extra_shots: number;
          syrups: { name: string; pumps: number }[];
        }) => {
          const { item_price, modifiers_price } = calculateItemPrice(item);
          return { ...item, item_price, modifiers_price };
        }
      );

      const total_price = calculateOrderTotal(itemsWithPrices);

      // Save order to Supabase
      const { data: order, error: orderError } = await getSupabase()
        .from("orders")
        .insert({ status: "pending", total_price })
        .select()
        .single();

      if (orderError) {
        console.error("Error creating order:", orderError);
        return NextResponse.json({
          role: "assistant",
          content:
            "I'm sorry, there was an issue submitting your order. Could you try again?",
        });
      }

      // Save order items
      const orderItems = itemsWithPrices.map(
        (item: {
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
        }) => ({
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
        })
      );

      const { error: itemsError } = await getSupabase()
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("Error creating order items:", itemsError);
      }

      // Build receipt
      const receiptLines = itemsWithPrices.map(
        (item: {
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
        }) => {
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

          const itemTotal = item.item_price + item.modifiers_price;
          const modsStr = mods.length > 0 ? ` (${mods.join(", ")})` : "";
          return `- ${item.item_name}${modsStr}: $${itemTotal.toFixed(2)}`;
        }
      );

      const receipt = `Order confirmed! Here's your receipt:\n\n**Order #${order.order_number}**\n${receiptLines.join("\n")}\n\n**Total: $${total_price.toFixed(2)}**\n\nYour order has been sent to the barista. Thanks for ordering at NYC Coffee!`;

      return NextResponse.json({
        role: "assistant",
        content: receipt,
        order: {
          id: order.id,
          order_number: order.order_number,
          total_price,
          items: itemsWithPrices,
        },
      });
    }

    // Regular chat response (no function call)
    return NextResponse.json({
      role: "assistant",
      content: assistantMessage.content,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
