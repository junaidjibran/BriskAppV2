import { authenticate } from "../shopify.server";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigate, useNavigation, useSubmit } from "@remix-run/react";
import { STATUS_CODES } from "../helpers/response";
import { Button, Card, FormLayout, Page, TextField } from "@shopify/polaris";
import { useCallback, useEffect, useState } from "react";
import prisma from "../db.server";
import { loggedInCheck } from "../controllers/users.controller";

export const action = async ({ request }) => {
    try {
        const { sessionToken } = await authenticate.admin(request);

        const formData = await request.formData();
        const email = formData.get('email');
        const password = formData.get('password');

        if (!email || !password) {
            return json({ status: "error", message: "Email or Password missing!" }, { status: STATUS_CODES.BAD_REQUEST })
        }

        const findUser = await prisma.users.findUnique({
            where: {
                email: email
            }
        })

        console.log("findUser", JSON.stringify(findUser, null, 4))
        
        if (!findUser) {
            console.log()
            return json({ status: "error", message: "User not found!" }, { status: STATUS_CODES.NOT_FOUND })
        }

        const isValidPassword = findUser?.password === password;

        if (!isValidPassword) {
            return json({ status: "error", message: "Please Enter valid password" }, { status: STATUS_CODES.NOT_FOUND })
        }

        const updateUserSessionToken = await prisma.users.update({
            where: {
                email: email
            },
            data: {
                session_token: sessionToken?.sid
            }
        })

        if (!updateUserSessionToken) {
            return json({ status: "error", message: "Session update issue!" }, { status: STATUS_CODES.BAD_REQUEST })
        }

        return redirect('/app');
        // return json({ data: { findUser }, status: "success", message: "Login Success!" }, { status: STATUS_CODES.OK })
    } catch (error) {
        console.error("Loader Error:", error);
        return json({ error: JSON.stringify(error), message: "Something went wrong...", status: "error" }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
}
export const loader = async ({ request }) => {
    try {
        const { session, sessionToken } = await authenticate.admin(request);
        // const abc = await authenticate.admin(request);
        const shop = session?.shop

        const isLoggedIn = await loggedInCheck({ sessionToken })

        console.log("session==================================", sessionToken)

        // const isLoggedIn = await loggedInCheck(request)
        return json({ data: { shop, isLoggedIn } }, { status: STATUS_CODES.OK })
    } catch (error) {
        console.error("Loader Error:", error);
        return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
};

export default function Login({ params }) {
    const loadedData = useLoaderData();
    const actionData = useActionData();
    const submit = useSubmit();
    const nav = useNavigation();
    const navigate = useNavigate()

    const isLoading = ["submitting"].includes(nav.state) && ["POST"].includes(nav.formMethod);


    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleEmail = useCallback((value) => setEmail(value), []);
    const handlePassword = useCallback((value) => setPassword(value), []);

    console.log('-------loader data', loadedData)
    console.log('-------action data', actionData)
    const submitHandle = async (e) => {
        e.preventDefault()
        console.log("submitHandle", e.target)
        submit({
            email: email,
            password: password
        }, {
            action: "",
            method: "post",
            encType: "multipart/form-data",
            relative: "route",
        });
    }

    useEffect(() => {
        if (loadedData?.data?.isLoggedIn) {
            navigate('/app')   
        }

        if (loadedData && loadedData?.status?.length) {
            if (loadedData?.status === 'error') {
                shopify.toast.show(loadedData?.message, { isError: true });
            }
        }
    }, [loadedData])
    

    useEffect(() => {
        if (actionData && actionData?.status?.length) {
            if (actionData?.status === 'error') {
                shopify.toast.show(actionData?.message, { isError: true });
            }

            if (actionData?.status === 'success') {
                shopify.toast.show(actionData?.message, { isError: false });
                // localStorage.setItem("userInfo", actionData?.data?.userData)
            }
        }
    }, [actionData])

    return (
        <>
            <Page>
                <div style={{ maxWidth: "300px", marginLeft: "auto", marginRight: "auto" }}>
                    <Card>
                        <Form onSubmit={submitHandle}>
                            <FormLayout>
                                <TextField
                                    type="email"
                                    name="email"
                                    label="Email"
                                    // helpText="example.myshopify.com"
                                    value={email}
                                    onChange={handleEmail}
                                    placeholder="example@gmail.com"
                                    autoComplete="on"
                                />
                                <TextField
                                    type="password"
                                    name="password"
                                    label="Password"
                                    value={password}
                                    onChange={handlePassword}
                                    placeholder="••••••••"
                                    autoComplete="off"
                                />
                                <Button variant="primary" loading={isLoading} submit>Log in</Button>
                            </FormLayout>
                        </Form>
                    </Card>
                </div>
            </Page>
        </>

    );
}