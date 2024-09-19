import { json } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  ResourceList,
  ResourceItem,
  Thumbnail,
  Button,
  Text,
  BlockStack,
  Modal,
  List,
  TextField,
  Checkbox,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Loader function to fetch all products and their variants
export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);

    // Shopify GraphQL query to fetch products and their variants
    const graphqlQuery = `
      query GetAllProducts {
        products(first: 250) {
          edges {
            node {
              id
              title
              handle
              descriptionHtml
              productType
              vendor
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                    price
                    sku
                    inventoryQuantity
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
              images(first: 10) {
                edges {
                  node {
                    id
                    src
                    altText
                  }
                }
              }
              featuredImage {
                url
                altText
              }
            }
          }
        }
      }
    `;

    const response = await admin.graphql(graphqlQuery);
    const productData = (await response.json()).data.products.edges;

    // Process each product and update in the Prisma database
    for (const edge of productData) {
      const productNode = edge.node;
      const shopifyProductId = BigInt(productNode.id.replace("gid://shopify/Product/", "")).toString();

      const variantData = productNode.variants.edges.map((variantEdge) => {
        const variantNode = variantEdge.node;
        return {
          id: BigInt(variantNode.id.replace("gid://shopify/ProductVariant/", "")).toString(),
          title: variantNode.title,
          price: parseFloat(variantNode.price),
          sku: variantNode.sku,
          inventoryQuantity: variantNode.inventoryQuantity ?? 0,
          selectedOptions: variantNode.selectedOptions,
        };
      });

      // Save or update the product and its variants in the database
      await prisma.product.upsert({
        where: { id: shopifyProductId },
        update: {
          title: productNode.title,
          handle: productNode.handle,
          descriptionHtml: productNode.descriptionHtml ?? "",
          productType: productNode.productType ?? "",
          vendor: productNode.vendor ?? "",
          variants: {
            deleteMany: {}, // Delete existing variants
            create: variantData, // Re-create variants
          },
        },
        create: {
          id: shopifyProductId,
          title: productNode.title,
          handle: productNode.handle,
          descriptionHtml: productNode.descriptionHtml ?? "",
          productType: productNode.productType ?? "",
          vendor: productNode.vendor ?? "",
          variants: {
            create: variantData, // Create variants
          },
        },
      });
    }

    return json({ products: productData });
  } catch (error) {
    console.error("Error in loader:", error);
    return json({ error: "Failed to load products" }, { status: 500 });
  }
};


// Action to handle form submission and save the bundle
export const action = async ({ request }) => {
  console.log("Action function started");

  const formData = await request.formData();
  const selectedVariants = JSON.parse(formData.get("selectedVariants")); // Array of selected variants with quantities
  const placeholderProductId = formData.get("placeholderProductId").replace("gid://shopify/Product/", "");
  const maxSelections = parseInt(formData.get("maxSelections"), 10); // Get max selections
  const singleDesignSelection = formData.get("singleDesignSelection") === "true"; // Get single design selection
  const wipesQuantity = formData.get("wipesQuantity") ? parseInt(formData.get("wipesQuantity"), 10) : null; // Allow null for wipes quantity
  let wipeProductId = formData.get("wipeProductId") ? formData.get("wipeProductId").replace("gid://shopify/Product/", "") : null; // Allow null for wipe product ID
  console.log(formData)
  console.log("Selected Variants:", selectedVariants);
  console.log("Placeholder Product ID:", placeholderProductId);
  console.log("Wipe Product ID:", wipeProductId);

  try {
    // Check if wipeProductId exists in the Product table
    if (wipeProductId) {
      console.log("Checking wipe product...");
      const wipeProduct = await prisma.product.findUnique({
        where: { id: wipeProductId },
      });

      if (!wipeProduct) {
        console.log(`Wipe product with ID ${wipeProductId} does not exist, setting wipeProductId to null.`);
        wipeProductId = null; // Set to null if the wipe product does not exist
      }
    }

    // Fetch the placeholder product's title and variants
    console.log("Fetching placeholder product from Prisma...");
    const placeholderProduct = await prisma.product.findUnique({
      where: { id: placeholderProductId },
      include: { variants: true }, // Include variants to fetch price
    });

    if (!placeholderProduct) {
      throw new Error("Selected placeholder product not found");
    }

    console.log("Placeholder Product fetched:", placeholderProduct);

    // Prepare the data object for creating the bundle
    const bundleData = {
      id: placeholderProductId,
      userChosenName: placeholderProduct.title,
      price: parseFloat(placeholderProduct.variants[0].price), // Using the first variant's price
      maxSelections, // Save max selections in the bundle
      singleDesignSelection, // Save the single design selection boolean in the bundle
      wipesQuantity, // Save wipes quantity in the bundle
      wipeProductId, // Set wipeProductId, either as the valid ID or null
      selectedVariantsData: selectedVariants, // Store the selected variants array
      bundleVariants: {
        create: selectedVariants.map((variant) => ({
          variant: { connect: { id: variant.id.replace("gid://shopify/ProductVariant/", "") } }, // Connect existing variant
        })),
      },
    };

    console.log("Creating a new bundle in Prisma...");
    const newBundle = await prisma.bundle.create({
      data: bundleData,
      include: {
        bundleVariants: true, // Include the associated variants in the response
      },
    });

    console.log("New bundle created:", newBundle);
    return json({ success: true, bundle: newBundle });
  } catch (error) {
    console.error("Error creating bundle:", error);
    return json({ success: false, error: error.message });
  }
};




