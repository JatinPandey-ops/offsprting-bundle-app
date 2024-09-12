import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  TextField,
  ResourceList,
  ResourceItem,
  Thumbnail,
  Button,
  Text,
  BlockStack,
  List,
  Modal,
  Checkbox,
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useAppBridge } from "@shopify/app-bridge-react";

// Loader function to fetch all products and sync with Prisma
export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);

    console.log("Fetching all products from Shopify...");
    const graphqlQuery = `query GetAllProducts {
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
    }`;

    const response = await admin.graphql(graphqlQuery);
    const productData = (await response.json()).data;
    const products = productData.products.edges;

    console.log("Total products fetched:", products.length);

    // Process each product
    for (const edge of products) {
      const productNode = edge.node;
      const shopifyProductId = BigInt(productNode.id.replace("gid://shopify/Product/", "")).toString(); // Ensure ID is in string format

      console.log(`Processing product: ${productNode.title}`);

      try {
        // Check if the product already exists in the database
        const existingProduct = await prisma.product.findUnique({
          where: { id: shopifyProductId },
        });

        // Process variants and selected options
        const variantData = productNode.variants.edges.map((variantEdge) => {
          const variantNode = variantEdge.node;
          const selectedOptions = variantNode.selectedOptions.map(option => ({
            name: option.name,
            value: option.value,
          }));

          return {
            id: BigInt(variantNode.id.replace("gid://shopify/ProductVariant/", "")).toString(), // Convert to string
            title: variantNode.title,
            price: parseFloat(variantNode.price),
            sku: variantNode.sku,
            inventoryQuantity: variantNode.inventoryQuantity ?? 0, // Default to 0 if null
            selectedOptions, // Store selected options as JSON
          };
        });

        // Process images
        const imageData = productNode.images.edges.map((imageEdge) => ({
          shopifyImageId: BigInt(imageEdge.node.id.replace("gid://shopify/ProductImage/", "")).toString(), // Convert to string
          src: imageEdge.node.src,
          altText: imageEdge.node.altText ?? null, // Default to null if missing
        }));

        if (existingProduct) {
          // Update existing product
          console.log(`Updating existing product: ${productNode.title}`);
          await prisma.product.update({
            where: { id: shopifyProductId },
            data: {
              title: productNode.title,
              handle: productNode.handle,
              descriptionHtml: productNode.descriptionHtml ?? "",
              productType: productNode.productType ?? "",
              vendor: productNode.vendor ?? "",
              variants: {
                deleteMany: {}, // Clear existing variants before updating
                create: variantData, // Re-create all variants
              },
              images: {
                deleteMany: {}, // Clear existing images before updating
                create: imageData, // Re-create all images
              },
              updatedAt: new Date(),
            },
          });
        } else {
          // Create new product
          console.log(`Creating new product: ${productNode.title}`);
          await prisma.product.create({
            data: {
              id: shopifyProductId,
              title: productNode.title,
              handle: productNode.handle,
              descriptionHtml: productNode.descriptionHtml ?? "",
              productType: productNode.productType ?? "",
              vendor: productNode.vendor ?? "",
              variants: {
                create: variantData, // Create variants
              },
              images: {
                create: imageData, // Create images
              },
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
      } catch (error) {
        console.error(`Error processing product with Shopify Product ID ${productNode.title}:`, error.message);
      }
    }

    console.log("Returning all products to the client...");
    return json({
      products,
    });
  } catch (error) {
    console.error("Error in loader:", error);
    return json({ error: "Failed to load products" }, { status: 500 });
  }
};




// Action function to handle form submission and save the bundle
export const action = async ({ request }) => {
  console.log("Action function started");

  const formData = await request.formData();
  const selectedProductIds = JSON.parse(formData.get("selectedProductIds"));
  const placeholderProductId = formData.get("placeholderProductId").replace("gid://shopify/Product/", "");
  const maxSelections = parseInt(formData.get("maxSelections"), 10); // Get max selections
  const singleDesignSelection = formData.get("singleDesignSelection") === "true"; // Get single design selection
  const wipesQuantity = formData.get("wipesQuantity") ? parseInt(formData.get("wipesQuantity"), 10) : null; // Allow null for wipes quantity
  let wipeProductId = formData.get("wipeProductId") ? formData.get("wipeProductId").replace("gid://shopify/Product/", "") : null; // Allow null for wipe product ID

  console.log("Selected Product IDs:", selectedProductIds);
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
      bundleProducts: {
        create: selectedProductIds.map((id) => ({
          product: { connect: { id: id.replace("gid://shopify/Product/", "") } },
        })),
      },
    };

    console.log("Creating a new bundle in Prisma...");
    const newBundle = await prisma.bundle.create({
      data: bundleData,
      include: {
        bundleProducts: true,
      },
    });

    console.log("New bundle created:", newBundle);
    return json({ success: true, bundle: newBundle });
  } catch (error) {
    console.error("Error creating bundle:", error);
    return json({ success: false, error: error.message });
  }
};








