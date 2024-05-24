import { createCookie } from "@remix-run/node";

export const authCookie = createCookie("app_login_token", {
    domain: "",
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30 // 30 Days
})