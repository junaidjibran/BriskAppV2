import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useNavigate, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import { loggedInCheck } from "../controllers/users.controller";
// import { STATUS_CODES } from "../helpers/response";
import { useState } from "react";
import { Icon } from "@shopify/polaris";
import Loader from "../components/loader";
// import { Button } from "@shopify/polaris";
// import { STATUS_CODES } from "../helpers/response";
// import { loggedInCheck } from "../helpers/session.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  const { sessionToken } = await authenticate.admin(request);

  const isLogedIn = await loggedInCheck({ sessionToken })

  return json({ apiKey: process.env.SHOPIFY_API_KEY || "", isLogedIn: isLogedIn });
};

// export const action = async ({ request }) => {
//   try {
//     const { sessionToken } = await authenticate.admin(request);

//     const isLogout = await userLogout({ sessionToken });

//     if (!isLogout) {
//       return json({ message: "There is an issue while logout", status: "error" }, { status: STATUS_CODES.BAD_REQUEST });
//     }

//     // return json({ data: { isLogout }, status: "success", message: "Logout Success!" }, { status: STATUS_CODES.OK })

//     return redirect('/app/login')

//   } catch (error) {
//     console.error("Loader Error:", error);
//     return json({ error: JSON.stringify(error), message: "Something went wrong...", status: "error" }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
//   }
// }

export default function App() {
  const { apiKey, isLogedIn } = useLoaderData();
  // const actionData = useActionData()
  const navigate = useNavigate();
  const [isLogoutLoading, setIsLogoutLoading] = useState(false)

  // console.log("actionData app.jsx", actionData)
  // const submit = useSubmit();

  const logoutHandle = async () => {
    console.log("Logout handle")
    try {
      setIsLogoutLoading(true)
      const resp = await fetch('/app/logout', {
        method: "POST"
      });

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const data = await resp.json();

      setIsLogoutLoading(false)
      console.log("data================= logout", data)
      navigate('/app/login')


    } catch (error) {
      setIsLogoutLoading(false)
      console.log("There is an issu", error)
      return null
    }
  }

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      { isLogoutLoading && (
        <Loader /> 
      ) }

      <NavMenu>
        <Link to="/app">Orders</Link>
        <Link to="/app/vectors">Settings</Link>
        <Link to="/app/manageUsers">Manage Users</Link>
        <Link to="/app/meterPerSize">Size per meter</Link>
        <Link to="/app/inventories">Inventory</Link>
        <Link to="/app/login">Login</Link>
      </NavMenu>
      {
        isLogedIn && (
          <ui-title-bar title="Brisk App">
            <button variant="primary" loading={ true } onClick={logoutHandle}>
              Logout
            </button>
          </ui-title-bar>
        )
      }
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
