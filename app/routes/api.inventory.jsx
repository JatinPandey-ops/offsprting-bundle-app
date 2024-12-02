import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// Use a more specific key structure for deduplication
const processedOrders = new Set();
const PROCESSED_ORDERS_CLEANUP_INTERVAL = 3600000; // 1 hour in milliseconds

function createOrderKey(orderId, topic) {
    return `${orderId}-${topic}`;
}

// Periodically clean up old processed orders
setInterval(() => {
    processedOrders.clear();
}, PROCESSED_ORDERS_CLEANUP_INTERVAL);

export async function action({ request }) {
    try {
        const rawBody = await request.text();
        const payload = JSON.parse(rawBody);
        
        const newRequest = new Request(request.url, {
            method: request.method,
            headers: request.headers,
            body: rawBody,
        });

        const { topic, admin } = await authenticate.webhook(newRequest);
        
        // Early return if not admin
        if (!admin && topic !== "SHOP_REDACT") {
            throw new Response();
        }

        const orderId = payload.id;
        const orderKey = createOrderKey(orderId, topic);

        // Check if this order has already been processed
        if (processedOrders.has(orderKey)) {
            console.log(`Order ${orderId} with topic ${topic} already processed. Skipping.`);
            return json({ message: 'Order already processed' }, { status: 200 });
        }

        // Add to processed set before processing to prevent concurrent executions
        processedOrders.add(orderKey);
        console.log(`Processing order ${orderId} with topic ${topic}`);

        let deltaSign;
        let reason;

        switch (topic) {
            case 'REFUNDS_CREATE':
            case 'ORDERS_CANCELLED':
                deltaSign = 1;
                reason = 'restock';
                break;
            case 'ORDERS_PAID':
                deltaSign = -1;
                reason = 'shrinkage'; // Using valid Shopify reason directly
                break;
            default:
                return json({ message: `Webhook topic ${topic} not handled` }, { status: 200 });
        }

        const lineItems = payload.line_items;
        if (!lineItems?.length) {
            return json({ message: 'No line items found' }, { status: 200 });
        }

        const variantsProperty = lineItems[0].properties?.find(
            prop => prop.name === '_All Selected Variants(ids)'
        );

        if (!variantsProperty) {
            return json({ message: 'No variants property found' }, { status: 200 });
        }

        let variants;
        try {
            variants = JSON.parse(variantsProperty.value);
        } catch (error) {
            console.error("Error parsing variants:", error);
            processedOrders.delete(orderKey); // Remove from processed set if there's an error
            return json({ error: 'Error parsing variants' }, { status: 400 });
        }

        // Process all variants in parallel to speed up execution
        const results = await Promise.all(
            variants.map(async (variant) => {
                try {
                    const result = await adjustInventoryForVariant(
                        admin,
                        variant.id,
                        variant.quantity,
                        deltaSign,
                        reason
                    );
                    return {
                        variantId: variant.id,
                        success: true,
                        result
                    };
                } catch (error) {
                    console.error(`Error adjusting inventory for variant ${variant.id}:`, error);
                    return {
                        variantId: variant.id,
                        success: false,
                        error: error.message
                    };
                }
            })
        );

        // If any adjustments failed, consider removing the order from processed set
        if (results.some(result => !result.success)) {
            console.error(`Some variant adjustments failed for order ${orderId}`);
            // Depending on your requirements, you might want to:
            // processedOrders.delete(orderKey);
        }

        return json({
            success: true,
            message: `${topic} processed successfully`,
            results,
            orderId
        });

    } catch (error) {
        console.error("Error processing webhook:", error);
        // Remove from processed set if there's an error
        if (payload?.id) {
            const orderKey = createOrderKey(payload.id, topic);
            processedOrders.delete(orderKey);
        }
        return json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

async function adjustInventoryForVariant(adminAuth, variantId, quantityToAdjust, deltaSign, reason) {
    const inventoryItemQuery = `
        query getInventoryItem($variantId: ID!) {
            productVariant(id: $variantId) {
                id
                inventoryItem {
                    id
                    inventoryLevels(first: 1) {
                        edges {
                            node {
                                location {
                                    id
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    const inventoryItemResponse = await adminAuth.graphql(inventoryItemQuery, {
        variables: { variantId: `gid://shopify/ProductVariant/${variantId}` },
    });

    const inventoryData = await inventoryItemResponse.json();
    
    if (!inventoryData.data?.productVariant?.inventoryItem) {
        throw new Error(`No inventory item found for variant ${variantId}`);
    }

    const inventoryItemId = inventoryData.data.productVariant.inventoryItem.id;
    const locationId = inventoryData.data.productVariant.inventoryItem.inventoryLevels.edges[0]?.node.location.id;

    if (!locationId) {
        throw new Error(`No location found for inventory item ${inventoryItemId}`);
    }

    const adjustQuantityMutation = `
        mutation adjustInventoryQuantities($input: InventoryAdjustQuantitiesInput!) {
            inventoryAdjustQuantities(input: $input) {
                userErrors {
                    field
                    message
                }
                inventoryAdjustmentGroup {
                    changes {
                        delta
                        name
                    }
                }
            }
        }
    `;

    const adjustmentInput = {
        input: {
            name: "available",
            reason: reason,
            changes: [{
                delta: deltaSign * quantityToAdjust,
                inventoryItemId: inventoryItemId,
                locationId: locationId
            }]
        }
    };

    const adjustResponse = await adminAuth.graphql(adjustQuantityMutation, {
        variables: adjustmentInput
    });

    const adjustData = await adjustResponse.json();

    if (adjustData.errors || adjustData.data?.inventoryAdjustQuantities?.userErrors?.length > 0) {
        const errors = adjustData.errors || adjustData.data?.inventoryAdjustQuantities?.userErrors;
        throw new Error(`Failed to adjust inventory: ${JSON.stringify(errors)}`);
    }

    return adjustData.data.inventoryAdjustQuantities;
}