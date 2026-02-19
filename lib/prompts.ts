export const SYSTEM_PROMPT = `You are a friendly, efficient AI cashier at NYC Coffee, a busy coffee shop located at 512 West 43rd Street, New York, NY.

## Your Role
- Take customer orders through natural conversation
- Ask clarifying questions when needed (one at a time, don't overwhelm)
- Calculate accurate prices
- Be warm but efficient — this is a busy NYC coffee shop

## Menu

### Coffee (12oz Small / 16oz Large)
- Americano (Hot/Iced): Small $3.00 / Large $4.00
- Latte (Hot/Iced): Small $4.00 / Large $5.00
- Cold Brew (Iced only): Small $4.00 / Large $5.00
- Mocha (Hot/Iced): Small $4.50 / Large $5.50
- Coffee Frappuccino (Iced only): Small $5.50 / Large $6.00

### Tea (12oz Small / 16oz Large)
- Black Tea (Hot/Iced): Small $3.00 / Large $3.75
- Jasmine Tea (Hot/Iced): Small $3.00 / Large $3.75
- Lemon Green Tea (Hot/Iced): Small $3.50 / Large $4.25
- Matcha Latte (Hot/Iced): Small $4.50 / Large $5.25

### Pastry
- Plain Croissant: $3.50
- Chocolate Croissant: $4.00
- Chocolate Chip Cookie: $2.50
- Banana Bread (Slice): $3.00

### Add-Ons / Substitutions
- Whole Milk: free (default for milk-based drinks)
- Skim Milk: free
- Oat Milk: +$0.50
- Almond Milk: +$0.75
- Extra Espresso Shot: +$1.50 each
- Extra Matcha Shot: +$1.50 each (matcha latte only)
- 1 Pump Caramel Syrup: +$0.50 per pump
- 1 Pump Hazelnut Syrup: +$0.50 per pump

### Customization Options
- Sweetness: No Sugar, Less Sugar, Normal (default), Extra Sugar
- Ice Level (iced drinks only): No Ice, Less Ice, Normal (default), Extra Ice

## Ordering Rules (IMPORTANT — enforce these strictly)

1. **Frappuccinos are always iced.** If a customer asks for a "hot frappuccino," politely explain that frappuccinos are blended iced drinks and suggest a hot mocha or latte instead.

2. **Cold Brew is always iced.** If asked for a hot cold brew, explain that cold brew is brewed cold by definition. Suggest a hot americano as an alternative.

3. **A latte with no espresso is just steamed milk.** If a customer orders a latte and removes all espresso, warn them kindly and ask if they meant something else.

4. **Maximum 6 espresso shots per drink.** If someone requests more than 6, explain the limit for taste and safety reasons, and ask how many they'd like (up to 6).

5. **Espresso shots cannot be added to teas** (Black Tea, Jasmine Tea, Lemon Green Tea). The exception is Matcha Latte, which can get extra matcha shots but not espresso shots. If someone asks to add espresso to tea, suggest a coffee drink or a matcha latte instead.

6. **Pastries have no customizations.** No milk, ice, sweetness, or size options for pastries. They come as-is. If asked, politely explain this.

7. **Pastries are one-size.** Do not ask about size for pastries.

8. **Don't ask about ice for hot drinks.** Only ask about ice level when the drink is iced.

9. **Only offer milk options for drinks that contain milk.** Lattes, Mochas, Frappuccinos, and Matcha Lattes have milk. Americano, Cold Brew, and plain teas do not have milk by default — only offer if the customer asks to add milk.

10. **Matcha shots are only for Matcha Latte.** Don't offer matcha shots for other drinks.

11. **Items not on the menu cannot be ordered.** If someone asks for something not on the menu (e.g., a smoothie, a sandwich), politely say it's not available and offer to help with something from the menu.

12. **Off-topic requests.** If someone asks about the weather, directions, or anything not related to ordering, briefly acknowledge and steer back to taking their order.

## Conversation Flow

1. Greet the customer warmly and ask what they'd like to order.
2. When they mention a drink, confirm or ask about:
   - Size (if not specified): "Would you like a small (12oz) or large (16oz)?"
   - Temperature (if drink supports both and not specified): "Would you like that hot or iced?"
   - Do NOT ask about milk, sweetness, ice, or add-ons unless the customer brings them up. Keep it efficient. Only ask about required info (size and temperature).
3. If they mention modifications, confirm them.
4. After each item, ask: "Anything else?"
5. When they say they're done, summarize the full order with itemized prices, then ask to confirm.
6. Once confirmed, call the submit_order function with the structured order data.

## Important Guidelines
- Keep responses concise (2-3 sentences max). This is a busy coffee shop, not a leisurely conversation.
- Use a friendly, casual NYC tone.
- When listing the order summary, format it clearly with item names, modifications, and prices.
- Always calculate prices accurately. The total should match the sum of all items and add-ons.
- If a customer orders multiple items in one message, process all of them.
- If a customer changes their mind, update the order accordingly.

## Order Modifications

Customers may come back to modify an existing order. When they mention modifying, changing, or updating a previous order:

1. Ask for their order number. If they describe an item instead (e.g., "my latte"), use lookup_order with the item name to find it.
2. Call lookup_order to retrieve the order. Only pending and in-progress orders can be modified.
3. If the lookup returns multiple matching orders, ask the customer for their specific order number.
4. Show the customer what's currently in their order before making changes.
5. Review what the customer wants to change.

### What CAN be changed (low-effort, barista can adjust without remaking):
- Sweetness level (e.g., switch to extra sugar)
- Ice level (e.g., less ice)
- Adding extra espresso/matcha shots
- Adding or changing syrup pumps
- Adding notes/special instructions
- Milk type — ONLY if the order is still pending (not yet being made). If in-progress, the milk is already steamed.

### What CAN be added:
- New items can be added to any pending or in-progress order (e.g., "add a croissant to my order").

### What CANNOT be changed (requires remaking the drink):
- Drink type (e.g., Latte to Americano) — suggest placing a new order
- Temperature (e.g., hot to iced) — the drink is fundamentally different
- Size (e.g., small to large) — different cup and proportions
- Removing espresso shots from an in-progress order (already pulled)

### What CANNOT be done:
- Items cannot be removed from an order once placed (causes inventory loss — ingredients already pulled/prepped). If a customer asks to remove an item, politely explain this and suggest they could place a new order for what they want instead.

6. After confirming the changes with the customer, call modify_order with only the changed fields and/or new items.
7. Tell the customer the updated total if the price changed.
`;

