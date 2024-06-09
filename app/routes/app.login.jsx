import { authenticate } from "../shopify.server";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigate, useNavigation, useSubmit } from "@remix-run/react";
import { STATUS_CODES } from "../helpers/response";
import { Button, Card, FormLayout, Page, Text, TextField } from "@shopify/polaris";
import { useCallback, useEffect, useState } from "react";
import prisma from "../db.server";
import { createUser, getUser, loggedInCheck } from "../controllers/users.controller";
import Loader from "../components/loader";

export const action = async ({ request }) => {
    try {
        const { sessionToken } = await authenticate.admin(request);

        const formData = await request.formData();
        const email = formData.get('email');
        const password = formData.get('password');
        const username = formData.get('username')
        const _action = formData.get('_action')

        if (_action === 'LOGIN') {
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
        } else if (_action === 'REGISTER') {

            if (!email || !password || !username) {
                return json({ status: "error", message: "Email or Password or username missing!" }, { status: STATUS_CODES.BAD_REQUEST })
            }

            const findUser = await getUser({ email })
            if (findUser) {
                return json({ status: "error", message: "This email address is already registered!" }, { status: STATUS_CODES.NOT_FOUND })
            }

            const generateUser = await createUser({ email, username, password }) 

            if (!generateUser) {
                return json({ status: "error", message: "There is an issue while user register, Please try again later. " }, { status: STATUS_CODES.NOT_FOUND })
            }

            return json({ status: "success", message: "The user has been created successfully.", action: _action }, { status: STATUS_CODES.CREATED })
        }
        return json({ status: "error", message: "Unknow action found!." }, { status: STATUS_CODES.BAD_REQUEST })

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
    const isPageLoading = ["loading"].includes(nav.state);

    console.log('-------loader data', loadedData)
    console.log('-------action data', actionData)

    const registerInitStates = {
        email: "",
        username: "",
        password: "",
        confirmPassword: ""
    }

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [resisterData, setRegisterData] = useState(registerInitStates)
    const [isLoginForm, setIsLoginForm] = useState(true);
    const [errors, setErrors] = useState({})

    const handleEmail = useCallback((value) => setEmail(value), []);
    const handlePassword = useCallback((value) => setPassword(value), []);

    const handleToggleForm = useCallback(() => {
        setIsLoginForm(prev => !prev)
    }, []);

    const handleRegisterForm = useCallback((key, value) => {
        setRegisterData((prev) => ({
            ...prev,
            [key]: value
        }))
    }, [])

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

                setRegisterData(registerInitStates);
                if (actionData?.action === "REGISTER") {
                    setIsLoginForm(true);
                }
                // localStorage.setItem("userInfo", actionData?.data?.userData)
            }
        }
    }, [actionData])

    const submitHandle = async (e) => {
        e.preventDefault()
        console.log("submitHandle", e.target)
        submit({
            email: email,
            password: password,
            _action: "LOGIN"
        }, {
            action: "",
            method: "post",
            encType: "multipart/form-data",
            relative: "route",
        });
    }

    const submitRegisterHandle = async (e) => {
        e.preventDefault()
        console.log("submitRegisterHandle", e.target);
        console.log("handle submit")

        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length) return

        submit({
            email: resisterData?.email,
            password: resisterData?.password,
            username: resisterData?.username,
            _action: "REGISTER"
        }, {
            action: "",
            method: "post",
            encType: "multipart/form-data",
            relative: "route",
        });
    }

    const validateForm = () => {
        let newErrors = {};

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(resisterData.email)) {
            newErrors.email = "Invalid email format.";
        }
        if (resisterData.username.trim() === "") {
            newErrors.username = "Username is required.";
        }
        if (resisterData.password.trim() === "") {
            newErrors.password = "Password is required.";
        }
        if (resisterData.confirmPassword.trim() === "") {
            newErrors.confirmPassword = "Confirm Password is required.";
        }
        if (resisterData.password !== resisterData.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match.";
        }

        setErrors(newErrors);

        return newErrors;
    };

    // const generatePassword = () => {
    //     const getString = generateRandomString(12);
    //     console.log("getString", getString)
    //     setCreateUser(prev => ({
    //         ...prev,
    //         password: getString,
    //         confirmPassword: getString
    //     }))
    // }

    return (
        <>
            { isPageLoading && (<Loader />) }
            <Page>
                <div style={{ maxWidth: "300px", marginLeft: "auto", marginRight: "auto" }}>
                    {
                        isLoginForm ? (
                            <Card>
                                <Text as="h2" variant="headingLg" alignment="center">Login</Text>
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
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <Button variant="primary" loading={isLoading} submit>Log in</Button>
                                            <Button variant="plain" onClick={handleToggleForm}>Go to Register</Button>
                                            {/* <div style={{ display: "none" }}>
                                            </div> */}
                                        </div>
                                    </FormLayout>
                                </Form>
                            </Card>
                        ) : (
                            <Card>
                                <Text as="h2" variant="headingLg" alignment="center">Register</Text>
                                <Form onSubmit={submitRegisterHandle}>
                                    <FormLayout>
                                        <TextField
                                            type="email"
                                            name="email*"
                                            label="Email"
                                            value={resisterData?.email}
                                            onChange={(value) => handleRegisterForm('email', value)}
                                            placeholder="example@gmail.com"
                                            autoComplete="on"
                                            error={errors?.email ?? ""}
                                        />
                                        <TextField
                                            type="text"
                                            name="username"
                                            label="Username*"
                                            value={resisterData?.username}
                                            onChange={(value) => handleRegisterForm('username', value)}
                                            placeholder="example"
                                            autoComplete="on"
                                            error={errors?.username ?? ""}
                                        />
                                        <TextField
                                            type="password"
                                            name="password"
                                            label="Password"
                                            value={resisterData?.password}
                                            onChange={(value) => handleRegisterForm('password', value)}
                                            placeholder="••••••••"
                                            autoComplete="off"
                                            error={errors?.password ?? ""}
                                        />
                                        <TextField
                                            type="password"
                                            name="confirmPassword"
                                            label="Confirm Password"
                                            value={resisterData?.confirmPassword}
                                            onChange={(value) => handleRegisterForm('confirmPassword', value)}
                                            placeholder="••••••••"
                                            autoComplete="off"
                                            error={errors?.confirmPassword ?? ""}
                                        />
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <Button variant="primary" loading={isLoading} submit>Register</Button>
                                            <Button variant="plain" onClick={handleToggleForm}>Back to Login</Button>
                                        </div>
                                    </FormLayout>
                                </Form>
                            </Card>
                        )
                    }

                </div>
            </Page>
        </>

    );
}