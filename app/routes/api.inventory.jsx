export const action = async ({ request }) => { 
    console.log("fucntion started")
    const headers = request.headers;
    const shopifyTopic = headers.get('x-shopify-topic');
    console.log(shopifyTopic)

    const payload = await request.json();
    console.log(payload)
}