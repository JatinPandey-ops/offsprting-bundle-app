import {
  Page,
  Card,
  Button,
  Modal,
  ResourceList,
  ResourceItem,
  Text,
  TextField,
  BlockStack,
  InlineStack,
  Checkbox,
} from "@shopify/polaris";
import { useLoaderData, useFetcher, json } from "@remix-run/react";
import { useState, useCallback } from "react";
import { TitleBar } from "@shopify/app-bridge-react";

// Loader function to fetch bundles and associated products
export const loader = async () => {
  const bundles = await prisma.bundle.findMany({
    include: {
      bundleProducts: {
        include: {
          product: true,
        },
      },
    },
  });

  const allProducts = await prisma.product.findMany(); // Fetch all products

  return json({ bundles, allProducts });
};

// Action function to handle deleting a bundle and editing a bundle's info
export const action = async ({ request }) => {
  const formData = await request.formData();
  const method = request.method.toLowerCase();

  // Deleting the entire bundle
  if (method === "delete") {
    const bundleId = formData.get("bundleId");
    await prisma.bundle.delete({
      where: { id: bundleId },
    });
    return json({ success: true });
  }

  // Updating the bundle (name and associated products)
  if (method === "post") {
    const bundleId = formData.get("bundleId");
    const userChosenName = formData.get("userChosenName");
    const price = parseFloat(formData.get("price"));
    const compareAtPrice = parseFloat(formData.get("compareAtPrice")) || null;
    const maxSelections = parseInt(formData.get("maxSelections"), 10) || null;
    const singleDesignSelection = formData.get("singleDesignSelection") === "true";
    const updatedProducts = JSON.parse(formData.get("updatedProducts"));

    // Update bundle fields
    await prisma.bundle.update({
      where: { id: bundleId },
      data: {
        userChosenName,
        price,
        compareAtPrice,
        maxSelections,
        singleDesignSelection,
        bundleProducts: {
          // Remove all old associations and set new ones
          deleteMany: {}, // Delete all existing associations
          create: updatedProducts.map((productId) => ({
            product: { connect: { id: productId } },
          })),
        },
      },
    });

    return json({ success: true });
  }

  return json({ success: false });
};

