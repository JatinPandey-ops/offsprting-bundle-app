import { json } from '@remix-run/node';
import prisma from '../db.server.js';

export const action = async ({ request }) => {
  try {
    const headers = request.headers;
    const shopifyTopic = headers.get('x-shopify-topic');

    const payload = await request.json();
    console.log(payload)
    const {
      id: shopifyProductId,
      title,
      handle,
      descriptionHtml,
      productType,
      vendor,
      updated_at,
      variants = [],  // Default to an empty array if undefined
      images = [],    // Default to an empty array if undefined
      tags,
    } = payload;

    console.log('Received webhook event:', shopifyTopic, 'for product:', shopifyProductId);

    if (shopifyTopic === 'products/create' || shopifyTopic === 'products/update') {
      
      if (!title || !handle ) {
        throw new Error('Missing required fields: title, handle, or updated_at');
      }

      const productData = {
        id: String(shopifyProductId),  // Convert to string
        title: title,
        handle: handle,
        descriptionHtml: descriptionHtml || null,
        productType: productType || null,
        vendor: vendor || null,
        updatedAt: new Date(updated_at),
        tags: tags ? JSON.stringify(tags) : null,  // Assuming tags are an array and need to be stored as a JSON string
      };

      if (isNaN(productData.updatedAt.getTime())) {
        throw new Error('Invalid updated_at date');
      }

      // Upsert the product
      const upsertedProduct = await prisma.product.upsert({
        where: { id: String(shopifyProductId) },  // Convert to string
        update: productData,
        create: {
          ...productData,
          createdAt: new Date(),
          variants: {
            create: variants.map((variant) => ({
              id: String(variant.id),  // Convert to string
              title: variant.title,
              price: parseFloat(variant.price),
              sku: variant.sku || null,
              inventoryQuantity: variant.inventoryQuantity || null,
              weight: variant.weight || null,
              weightUnit: variant.weightUnit || null,
              requiresShipping: variant.requiresShipping || false,
            })),
          },
          images: {
            create: images.map((image) => ({
              id: String(image.id),  // Convert to string
              src: image.src,
              altText: image.altText || null,
            })),
          },
        },
      });

      console.log(`Product ${shopifyProductId} upserted in the database.`);

    } else if (shopifyTopic === 'products/delete') {
      // Handle product deletion
      const existingProduct = await prisma.product.findUnique({
        where: { id: String(shopifyProductId) },  // Convert to string
      });

      if (existingProduct) {
        await prisma.product.delete({
          where: { id: String(shopifyProductId) },  // Convert to string
        });
        console.log(`Product ${shopifyProductId} deleted from the database.`);
      } else {
        console.log(`Product ${shopifyProductId} not found in the database.`);
      }
    } else {
      console.log(`Unhandled Shopify topic: ${shopifyTopic}`);
      return json({ error: 'Unhandled Shopify topic' }, { status: 400 });
    }

    return json({ message: 'Product processed successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error.message);
    return json({ error: 'Error processing product webhook' }, { status: 500 });
  }
};