// Client code: React component
export default function BundlePage() {
  const { products: initialProducts } = useLoaderData();
  const [products, setProducts] = useState(initialProducts);
  const [searchValue, setSearchValue] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [userChosenName, setUserChosenName] = useState("");
  const [isPlaceholderModalOpen, setIsPlaceholderModalOpen] = useState(false); // State for placeholder product modal
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false); // State for wipe product modal
  const [placeholderProductSelection, setPlaceholderProductSelection] = useState(null);
  const [filteredPlaceholderProducts, setFilteredPlaceholderProducts] = useState([]);
  const [maxSelections, setMaxSelections] = useState(5); // State for max selection number
  const [singleDesignSelection, setSingleDesignSelection] = useState(false); // State for single design selection
  const [wipesQuantity, setWipesQuantity] = useState(0); // New state for wipes quantity
  const [wipeProductSelection, setWipeProductSelection] = useState(null); // New state for wipe product
  const [filteredWipeProducts, setFilteredWipeProducts] = useState([]); // Filter wipe products for modal

  const submit = useSubmit();
  const fetcher = useFetcher();

  const handleSearchChange = useCallback((value) => {
    setSearchValue(value);
  }, []);

  const filteredProducts = products?.filter((product) =>
    product.node.title.toLowerCase().includes(searchValue.toLowerCase())
  ) || [];

  const handleSelection = (id) => {
    setSelectedItems((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((item) => item !== id)
        : [...prevSelected, id]
    );
  };

  const handleSubmit = useCallback(async () => {
    const formData = new FormData();
    formData.append("selectedProductIds", JSON.stringify(selectedItems));
    formData.append("placeholderProductId", placeholderProductSelection);
    formData.append("maxSelections", maxSelections); // Add max selections
    formData.append("singleDesignSelection", singleDesignSelection); // Add single design selection
    formData.append("wipesQuantity", wipesQuantity); // Add wipes quantity
    formData.append("wipeProductId", wipeProductSelection); // Add wipe product ID

    console.log("Submitting bundle creation form...");
    submit(formData, { method: "post" });
  }, [selectedItems, submit, placeholderProductSelection, maxSelections, singleDesignSelection, wipesQuantity, wipeProductSelection]);

  useEffect(() => {
    if (isPlaceholderModalOpen) {
      const placeholderProducts = products.filter((product) =>
        product.node.title.toLowerCase().includes("bundle") // Customize your filter logic here
      );
      setFilteredPlaceholderProducts(placeholderProducts);
    }
  }, [isPlaceholderModalOpen, products]); // Trigger when the placeholder modal opens and when products change

  useEffect(() => {
    if (isWipeModalOpen) {
      const wipeProducts = products.filter((product) =>
        product.node.title.toLowerCase().includes("wipes") // Filter logic for wipes products
      );
      setFilteredWipeProducts(wipeProducts);
    }
  }, [isWipeModalOpen, products]); // Trigger when the wipe modal opens and when products change

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack inlineAlign="stretch">
              <TextField
                label="Bundle Name"
                value={userChosenName}
                autoComplete="off"
                disabled
              />
              <TextField
                label="Search Products"
                value={searchValue}
                onChange={handleSearchChange}
                autoComplete="off"
                placeholder="Search by product title"
              />
              
              <ResourceList
                resourceName={{ singular: "product", plural: "products" }}
                items={filteredProducts}
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
                      accessibilityLabel={`View details for ${title}`}
                      persistActions
                    >
                      <Text variant="bodyMd">{title}</Text>
                      <Button
                        variant={selectedItems.includes(id) ? "secondary" : "primary"}
                        onClick={() => handleSelection(id)}
                      >
                        {selectedItems.includes(id) ? "Selected" : "Select"}
                      </Button>
                    </ResourceItem>
                  );
                }}
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        {selectedItems.length !== 0 && (
          <Layout.Section variant="oneThird">
            <Card title="Selected Products">
              <BlockStack inlineAlign="stretch">
                {selectedItems.map((id) => {
                  const product = products.find(
                    (product) => product.node.id === id
                  );
                  return (
                    <BlockStack key={id} inlineAlign="center">
                      <Thumbnail
                        source={product.node.featuredImage?.url || ""}
                        alt={product.node.featuredImage?.altText || product.node.title}
                      />
                      <Text as="p" variant="bodyMd">
                        {product.node.title}
                      </Text>
                      <Button variant="plain" onClick={() => handleRemoveSelection(id)}>Remove</Button>
                    </BlockStack>
                  );
                })}

                <TextField
                  type="number"
                  label="Max Selections in Bundle"
                  value={maxSelections}
                  onChange={(value) => setMaxSelections(value)}
                  min={1}
                />

                <Checkbox
                  label="Allow Single Design Selection?"
                  checked={singleDesignSelection}
                  onChange={(value) => setSingleDesignSelection(value)}
                />

                <TextField
                  type="number"
                  label="Quantity of Wipes"
                  value={wipesQuantity}
                  onChange={(value) => setWipesQuantity(value)}
                  min={0}
                />

                <Button variant="primary" onClick={() => setIsPlaceholderModalOpen(true)}>
                  Select a Placeholder Product
                </Button>

                <Button variant="primary" onClick={() => setIsWipeModalOpen(true)}>
                  Select Wipe Product
                </Button>

                <Button variant="primary" onClick={handleSubmit}>
                  Save Bundle
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>

      {/* Modal for Placeholder Product */}
      <Modal
        open={isPlaceholderModalOpen}
        onClose={() => setIsPlaceholderModalOpen(false)}
        title="Select a Placeholder Product"
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
            items={filteredPlaceholderProducts}
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
                    <Text as="span" variant="bodyMd" color="success">
                      Selected
                    </Text>
                  )}
                </ResourceItem>
              );
            }}
          />
        </Modal.Section>
      </Modal>

      {/* Modal for Wipe Product */}
      <Modal
        open={isWipeModalOpen}
        onClose={() => setIsWipeModalOpen(false)}
        title="Select a Wipe Product"
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
            items={filteredWipeProducts}
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
                    <Text as="span" variant="bodyMd" color="success">
                      Selected
                    </Text>
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

