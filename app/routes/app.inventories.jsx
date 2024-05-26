import { json, useActionData, useLoaderData, useNavigate, useNavigation, useSubmit } from "@remix-run/react"
import { Badge, Card, Page, ResourceItem, ResourceList, Text, Modal } from "@shopify/polaris"
import { EditIcon, DeleteIcon } from "@shopify/polaris-icons"
import { useEffect, useState } from "react"
import { STATUS_CODES } from "../helpers/response"
import { getInventories, deleteSize } from "../controllers/inventory.controller"
import Loader from "../components/loader"
import NotLoggedInScreen from "../components/notLoggedInScreen"

export const loader = async ({ request }) => {
    try {
        const inventories = await getInventories();
        // const deleteSessionIfNotLogin = await deleteSession(request)
        // if (deleteSessionIfNotLogin) {
        //     return json({ status: "NOT_LOGGED_IN" }, deleteSessionIfNotLogin)
        // }

        // if (!users) {
        //     return json({ status: "error", message: "There is an issue while fetching users" }, { status: STATUS_CODES.BAD_REQUEST })
        // }

        // return json({ data: { users: users ?? [] } }, { status: STATUS_CODES.OK })
        return json({ data: { inventories: inventories ?? [] } }, { status: STATUS_CODES.OK })
    } catch (error) {
        return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
}

export const action = async ({ request }) => {
    const formData = await request.formData();
    const type = formData.get('type');
    const id = formData.get('id')

    if(type == 'delete'){
        const newinventories = await deleteSize({ id });
            return json({ data: { inventories: newinventories ?? null }, status: 'success', message: "Size deleted successfully." }, { status: STATUS_CODES.OK })
    }
    return json({ data: "Action" })
}

export default function Inventory() {
    const loaderData = useLoaderData();
    const actionData = useActionData();
    const navigate = useNavigate();
    const nav = useNavigation();
    console.log("loaderData", loaderData)
    console.log("actionData", actionData)
    const [activeDelete, setActiveDelete] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const submit = useSubmit();
    const isPageLoading = ["loading"].includes(nav.state);
    const [inventories, setinventories] = useState([])

    useEffect(() => {
        if (loaderData?.status === "error") {
            shopify.toast.show(loaderData?.message, { isError: true });
        }

        if (loaderData?.data?.inventories) {
            console.log("isLoaderData")
            setinventories(loaderData?.data?.inventories ?? [])
        }
    }, [loaderData])
    

    if (loaderData?.status === "NOT_LOGGED_IN") {
        return (
            <NotLoggedInScreen />
        )
    }

    useEffect(() => {
        setActiveDelete(false)
        if (actionData && actionData?.status?.length) {
            if (actionData?.status === 'error') {
                shopify.toast.show(actionData?.message, { isError: true });
            }

            if (actionData?.status === 'success') {
                shopify.toast.show(actionData?.message, { isError: false });
            }
        }
    }, [actionData])

    const handleDeleteSize = () => {
        submit({
            type: "delete",
            id: selectedItem
        },
        {
            action: "",
            method: 'post',
            encType: 'multipart/form-data',
            relative: 'route',
        })
    }

    return (
        <>
            { isPageLoading && (<Loader />) }
            <Page title="Your Inventory" primaryAction={{content: 'Create New', onAction: () => navigate('/app/inventory/create')}}>
                <Card>
                    <ResourceList
                        resourceName={{ singular: 'size', plural: 'inventories' }}
                        items={inventories}
                        renderItem={(inventory) => {
                            const { id, sku , inventory : currentInventory } = inventory;
                            const shortcutActions = [
                                {
                                    content: 'Adjust',
                                    icon: EditIcon,
                                    onAction: () => { navigate(`/app/inventory/${ id }`) }
                                },
                                {
                                    content: 'Delete',
                                    icon: DeleteIcon,
                                    onAction: () => { 
                                        setActiveDelete(true)
                                        setSelectedItem(id)
                                     }
                                }
                            ]

                            return (
                                <ResourceItem
                                    id={id}
                                    shortcutActions={shortcutActions}
                                    persistActions
                                >
                                    <div style={{display: 'flex'}}>
                                        <div style={{flex : "0 0 30%", marginRight: '10px'}}>
                                            <Text variant="bodyMd" fontWeight="bold" as="h3">
                                                SKU : { sku} 
                                            </Text>
                                        </div>

                                    <Text variant="bodyMd" fontWeight="bold" as="h4">
                                        Inventory : { currentInventory }
                                    </Text>

                                    </div>
                                </ResourceItem>
                            );
                        }}
                    />
                </Card>
            </Page>
            <Modal
                open={activeDelete}
                onClose={() => setActiveDelete(false)}
                title="Confirm Deletion"
                primaryAction={{
                    content: 'Delete',
                    onAction: () => handleDeleteSize(),
                    loading: isPageLoading
                }}
                secondaryActions={[
                    {
                        content: 'Cancel',
                        onAction: () => setActiveDelete(false),
                    },
                ]}
            >
                <Modal.Section>
                    Are you sure you want to delete this size and meter settings? This action cannot be undone.
                </Modal.Section>
            </Modal>
        </>
    )
}