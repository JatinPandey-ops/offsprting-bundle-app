import { json } from "@remix-run/node";

export async function action({ request }) {
    console.log("Webhook received: order paid");

    const payload = await request.json();
    const lineItems = payload.line_items;

    if (!lineItems || lineItems.length === 0) {
        console.error("No line items found in the payload");
        return json({ error: "No line items found" }, { status: 400 });
    }

    const selectedVariantsProperty = lineItems[0].properties.find(prop => prop.name === 'All Selected Variants');
    if (!selectedVariantsProperty) {
        console.error("No 'All Selected Variants' property found");
        return json({ error: "No 'All Selected Variants' property found" }, { status: 400 });
    }

    let variants = [];
    try {
        variants = JSON.parse(selectedVariantsProperty.value);
        console.log("Parsed Variants:", JSON.stringify(variants, null, 2));
    } catch (error) {
        console.error("Error parsing 'All Selected Variants' JSON", error);
        return json({ error: "Error parsing variants" }, { status: 400 });
    }

    // Call the inventory adjustment API for each variant
    for (const variant of variants) {
        const response = await fetch('https://swift-butts-latter-congress.trycloudflare.com/api/adjust-inventory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                variantId: variant.id,
                quantity: variant.quantity,
            }),
        });

        if (!response.ok) {
            console.error(`Failed to adjust inventory for variant ${variant.id}`);
        }
    }

    return json({ success: true });
}
