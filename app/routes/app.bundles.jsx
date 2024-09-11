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

    for (const edge of products) {
      const productNode = edge.node;
      const shopifyProductId = BigInt(productNode.id.replace("gid://shopify/Product/", "")); // Convert to BigInt

      console.log(`Processing product: ${productNode.title}`);

      try {
        // Check if the product already exists in the database
        const existingProduct = await prisma.product.findUnique({
          where: { id: shopifyProductId },
        });

        const variantData = productNode.variants.edges.map((variantEdge) => ({
          id: BigInt(variantEdge.node.id.replace("gid://shopify/ProductVariant/", "")) , // Convert to BigInt
          title: variantEdge.node.title,
          price: parseFloat(variantEdge.node.price),
          sku: variantEdge.node.sku,
          inventoryQuantity: variantEdge.node.inventoryQuantity ?? 0, // Provide a default value if null
        }));

        const imageData = productNode.images.edges.map((imageEdge) => ({
          id: parseInt(imageEdge.node.id.replace("gid://shopify/ProductImage/", "")), // Convert to BigInt
          src: imageEdge.node.src,
          altText: imageEdge.node.altText ?? null, // Provide null if altText is missing
        }));

        if (existingProduct) {
          // If the product exists, update it
          console.log(`Updating existing product: ${productNode.title}`);
          await prisma.product.update({
            where: { id: shopifyProductId },
            data: {
              title: productNode.title,
              handle: productNode.handle,
              descriptionHtml: productNode.descriptionHtml ?? "", // Use empty string if null
              productType: productNode.productType ?? "", // Use empty string if null
              vendor: productNode.vendor ?? "", // Use empty string if null
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
          // If the product doesn't exist, create a new one
          console.log(`Creating new product: ${productNode.title}`);
          await prisma.product.create({
            data: {
              id: shopifyProductId,
              title: productNode.title,
              handle: productNode.handle,
              descriptionHtml: productNode.descriptionHtml ?? "", // Use empty string if null
              productType: productNode.productType ?? "", // Use empty string if null
              vendor: productNode.vendor ?? "", // Use empty string if null
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
        console.error(`Error processing product with Shopify Product ID ${shopifyProductId}:`, error.message);
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
  const placeholderProductId = parseInt(formData.get("placeholderProductId").replace("gid://shopify/Product/", "")); // Convert to integer
  const maxSelections = parseInt(formData.get("maxSelections"), 10); // Get max selections
  const singleDesignSelection = formData.get("singleDesignSelection") === "true"; // Get single design selection
  
  console.log("Selected Product IDs:", selectedProductIds);
  console.log("Placeholder Product ID:", placeholderProductId);
  
  try {
    // Fetch the placeholder product's title
    console.log("Fetching placeholder product from Prisma...");
    const placeholderProduct = await prisma.product.findUnique({
      where: { id: placeholderProductId },
      include: { variants: true }, // Include variants to fetch price
    });

    if (!placeholderProduct) {
      throw new Error("Selected placeholder product not found");
    }

    console.log("Placeholder Product fetched:", placeholderProduct);

    console.log("Creating a new bundle in Prisma...");
    const newBundle = await prisma.bundle.create({
      data: {
        id: placeholderProductId,
        userChosenName: placeholderProduct.title,
        price: parseFloat(placeholderProduct.variants[0].price), // Example: Using the first variant's price
        maxSelections, // Save max selections in the bundle
        singleDesignSelection, // Save the single design selection boolean in the bundle
        bundleProducts: {
          create: selectedProductIds.map((id) => ({
            product: { connect: { id: parseInt(id.replace("gid://shopify/Product/", "")) } }, // Convert to integer
          })),
        },
      },
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [placeholderProductSelection, setPlaceholderProductSelection] = useState(null);
  const [filteredPlaceholderProducts, setFilteredPlaceholderProducts] = useState([]);
  const [maxSelections, setMaxSelections] = useState(5); // State for max selection number
  const [singleDesignSelection, setSingleDesignSelection] = useState(false); // State for single design selection

  const submit = useSubmit();
  const fetcher = useFetcher();
  const appBridge = useAppBridge();

  const bundle = fetcher.data?.bundle;

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

  const handleRemoveSelection = (id) => {
    setSelectedItems((prevSelected) => prevSelected.filter((item) => item !== id));
  };

  const handlePlaceholderSelection = (id) => {
    setPlaceholderProductSelection(id);
    setIsModalOpen(false);
    setUserChosenName(products.find(product => product.node.id === id).node.title);
  };
  useEffect(() => {
    if (isModalOpen) {
      const placeholderProducts = products.filter((product) =>
        product.node.title.toLowerCase().includes("bundle") // Customize your filter logic here
      );
      setFilteredPlaceholderProducts(placeholderProducts);
    }
  }, [isModalOpen, products]); // Trigger when the modal opens and when products change
  
  const handleSubmit = useCallback(async () => {
    const formData = new FormData();
    formData.append("selectedProductIds", JSON.stringify(selectedItems));
    formData.append("placeholderProductId", placeholderProductSelection);
    formData.append("maxSelections", maxSelections); // Add max selections
    formData.append("singleDesignSelection", singleDesignSelection); // Add single design selection

    console.log("Submitting bundle creation form...");
    submit(formData, { method: "post" });
  }, [selectedItems, submit, placeholderProductSelection, maxSelections, singleDesignSelection]);

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
                 {/* New number input for max selections */}
              <TextField
              type="number"
                label="Max Selections in Bundle"
                value={maxSelections}
                onChange={(value) => setMaxSelections(value)}
                min={1}
              />

              {/* New checkbox for single design selection */}
              <Checkbox
                label="Allow Single Design Selection?"
                checked={singleDesignSelection}
                onChange={(value) => setSingleDesignSelection(value)}
              />

                <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                  Select a Placeholder Product
                </Button>
                <Button variant="primary" onClick={handleSubmit}>
                  Save Bundle
                </Button>
              </BlockStack>
            </Card>
            {bundle && (
              <Card title="Bundle Created">
                <BlockStack inlineAlign="stretch">
                  <Text as="p" variant="bodyMd">
                    Bundle Name: {bundle.userChosenName}
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Number of Products: {bundle.bundleProducts.length}
                  </Text>
                  <List>
                    {bundle.bundleProducts.map((bundleProduct) => (
                      <List.Item key={bundleProduct.product.id}>
                        {bundleProduct.product.title}
                      </List.Item>
                    ))}
                  </List>
                </BlockStack>
              </Card>
            )}
          </Layout.Section>
        )}
      </Layout>

       <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Select a Placeholder Product"
        primaryAction={{
          content: "Select",
          onAction: () => handlePlaceholderSelection(placeholderProductSelection),
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setIsModalOpen(false),
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
                  onClick={() => handlePlaceholderSelection(id)}
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
    </Page>
  );
}