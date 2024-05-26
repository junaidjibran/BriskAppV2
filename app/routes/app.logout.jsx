import { json } from "@remix-run/node";

import { STATUS_CODES } from "../helpers/response";
import { authenticate } from "../shopify.server";
import { userLogout } from "../controllers/users.controller";

export const action = async ({ request }) => {
  try {
    const { sessionToken } = await authenticate.admin(request);

    const isLogout = await userLogout({ sessionToken });

    if (!isLogout) {
      return json({ message: "There is an issue while logout", status: "error" }, { status: STATUS_CODES.BAD_REQUEST });
    }

    if (isLogout && isLogout?.session_token === sessionToken?.sid) {
      return json({ message: "You are not logged out", status: "error" }, { status: STATUS_CODES.BAD_REQUEST });
    }

    return json({ message: "Logout Success.", status: "success" }, { status: STATUS_CODES.ACCEPTED });
  } catch (error) {
    console.error("Loader Error:", error);
    return json({ error: JSON.stringify(error), message: "Something went wrong...", status: "error" }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
  }
}