import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { useEffect } from "react";
import createApp from "@shopify/app-bridge";
import { Redirect } from "@shopify/app-bridge/actions";

export default function App() {
  useEffect(() => {
    // Initialize Shopify App Bridge when the app is embedded
    const urlParams = new URLSearchParams(window.location.search);
    const shop = urlParams.get("shop");

    if (shop) {
      const app = createApp({
        apiKey: process.env.SHOPIFY_API_KEY, // Ensure this is correctly set in env
        shopOrigin: shop,
        forceRedirect: true,
      });

      // If necessary, handle redirects (example to the Shopify admin)
      const redirect = Redirect.create(app);
      redirect.dispatch(Redirect.Action.ADMIN_PATH, "/apps");
    }
  }, []);

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