// Main component
export default function Index() {
  const { bundles, allProducts } = useLoaderData(); // Fetch bundles and all products
  const [selectedBundle, setSelectedBundle] = useState(null); // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bundleName, setBundleName] = useState("");
  const [bundlePrice, setBundlePrice] = useState(0);
  const [compareAtPrice, setCompareAtPrice] = useState(0);
  const [maxSelections, setMaxSelections] = useState(5);
  const [singleDesignSelection, setSingleDesignSelection] = useState(false);
  const [bundleProducts, setBundleProducts] = useState([]);
  const [searchValue, setSearchValue] = useState(""); // Search field for new products
  const [filteredProducts, setFilteredProducts] = useState([]);
  const fetcher = useFetcher();

  // Open modal for bundle details
  const openModal = useCallback((bundle) => {
    setSelectedBundle(bundle);
    setBundleName(bundle.userChosenName);
    setBundlePrice(bundle.price);
    setCompareAtPrice(bundle.compareAtPrice || 0);
    setMaxSelections(bundle.maxSelections || 5);
    setSingleDesignSelection(bundle.singleDesignSelection || false);
    setBundleProducts(bundle.bundleProducts);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Handle deleting a product from bundle
  const handleDeleteProduct = useCallback(
    (productId) => {
      const confirmed = window.confirm("Are you sure you want to delete this product?");
      if (confirmed) {
        setBundleProducts((prev) =>
          prev.filter((bundleProduct) => bundleProduct.product.id !== productId)
        );
      }
    },
    []
  );

  // Handle deleting a bundle
  const handleDeleteBundle = useCallback((bundleId) => {
    const confirmed = window.confirm("Are you sure you want to delete this bundle?");
    if (confirmed) {
      fetcher.submit({ bundleId }, { method: "delete" });
    }
  }, []);

  // Handle saving changes to bundle
  const handleSaveChanges = useCallback(() => {
    fetcher.submit(
      {
        bundleId: selectedBundle.id,
        userChosenName: bundleName,
        price: bundlePrice,
        compareAtPrice: compareAtPrice,
        maxSelections: maxSelections,
        singleDesignSelection: singleDesignSelection.toString(),
        updatedProducts: JSON.stringify(bundleProducts.map((bp) => bp.product.id)),
      },
      { method: "post" }
    );
    alert("Changes have been saved.");
    setIsModalOpen(false);
  }, [
    selectedBundle,
    bundleName,
    bundlePrice,
    compareAtPrice,
    maxSelections,
    singleDesignSelection,
    bundleProducts,
    fetcher,
  ]);

  // Search functionality for adding new products to the bundle
  const handleSearchChange = useCallback(
    (value) => {
      setSearchValue(value);
      setFilteredProducts(
        allProducts.filter((product) =>
          product.title.toLowerCase().includes(value.toLowerCase())
        )
      );
    },
    [allProducts]
  );

  // Add new product to bundle
  const handleAddProduct = useCallback(
    (product) => {
      if (!bundleProducts.some((bp) => bp.product.id === product.id)) {
        setBundleProducts((prev) => [...prev, { product }]);
      }
    },
    [bundleProducts]
  );

  return (
    <Page>
      <TitleBar title="Bundle Overview" />

      {/* List of bundles */}
      <BlockStack gap="500">
        {bundles.map((bundle) => (
          <Card key={bundle.id} sectioned title={bundle.userChosenName}>
              <Text variant="bodyLg" as="p">
            {bundle.userChosenName}
       
      </Text>
            <InlineStack>
              <Button variant="primary" onClick={() => openModal(bundle)}>View Details</Button>
              <Button variant="plain" tone="critical"  destructive onClick={() => handleDeleteBundle(bundle.id)}>
                Delete Bundle
              </Button>
            </InlineStack>
          </Card>
        ))}
      </BlockStack>

      {/* Modal for viewing and editing bundle details */}
      {selectedBundle && (
        <Modal
          open={isModalOpen}
          onClose={closeModal}
          title="Edit Bundle"
          primaryAction={{
            content: "Save",
            onAction: handleSaveChanges,
          }}
          secondaryActions={{
            content: "Cancel",
            onAction: closeModal,
          }}
        >
          <Modal.Section>
            <TextField
              label="Bundle Name"
              value={bundleName}
              onChange={(value) => setBundleName(value)}
            />
            <TextField
              label="Price"
              type="number"
              value={bundlePrice}
              onChange={(value) => setBundlePrice(parseFloat(value))}
            />
            <TextField
              label="Compare At Price"
              type="number"
              value={compareAtPrice}
              onChange={(value) => setCompareAtPrice(parseFloat(value))}
            />
            <TextField
              label="Max Selections"
              type="number"
              value={maxSelections}
              onChange={(value) => setMaxSelections(parseInt(value, 10))}
            />
            <Checkbox
              label="Allow Single Design Selection?"
              checked={singleDesignSelection}
              onChange={(value) => setSingleDesignSelection(value)}
            />
            <ResourceList
              resourceName={{ singular: "product", plural: "products" }}
              items={bundleProducts}
              renderItem={(item) => {
                const { product } = item;
                return (
                  <ResourceItem
                    id={product.id}
                    accessibilityLabel={`View details for ${product.title}`}
                  >
                    <BlockStack>
                      <Text>{product.title}</Text>
                      <Button
                        destructive
                        onClick={() => handleDeleteProduct(product.id)}
                        variant="primary"
                        tone="critical"
                      >
                        Delete
                      </Button>
                    </BlockStack>
                  </ResourceItem>
                );
              }}
            />
          </Modal.Section>

          {/* Add new products to the bundle */}
          <Modal.Section title="Add New Products">
            <TextField
              label="Search for Products"
              value={searchValue}
              onChange={handleSearchChange}
            />
            <ResourceList
              resourceName={{ singular: "product", plural: "products" }}
              items={filteredProducts}
              renderItem={(item) => (
                <ResourceItem
                  id={item.id}
                  accessibilityLabel={`Add ${item.title} to bundle`}
                  onClick={() => handleAddProduct(item)}
                >
                  <Text>{item.title}</Text>
                </ResourceItem>
              )}
            />
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
