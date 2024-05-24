import { json, useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react"
import { Badge, Button, Card, Checkbox,  Divider, Page, Text } from "@shopify/polaris"
import { useCallback, useEffect, useState } from "react"
import { STATUS_CODES } from "../helpers/response"
import { getUser, updateUser } from "../controllers/users.controller"
import Loader from "../components/loader"
import { userScopes } from "../constants/scopes"
import { deleteSession } from "../helpers/session.server"
import NotLoggedInScreen from "../components/notLoggedInScreen"

export const loader = async ({ request, params }) => {
    try {
        const userID = params.id

        const deleteSessionIfNotLogin = await deleteSession(request)
        if (deleteSessionIfNotLogin) {
            return json({ status: "NOT_LOGGED_IN" }, deleteSessionIfNotLogin)
        }

        if (!userID) {
            return json({ status: "error", message: "User not found" }, { status: STATUS_CODES.BAD_REQUEST })
        }
        const user = await getUser({ userID });

        if (!user) {
            return json({ status: "error", message: "There is an issue while fetching user" }, { status: STATUS_CODES.BAD_REQUEST })
        }

        return json({ data: { user: user ?? null } }, { status: STATUS_CODES.OK })
    } catch (error) {
        return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
}

export const action = async ({ request, params }) => {
    try {
        const userID = params.id

        const formData = await request.formData();
        const getScopes = formData.get('scopes');
        const getIsAdmin = formData.get('isAdmin')

        if (!userID) {
            return json({ status: "error", message: "User not found" }, { status: STATUS_CODES.BAD_REQUEST })
        }

        if (!getScopes || !getIsAdmin) {
            return json({ status: "error", message: "Invalid data" }, { status: STATUS_CODES.BAD_REQUEST })
        }

        const jsonScope = JSON.parse(getScopes);
        const jsonIsAdmin = JSON.parse(getIsAdmin)

        const user = await updateUser({ userID, userScopes: jsonScope, isAdmin: jsonIsAdmin });

        if (!user) {
            return json({ status: "error", message: "There is an issue while fetching user" }, { status: STATUS_CODES.BAD_REQUEST })
        }

        return json({ data: { user: user ?? null }, status: 'success', message: "User update success." }, { status: STATUS_CODES.OK })
    } catch (error) {
        return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }

}

export default function User() {
    const loaderData = useLoaderData();
    const actionData = useActionData();
    // const navigate = useNavigate();
    const submit = useSubmit();
    const nav = useNavigation();
    // console.log("loaderData", loaderData)
    // console.log("actionData", actionData)
    const isPageLoading = ["loading"].includes(nav.state);
    const isSubmitting = ["submitting"].includes(nav.state) && ["POST"].includes(nav.formMethod)

    const [user, setUser] = useState([])
    const [scopes, setScopes] = useState({})
    const [isAdmin, setIsAdmin] = useState(false)

    const handleScopes = useCallback((key, value) => {
        setScopes((prev) => ({
            ...prev,
            [key]: value
        }));
    }, []);

    const handleIsAdmin = useCallback((value) => {
        setIsAdmin(value);
        setScopes(handleAllScope(value))
    }, [])

    useEffect(() => {
        if (loaderData?.status === "error") {
            shopify.toast.show(loaderData?.message, { isError: true });
        }

        if (loaderData?.data?.user) {
            setUser(loaderData?.data?.user ?? null)
            setIsAdmin(loaderData?.data?.user?.is_admin ?? false )
            const scopeArray = loaderData?.data?.user?.access.reduce((obj, key) => {
                obj[key] = true;
                return obj;
            }, {});
            setScopes(scopeArray ?? {})
        }
    }, [loaderData])

    useEffect(() => {
        if (actionData && actionData?.status?.length) {
            if (actionData?.status === 'error') {
                shopify.toast.show(actionData?.message, { isError: true });
            }

            if (actionData?.status === 'success') {
                shopify.toast.show(actionData?.message, { isError: false });
            }
        }
    }, [actionData])

    const handleSubmit = () => {
        const tempScope = Object.keys(scopes).filter(key => scopes[key]);
        submit({
            scopes: JSON.stringify(tempScope),
            isAdmin: JSON.stringify(isAdmin)
        },
        {
            action: "",
            method: 'post',
            encType: 'multipart/form-data',
            relative: 'route',
        })
    }

    const handleAllScope = (status) => {
        return userScopes.reduce((obj, key) => {
            obj[key] = status;
            return obj;
        }, {});
    }

    if (loaderData?.status === "NOT_LOGGED_IN") {
        return (
            <NotLoggedInScreen />
        )
    }

    return (
        <>
            { isPageLoading && (<Loader />) }
            <Page
                title={user?.username}
                primaryAction={
                    <Button
                        loading={ isSubmitting }
                        onClick={ handleSubmit }
                        variant="primary"
                    >
                        Update
                    </Button>
                }
                backAction={{ url: "../manageUsers" }}
            >
                <Card>
                    <div style={{ padding: "10px 0" }}>
                        <Text variant="headingLg" fontWeight="bold" as="h2">User info</Text>
                        <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                            <Text variant="headingMd" fontWeight="bold" as="h3">Email:</Text>
                            <Text variant="bodyLg" as="p">{user?.email}</Text>
                        </div>
                        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                            <Text variant="headingMd" fontWeight="bold" as="h3">User Type:</Text>
                            {user?.is_admin ? (<Badge tone="attention">Admin</Badge>) : (<Badge tone="info">Normal</Badge>)}
                        </div>
                    </div>
                    <Divider></Divider>
                    <div style={{ padding: "10px 0" }}>
                        <Text variant="headingLg" fontWeight="bold" as="h2">Admin user</Text>
                        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                            <Checkbox
                                label="Make Admin"
                                helpText="Admin user have all scope access"
                                checked={isAdmin}
                                onChange={handleIsAdmin}
                            />
                        </div>
                    </div>
                    <Divider></Divider>
                    <div style={{ padding: "10px 0" }}>
                        <Text variant="headingLg" fontWeight="bold" as="h2">Scopes</Text>
                        <div style={{ display: "flex", flexWrap: "wrap", rowGap: "5px", columnGap: "30px", marginTop: "10px" }}>
                            {
                                userScopes?.map((item, index) => {
                                    return (
                                        <Checkbox
                                            key={item + index}
                                            label={item}
                                            checked={scopes[item] ?? false}
                                            onChange={(value) => handleScopes(item, value)}
                                        />
                                    )
                                })
                            }
                        </div>
                    </div>
                </Card>
            </Page>
        </>
    )
}