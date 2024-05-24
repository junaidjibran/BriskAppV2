// app/sessions.ts
import { createCookieSessionStorage, redirect } from "@remix-run/node"; // or cloudflare/deno


const { getSession, commitSession, destroySession } = createCookieSessionStorage(
    {
        // a Cookie from `createCookie` or the CookieOptions to create one
        cookie: {
            name: "brisk_app_session",

            // all of these are optional
            // domain: "remix.run",
            // Expires can also be set (although maxAge overrides it when used in combination).
            // Note that this method is NOT recommended as `new Date` creates only one date on each server deployment, not a dynamic date in the future!
            //
            // expires: new Date(Date.now() + 60_000),
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 30, // 30 Days
            path: "/",
            sameSite: "none",
            secrets: ["s3cret1"],
            secure: true,
        },
    }
);

const loggedInCheckRedirect = async (request) => {
    const session = await getSession(
        request.headers.get("Cookie")
    );
    const isLogedIn = session.has("customToken")

    console.log("Root Sesion", isLogedIn)

    if (!isLogedIn) {
        throw redirect("/app/login", {
            headers: {
                "Set-Cookie": await destroySession(session),
            },
        })
    }
}

const deleteSession = async (request) => {
    const session = await getSession(
        request.headers.get("Cookie")
    );
    const isLogedIn = session.has("customToken")

    // To check user is logged In. if not delete session form cookies.
    if (!isLogedIn) {
        return { 
            headers: {
                "Set-Cookie": await destroySession(session),
            } 
        }
    }

    return false
}

const loggedInCheck = async (request) => {
    const session = await getSession(
        request.headers.get("Cookie")
    );
    const isLogedIn = session.has("customToken")

    console.log("Root Sesion", isLogedIn)
    
    return isLogedIn
}

export { getSession, commitSession, destroySession, loggedInCheckRedirect, loggedInCheck, deleteSession };