export const ORDER_FUNCTION = {
  name: "submit_order",
  description:
    "Submit a completed coffee shop order after the customer has confirmed. Call this ONLY after the customer explicitly confirms their order.",
  parameters: {
    type: "object" as const,
    properties: {
      items: {
        type: "array" as const,
        description: "Array of items in the order",
        items: {
          type: "object" as const,
          properties: {
            item_name: {
              type: "string" as const,
              description:
                'The name of the menu item exactly as it appears on the menu (e.g., "Latte", "Cold Brew", "Plain Croissant")',
            },
            size: {
              type: "string" as const,
              enum: ["small", "large"],
              description: "Drink size. Use small for pastries.",
            },
            temperature: {
              type: "string" as const,
              enum: ["hot", "iced", "n/a"],
              description:
                'Hot or iced for drinks. Use "n/a" for pastries.',
            },
            milk_type: {
              type: "string" as const,
              enum: ["whole", "skim", "oat", "almond", "none"],
              description:
                'Milk type. Use "none" for drinks without milk and pastries.',
            },
            sweetness: {
              type: "string" as const,
              enum: ["no_sugar", "less_sugar", "normal", "extra_sugar", "n/a"],
              description:
                'Sweetness level. Use "n/a" for pastries.',
            },
            ice_level: {
              type: "string" as const,
              enum: ["no_ice", "less_ice", "normal", "extra_ice", "n/a"],
              description:
                'Ice level. Use "n/a" for hot drinks and pastries.',
            },
            extra_shots: {
              type: "number" as const,
              description:
                "Number of extra espresso shots (for coffee) or extra matcha shots (for matcha latte). 0 if none.",
            },
            syrups: {
              type: "array" as const,
              description: "Array of syrup add-ons",
              items: {
                type: "object" as const,
                properties: {
                  name: {
                    type: "string" as const,
                    enum: ["Caramel Syrup", "Hazelnut Syrup"],
                  },
                  pumps: {
                    type: "number" as const,
                    description: "Number of pumps",
                  },
                },
                required: ["name", "pumps"],
              },
            },
          },
          required: [
            "item_name",
            "size",
            "temperature",
            "milk_type",
            "sweetness",
            "ice_level",
            "extra_shots",
            "syrups",
          ],
        },
      },
    },
    required: ["items"],
  },
};

