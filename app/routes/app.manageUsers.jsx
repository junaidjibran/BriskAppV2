import { json, useActionData, useLoaderData, useNavigate, useNavigation } from "@remix-run/react"
import { Badge, Card, Page, ResourceItem, ResourceList, Text } from "@shopify/polaris"
import { EditIcon } from "@shopify/polaris-icons"
import { useEffect, useState } from "react"
import { STATUS_CODES } from "../helpers/response"
import { getUsers, loggedInCheck } from "../controllers/users.controller"
import Loader from "../components/loader"
import NotLoggedInScreen from "../components/notLoggedInScreen"
import { authenticate } from "../shopify.server"

export const loader = async ({ request }) => {
    try {
        const users = await getUsers();

        const { sessionToken } = await authenticate.admin(request);
        
        const isLoggedIn = await loggedInCheck({ sessionToken })
        if (!isLoggedIn) {
            return json({ status: "NOT_LOGGED_IN", message: "You are not loggedIn." })
        }

        if (!users) {
            return json({ status: "error", message: "There is an issue while fetching users" }, { status: STATUS_CODES.BAD_REQUEST })
        }

        return json({ data: { users: users ?? [] } }, { status: STATUS_CODES.OK })
    } catch (error) {
        return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
}

export const action = async ({ request }) => {
    return json({ data: "Action" })

}

export default function ManageUsers() {
    const loaderData = useLoaderData();
    const actionData = useActionData();
    const navigate = useNavigate();
    const nav = useNavigation();
    console.log("loaderData", loaderData)
    console.log("actionData", actionData)

    const isPageLoading = ["loading"].includes(nav.state);
    // const isSubmitting = ["submitting"].includes(nav.state) && ["POST"].includes(nav.formMethod)


    const [users, setUsers] = useState([])

    useEffect(() => {
        if (loaderData?.status === "error") {
            shopify.toast.show(loaderData?.message, { isError: true });
        }

        if (loaderData?.data?.users) {
            console.log("isLoaderData")
            setUsers(loaderData?.data?.users ?? [])
        }
    }, [loaderData])
    

    if (loaderData?.status === "NOT_LOGGED_IN") {
        return (
            <NotLoggedInScreen />
        )
    }

    return (
        <>
            { isPageLoading && (<Loader />) }
            <Page title="Manage Users">
                <Card>
                    <ResourceList
                        // alternateTool={<Button onClick={() => {}}>Add New</Button>}
                        resourceName={{ singular: 'user', plural: 'users' }}
                        items={users}
                        renderItem={(user) => {
                            const { id, email, username, is_admin } = user;
                            const shortcutActions = [
                                {
                                    content: 'Edit',
                                    icon: EditIcon,
                                    onAction: () => { navigate(`/app/user/${ id }`) }
                                },
                                // {
                                //     content: 'Delete',
                                //     icon: DeleteIcon,
                                //     onAction: () => { }
                                // }
                            ]

                            return (
                                <ResourceItem
                                    id={id}
                                    shortcutActions={shortcutActions}
                                    persistActions
                                >
                                    <Text variant="bodyMd" fontWeight="bold" as="h3">
                                        { username}
                                    </Text>
                                    <div style={{ display: 'flex', gap: "5px" }}>
                                        { email }
                                        {is_admin && (
                                            <Badge tone="attention">Admin</Badge>
                                        )}
                                    </div>
                                </ResourceItem>
                            );
                        }}
                    />
                </Card>
            </Page>
        </>
    )
}