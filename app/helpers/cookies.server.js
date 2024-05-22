import { createCookie } from "@remix-run/node";

export const authCookie = createCookie("ba_token", {
    // domain: ".shopify.com",
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 60 * 24 * 30 // 30 Days
})