// Component that displays products and allows selection of variants
export default function BundleForm() {
  const { products: initialProducts } = useLoaderData();
  const [products, setProducts] = useState(initialProducts);
  const [selectedVariants, setSelectedVariants] = useState([]);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState(null);
  const [placeholderProductSelection, setPlaceholderProductSelection] = useState(null);
  const [isPlaceholderModalOpen, setIsPlaceholderModalOpen] = useState(false);
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false); // State for wipe product modal
  const [maxSelections, setMaxSelections] = useState(5);
  const [singleDesignSelection, setSingleDesignSelection] = useState(false);
  const [wipeProductSelection, setWipeProductSelection] = useState(null); // New state for wipe product selection
  const [wipesQuantity, setWipesQuantity] = useState(0); // New state for wipes quantity

  const submit = useSubmit();

  // Open modal to show product variants
  const openVariantModal = (product) => {
    setSelectedProductForVariants(product);
    setIsVariantModalOpen(true);
  };

  // Select variant and add to selectedVariants list
  const selectVariant = (variant) => {
    const selectedVariant = {
      ...variant,
      quantity: 1, // Default quantity
    };
    setSelectedVariants((prev) => [...prev, selectedVariant]);
  };

  // Update quantity for a selected variant
  const updateVariantQuantity = (variantId, quantity) => {
    setSelectedVariants((prev) =>
      prev.map((variant) => (variant.id === variantId ? { ...variant, quantity } : variant))
    );
  };

  // Remove variant from the selectedVariants list
  const removeVariant = (variantId) => {
    setSelectedVariants((prev) => prev.filter((v) => v.id !== variantId));
  };

  // Submit the bundle data to the server
  const handleSubmit = useCallback(() => {
    const formData = new FormData();
    formData.append("selectedVariants", JSON.stringify(selectedVariants));
    formData.append("placeholderProductId", placeholderProductSelection);
    formData.append("wipeProductId", wipeProductSelection);
    formData.append("wipesQuantity", wipesQuantity);
    formData.append("maxSelections", maxSelections);
    formData.append("singleDesignSelection", singleDesignSelection);

    submit(formData, { method: "post" });
  }, [selectedVariants, placeholderProductSelection, wipeProductSelection, wipesQuantity, maxSelections, singleDesignSelection, submit]);

  return (
    <Page title="Create Bundle">
      <Layout>
        <Layout.Section>
          {/* Products List */}
          <Card>
            <ResourceList
              resourceName={{ singular: "product", plural: "products" }}
              items={products}
              renderItem={(item) => {
                const { id, title, featuredImage } = item.node;
                const media = (
                  <Thumbnail
                    source={featuredImage?.url || ""}
                    alt={featuredImage?.altText || title}
                  />
                );
                return (
                  <ResourceItem
                    id={id}
                    media={media}
                    accessibilityLabel={`Select variants for ${title}`}
                  >
                    <Text variant="bodyMd">{title}</Text>
                    <Button onClick={() => openVariantModal(item.node)}>Select Variants</Button>
                  </ResourceItem>
                );
              }}
            />
          </Card>
        </Layout.Section>

        {/* Selected Variants Side Pane */}
        {selectedVariants.length > 0 && (
          <Layout.Section secondary>
            <Card title="Selected Variants">
              <BlockStack inlineAlign="stretch">
                {selectedVariants.map((variant) => (
                  <BlockStack key={variant.id} inlineAlign="center">
                    <Thumbnail
                      source={variant.imageUrl || ""}
                      alt={variant.title}
                    />
                    <Text as="p" variant="bodyMd">{variant.title} - {variant.price} USD</Text>
                    <TextField
                      type="number"
                      label="Quantity"
                      value={variant.quantity}
                      onChange={(value) => updateVariantQuantity(variant.id, parseInt(value))}
                    />
                    <Button variant="plain" onClick={() => removeVariant(variant.id)}>Remove</Button>
                  </BlockStack>
                ))}

                <TextField
                  type="number"
                  label="Max Selections"
                  value={maxSelections}
                  onChange={(value) => setMaxSelections(value)}
                />

                <Checkbox
                  label="Allow Single Design Selection?"
                  checked={singleDesignSelection}
                  onChange={(value) => setSingleDesignSelection(value)}
                />

                <Button onClick={() => setIsPlaceholderModalOpen(true)}>Select Placeholder Product</Button>

                {/* New Wipe Product Button */}
                <Button onClick={() => setIsWipeModalOpen(true)}>Select Wipe Product</Button>

                {/* New Wipe Quantity Input */}
                <TextField
                  type="number"
                  label="Quantity of Wipes"
                  value={wipesQuantity}
                  onChange={(value) => setWipesQuantity(parseInt(value))}
                  min={0}
                />

                <Button primary onClick={handleSubmit}>Save Bundle</Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>

      {/* Modal for Variant Selection */}
      <Modal
        open={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        title={`Select Variants for ${selectedProductForVariants?.title}`}
        primaryAction={{
          content: "Close",
          onAction: () => setIsVariantModalOpen(false),
        }}
      >
        <Modal.Section>
          <List>
            {selectedProductForVariants?.variants.edges.map((variantEdge) => {
              const variant = variantEdge.node;
              return (
                <List.Item key={variant.id}>
                  <BlockStack inlineAlign="center">
                    <Text as="p" variant="bodyMd">{variant.title} - {variant.price} USD</Text>
                    <Button onClick={() => selectVariant(variant)}>Select</Button>
                  </BlockStack>
                </List.Item>
              );
            })}
          </List>
        </Modal.Section>
      </Modal>

      {/* Modal for Placeholder Product Selection */}
      <Modal
        open={isPlaceholderModalOpen}
        onClose={() => setIsPlaceholderModalOpen(false)}
        title="Select Placeholder Product"
        primaryAction={{
          content: "Select",
          onAction: () => setPlaceholderProductSelection(placeholderProductSelection),
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setIsPlaceholderModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <ResourceList
            resourceName={{ singular: "product", plural: "products" }}
            items={products.filter((product) => product.node.title.toLowerCase().includes("bundle"))}
            renderItem={(item) => {
              const { id, title, featuredImage } = item.node;
              const media = (
                <Thumbnail
                  source={featuredImage?.url || ""}
                  alt={featuredImage?.altText || title}
                />
              );
              return (
                <ResourceItem
                  id={id}
                  media={media}
                  accessibilityLabel={`Select ${title} as placeholder product`}
                  onClick={() => setPlaceholderProductSelection(id)}
                >
                  <Text variant="bodyMd">{title}</Text>
                  {placeholderProductSelection === id && (
                    <Text as="span" variant="bodyMd" color="success">Selected</Text>
                  )}
                </ResourceItem>
              );
            }}
          />
        </Modal.Section>
      </Modal>

      {/* Modal for Wipe Product Selection */}
      <Modal
        open={isWipeModalOpen}
        onClose={() => setIsWipeModalOpen(false)}
        title="Select Wipe Product"
        primaryAction={{
          content: "Select",
          onAction: () => setWipeProductSelection(wipeProductSelection),
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setIsWipeModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <ResourceList
            resourceName={{ singular: "product", plural: "products" }}
            items={products.filter((product) => product.node.title.toLowerCase().includes("wipes"))}
            renderItem={(item) => {
              const { id, title, featuredImage } = item.node;
              const media = (
                <Thumbnail
                  source={featuredImage?.url || ""}
                  alt={featuredImage?.altText || title}
                />
              );
              return (
                <ResourceItem
                  id={id}
                  media={media}
                  accessibilityLabel={`Select ${title} as wipe product`}
                  onClick={() => setWipeProductSelection(id)}
                >
                  <Text variant="bodyMd">{title}</Text>
                  {wipeProductSelection === id && (
                    <Text as="span" variant="bodyMd" color="success">Selected</Text>
                  )}
                </ResourceItem>
              );
            }}
          />
        </Modal.Section>
      </Modal>
    </Page>
  );
}

