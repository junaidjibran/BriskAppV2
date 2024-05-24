import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  // json,
  // redirect,
  // json,
  // redirect,
  useLoaderData,
} from "@remix-run/react";
// import { STATUS_CODES } from "./helpers/response";
// import { destroySession, getSession } from "./helpers/session.server";
// import { authenticate } from "./shopify.server";
// import { authCookie } from "./helpers/cookies.server";

// export const loader = async ({ request }) => {
//   // try {
//     // const { session } = await authenticate.admin(request);
//     // const shop = session?.shop
//     // const cookieString = request.headers.get("Cookie");
//     // const customerAccessToken = await authCookie.parse(cookieString)

//     // if (!customerAccessToken)
//       // return redirect('/app/login')

//     const session = await getSession(
//       request.headers.get("Cookie")
//     );
//     const isLogedIn = session.has("customToken")

//     console.log("Root Sesion", isLogedIn)
  
  
//     // if (!isLogedIn) {
//     //   throw redirect("/app/login", {
//     //     headers: {
//     //       "Set-Cookie": await destroySession(session),
//     //     },
//     //   })
//     // }

//     return json({ page: 'Root' }, { status: STATUS_CODES.OK })
//   // } catch (error) {
//   //   console.error("Loader Error:", error);
//   //   return json({ error: JSON.stringify(error), status: "error" }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
//   // }
// }

export default function App() {
  const loaderData = useLoaderData()
  console.log("loaderData", loaderData)
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