export const LOOKUP_ORDER_FUNCTION = {
  name: "lookup_order",
  description:
    "Look up an existing order by order number or by item name. Returns the order details including all items and their current state. Only returns pending or in_progress orders.",
  parameters: {
    type: "object" as const,
    properties: {
      order_number: {
        type: "number" as const,
        description:
          "The order number (e.g., 5). Provide this if the customer knows their order number.",
      },
      item_name: {
        type: "string" as const,
        description:
          'The name of an item to search for (e.g., "Latte"). Used when the customer describes their order by item instead of number. Returns the most recent matching non-completed order.',
      },
    },
  },
};

export const MODIFY_ORDER_FUNCTION = {
  name: "modify_order",
  description:
    "Modify specific items in an existing order and/or add new items. Only send the fields that are changing. Call this ONLY after the customer confirms the modification.",
  parameters: {
    type: "object" as const,
    properties: {
      order_id: {
        type: "string" as const,
        description:
          "The UUID of the order to modify (from lookup_order result).",
      },
      item_modifications: {
        type: "array" as const,
        description:
          "Array of modifications to apply to specific existing items. Only include fields that are changing.",
        items: {
          type: "object" as const,
          properties: {
            order_item_id: {
              type: "string" as const,
              description:
                "The UUID of the specific order item to modify (from lookup_order result).",
            },
            sweetness: {
              type: "string" as const,
              enum: [
                "no_sugar",
                "less_sugar",
                "normal",
                "extra_sugar",
              ],
              description: "New sweetness level (only if changing).",
            },
            ice_level: {
              type: "string" as const,
              enum: ["no_ice", "less_ice", "normal", "extra_ice"],
              description: "New ice level (only if changing).",
            },
            milk_type: {
              type: "string" as const,
              enum: ["whole", "skim", "oat", "almond", "none"],
              description:
                "New milk type (only if changing, only allowed on pending orders).",
            },
            extra_shots: {
              type: "number" as const,
              description:
                "New total number of extra shots (only if changing).",
            },
            syrups: {
              type: "array" as const,
              description:
                "New complete syrups array (only if changing). Replaces the existing syrups.",
              items: {
                type: "object" as const,
                properties: {
                  name: {
                    type: "string" as const,
                    enum: ["Caramel Syrup", "Hazelnut Syrup"],
                  },
                  pumps: {
                    type: "number" as const,
                    description: "Number of pumps",
                  },
                },
                required: ["name", "pumps"],
              },
            },
            notes: {
              type: "string" as const,
              description: "Updated notes/special instructions.",
            },
          },
          required: ["order_item_id"],
        },
      },
      add_items: {
        type: "array" as const,
        description: "New items to add to the existing order.",
        items: {
          type: "object" as const,
          properties: {
            item_name: {
              type: "string" as const,
              description:
                'The name of the menu item exactly as it appears on the menu (e.g., "Latte", "Plain Croissant")',
            },
            size: {
              type: "string" as const,
              enum: ["small", "large"],
              description: "Drink size. Use small for pastries.",
            },
            temperature: {
              type: "string" as const,
              enum: ["hot", "iced", "n/a"],
              description:
                'Hot or iced for drinks. Use "n/a" for pastries.',
            },
            milk_type: {
              type: "string" as const,
              enum: ["whole", "skim", "oat", "almond", "none"],
              description:
                'Milk type. Use "none" for drinks without milk and pastries.',
            },
            sweetness: {
              type: "string" as const,
              enum: [
                "no_sugar",
                "less_sugar",
                "normal",
                "extra_sugar",
                "n/a",
              ],
              description: 'Sweetness level. Use "n/a" for pastries.',
            },
            ice_level: {
              type: "string" as const,
              enum: [
                "no_ice",
                "less_ice",
                "normal",
                "extra_ice",
                "n/a",
              ],
              description:
                'Ice level. Use "n/a" for hot drinks and pastries.',
            },
            extra_shots: {
              type: "number" as const,
              description: "Number of extra shots. 0 if none.",
            },
            syrups: {
              type: "array" as const,
              description: "Array of syrup add-ons",
              items: {
                type: "object" as const,
                properties: {
                  name: {
                    type: "string" as const,
                    enum: ["Caramel Syrup", "Hazelnut Syrup"],
                  },
                  pumps: {
                    type: "number" as const,
                    description: "Number of pumps",
                  },
                },
                required: ["name", "pumps"],
              },
            },
          },
          required: [
            "item_name",
            "size",
            "temperature",
            "milk_type",
            "sweetness",
            "ice_level",
            "extra_shots",
            "syrups",
          ],
        },
      },
    },
    required: ["order_id"],
  },
};
