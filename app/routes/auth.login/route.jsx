import { useState } from "react";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  AppProvider as PolarisAppProvider,
  Button,
  Card,
  FormLayout,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";
import { getSessionToken } from "@shopify/app-bridge-utils";
import { commitSession } from "../../utils/session.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));

  return json({ errors, polarisTranslations });
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  const shopDomain = formData.get("shop");

  // Assuming login function processes authentication and returns an error if any
  const loginResult = await login(request);
  const errors = loginErrorMessage(loginResult); // Extract errors if login failed

  if (errors) {
    return json({ errors });
  }

  // Continue with session handling if no errors
  const session = await getSessionToken(request.headers.get("Cookie"));
  session.set("shop", shopDomain); // Store the shop domain or any other session data

  return redirect("/", {
    headers: {
      "Set-Cookie": await commitSession(session), // Set the session cookie
    },
  });
};


export default function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <PolarisAppProvider i18n={loaderData.polarisTranslations}>
      <Page>
        <Card>
          <Form method="post">
            <FormLayout>
              <Text variant="headingMd" as="h2">
                Log in
              </Text>
              <TextField
                type="text"
                name="shop"
                label="Shop domain"
                helpText="example.myshopify.com"
                value={shop}
                onChange={setShop}
                autoComplete="on"
                error={errors.shop}
              />
              <Button submit>Log in</Button>
            </FormLayout>
          </Form>
        </Card>
      </Page>
    </PolarisAppProvider>
  );
}
