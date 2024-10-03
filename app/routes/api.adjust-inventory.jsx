import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";


export async function action({ request }) {
    const { admin } = await authenticate.admin(request);
    const { variantId, quantity } = await request.json();

    console.log(`Adjusting inventory for variant ID: ${variantId}, Quantity: ${quantity}`);

    try {
        const result = await adjustInventoryForVariant(admin, variantId, quantity);
        return json(result);
    } catch (error) {
        console.error("Error adjusting inventory:", error);
        return json({ error: "Failed to adjust inventory" }, { status: 500 });
    }
}

async function adjustInventoryForVariant(admin, variantId, quantityToAdjust) {
    // Step 1: Query to get the InventoryItem associated with the variant
    const inventoryItemQuery = `
      query getInventoryItem($variantId: ID!) {
        productVariant(id: $variantId) {
          id
          inventoryItem {
            id
            sku
          }
        }
      }
    `;

    const inventoryItemResponse = await admin.graphql(inventoryItemQuery, {
        variables: {
            variantId: `gid://shopify/ProductVariant/${variantId}`,
        },
    });

    const inventoryData = await inventoryItemResponse.json();
    if (!inventoryData.data || !inventoryData.data.productVariant) {
        throw new Error(`No data found for variant ID: ${variantId}`);
    }

    const inventoryItemId = inventoryData.data.productVariant.inventoryItem.id;

    // Step 2: Query to get the quantity for each inventory level
    const quantityQuery = `
      query getInventoryQuantities($inventoryItemId: ID!) {
        inventoryItem(id: $inventoryItemId) {
          id
          inventoryLevels(first: 10) {
            edges {
              node {
                id
                location {
                  id
                  name
                }
                quantities(names: ["available"]) {
                  name
                  quantity
                }
              }
            }
          }
        }
      }
    `;

    const quantityResponse = await admin.graphql(quantityQuery, {
        variables: {
            inventoryItemId: inventoryItemId,
        },
    });

    const quantityData = await quantityResponse.json();
    if (!quantityData.data || !quantityData.data.inventoryItem) {
        throw new Error(`No quantity data found for inventory item ID: ${inventoryItemId}`);
    }

    const inventoryLevels = quantityData.data.inventoryItem.inventoryLevels.edges;

    // Step 3: Find the location with the highest available quantity
    const maxInventoryLevel = inventoryLevels.reduce((max, current) => {
        const currentQuantity = current.node.quantities[0].quantity;
        return currentQuantity > max.quantity ? 
            { 
                locationId: current.node.location.id, 
                quantity: currentQuantity 
            } : max;
    }, { locationId: null, quantity: -1 });

    if (maxInventoryLevel.locationId === null) {
        throw new Error("No valid inventory levels found");
    }

    // Step 4: Adjust the inventory at the location with the highest quantity
    const adjustInventoryMutation = `
      mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
        inventoryAdjustQuantities(input: $input) {
          userErrors {
            field
            message
          }
          inventoryAdjustmentGroup {
            createdAt
            reason
            referenceDocumentUri
            changes {
              name
              delta
            }
          }
        }
      }
    `;

    const variables = {
        input: {
            reason: "correction",
            name: "available",
            changes: [
                {
                    delta: -quantityToAdjust,
                    inventoryItemId: inventoryItemId,
                    locationId: maxInventoryLevel.locationId,
                },
            ],
        },
    };

    const adjustInventoryResponse = await admin.graphql(adjustInventoryMutation, {
        variables,
    });

    const adjustData = await adjustInventoryResponse.json();
    if (adjustData.errors) {
        throw new Error(`Error adjusting inventory: ${JSON.stringify(adjustData.errors)}`);
    }

    return adjustData.data.inventoryAdjustQuantities;
}