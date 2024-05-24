import { json } from "@remix-run/node";
import { redirect } from "@remix-run/react";

import { STATUS_CODES } from "../helpers/response";
import { destroySession, getSession } from "../helpers/session.server";

export const action = async ({ request }) => {
    try {
        const customSession = await getSession(request.headers.get("Cookie"));
        console.log("customSession", customSession)
          return redirect("/app/login", {
            headers: {
              "Set-Cookie": await destroySession(customSession),
            },
        });

        // return redirect('/app', {
        //     headers: {
        //         "Set-Cookie": await authCookie.serialize(customerAccessToken?.customerAccessToken?.accessToken)
        //     }
        // })

    } catch (error) {
        console.error("Loader Error:", error);
        return json({ error: JSON.stringify(error), message: "Something went wrong...", status: "error" }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
}