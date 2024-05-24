import { authenticate, unauthenticated } from "../shopify.server";
import { json } from "@remix-run/node";
import { Form, redirect, useActionData, useLoaderData, useNavigate, useNavigation, useSubmit } from "@remix-run/react";

import { STATUS_CODES } from "../helpers/response";
import { Button, Card, FormLayout, Page, TextField } from "@shopify/polaris";
import { useCallback, useEffect, useState } from "react";
import { dataTimeFormat } from "../helpers/dataFormat";
// import { authCookie } from "../helpers/cookies.server";
import prisma from "../db.server";
import { commitSession, destroySession, getSession, loggedInCheck } from "../helpers/session.server";

export const action = async ({ request }) => {
    try {
        const { session } = await authenticate.admin(request);
        const shop = session?.shop
        const { storefront } = await unauthenticated.storefront(shop);

        const formData = await request.formData();
        const email = formData.get('email');
        const password = formData.get('password');
        // const { storefront } = await authenticate.storefront(shop)

        if (!email || !password) {
            return json({ status: "error", message: "Email or Password missing!" }, { status: STATUS_CODES.BAD_REQUEST })
        }

        const response = await storefront.graphql(`#graphql
            mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
                customerAccessTokenCreate(input: $input) {
                    customerAccessToken {
                        accessToken
                        expiresAt
                    }
                    customerUserErrors {
                        code
                        field
                        message
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }`,
            {
                variables: {
                    input: {
                        "email": email,
                        "password": password
                    }
                }
            }
        );

        const data = await response.json();

        console.log("data-------------", JSON.stringify(data, null, 4))
        const customerAccessToken = data?.data?.customerAccessTokenCreate ?? null

        if (customerAccessToken?.customerUserErrors?.length) {
            return json({ status: 'error', message: customerAccessToken?.customerUserErrors[0].message, messages: customerAccessToken?.customerUserErrors }, { status: STATUS_CODES.UNAUTHORIZED })
        }

        console.log("customerAccessToken?.customerAccessToken?.accessToken", customerAccessToken?.customerAccessToken?.accessToken)

        const getCustomerInfoResp = await storefront.graphql(`#graphql
            query getCustomer($token: String!)  {
                customer(customerAccessToken: $token) {
                    createdAt
                    email
                    displayName
                }
            }
        `, {
            variables: {
                "token": customerAccessToken?.customerAccessToken?.accessToken
            }
        })

        console.log(dataTimeFormat(customerAccessToken?.customerAccessToken?.expiresAt))

        const getCustomerInfoData = await getCustomerInfoResp.json();

        console.log("getCustomerInfoData", JSON.stringify(getCustomerInfoData, null, 4));

        const checkInDB = await prisma.users.findUnique({
            where: {
                email: getCustomerInfoData?.data?.customer?.email
            }
        })

        console.log("checkInDB", JSON.stringify(checkInDB, null, 4))

        if (checkInDB) {
            const userUpdate = await prisma.users.update({
                where: {
                    email: getCustomerInfoData?.data?.customer?.email
                },
                data: {
                    token: customerAccessToken?.customerAccessToken?.accessToken
                }
            })

            console.log("userUpdate", JSON.stringify(userUpdate, null, 4))
            // return json({ data: { shop, userData: userUpdate, status: "success" } }, { status: STATUS_CODES.OK })
        } else {
            const userCreate = await prisma.users.create({
                data: {
                    email: getCustomerInfoData?.data?.customer?.email,
                    username: getCustomerInfoData?.data?.customer?.displayName,
                    token: customerAccessToken?.customerAccessToken?.accessToken,
                    access: [],
                    expire_at: customerAccessToken?.customerAccessToken?.expiresAt
                }
            })

            console.log("userCreate", JSON.stringify(userCreate, null, 4))
            // return json({ data: { shop, userData: userCreate, status: "success" } }, { status: STATUS_CODES.OK })
        }

        const customSession = await getSession(request.headers.get("Cookie"));

        customSession.set('customToken', customerAccessToken?.customerAccessToken?.accessToken)

        return redirect('/app', {
            headers: {
                "Set-Cookie": await commitSession(customSession)
            },
        });
    } catch (error) {
        console.error("Loader Error:", error);
        return json({ error: JSON.stringify(error), message: "Something went wrong...", status: "error" }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
}
export const loader = async ({ request }) => {
    try {
        const { session } = await authenticate.admin(request);
        const shop = session?.shop
        debugger;

        const isLoggedIn = await loggedInCheck(request)
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
                {/* <Card> */}
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
                {/* </Card> */}
            </Page>
        </>

    );
}