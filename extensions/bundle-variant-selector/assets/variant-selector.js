document.addEventListener('DOMContentLoaded', function() {
    const addToCartButton = document.getElementById('add-to-cart');
    const variantSelectElements = document.querySelectorAll('.variant-select');
  
    addToCartButton.addEventListener('click', function() {
      let selectedVariants = [];
  
      variantSelectElements.forEach(select => {
        if (select.value) {
          selectedVariants.push({
            id: select.dataset.productId,
            variantId: select.value
          });
        }
      });
  
      if (selectedVariants.length > 0) {
        // Pass selected variants to cart
        selectedVariants.forEach(variant => {
          // Add the selected variant to the cart using Shopify AJAX API
          addVariantToCart(variant.variantId);
        });
      } else {
        alert('Please select at least one variant.');
      }
    });
  
    function addVariantToCart(variantId) {
      fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: variantId,
          quantity: 1
        })
      })
      .then(response => response.json())
      .then(data => {
        console.log('Variant added to cart:', data);
        // Optionally update the UI or show a confirmation message
      })
      .catch(error => console.error('Error adding variant to cart:', error));
    }
  });
  