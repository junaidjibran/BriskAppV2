import { json, useActionData, useLoaderData, useLocation, useNavigate, useNavigation, useSubmit } from "@remix-run/react"
import { Card, Page, ResourceItem, ResourceList, Text, Modal, EmptyState, Button } from "@shopify/polaris"
import { EditIcon, DeleteIcon, ChevronLeftIcon, ChevronRightIcon } from "@shopify/polaris-icons"
import { useEffect, useState } from "react"
import { STATUS_CODES } from "../helpers/response"
import { getInventories, deleteInventory } from "../controllers/inventory.controller"
import Loader from "../components/loader"
import NotLoggedInScreen from "../components/notLoggedInScreen"
import InventoryNav from "../components/InventoryNav"
import { authenticate } from "../shopify.server"
import { loggedInCheck } from "../controllers/users.controller"
import AccessScreen from "../components/accessScreen"

export const loader = async ({ request }) => {
    try {
        const { sessionToken } = await authenticate.admin(request);
        
        const isLoggedIn = await loggedInCheck({ sessionToken })
        if (!isLoggedIn) {
            return json({ status: "NOT_LOGGED_IN", message: "You are not loggedIn." })
        }
        
        const url = new URL(request.url);
        const page = url.searchParams.get("page");
        const searchQuery = url.searchParams.get("searchQuery");
        console.log(page, searchQuery)
        const [inventories, pageInfo] = await getInventories({ limit: 30, page, searchQuery });

        return json(
            {
                data: {
                    inventories: inventories ?? [],
                    pageInfo: pageInfo,
                    scopes: isLoggedIn?.access,
                    isAdmin: isLoggedIn?.is_admin
                }
            }, 
            { status: STATUS_CODES.OK }
        )

    } catch (error) {
        return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
}

export const action = async ({ request }) => {
    const formData = await request.formData();
    const type = formData.get('type');
    const id = formData.get('id')

    if(type == 'delete'){
        const newinventories = await deleteInventory({ id });
            return json({ data: { inventories: newinventories ?? null }, status: 'success', message: "Size deleted successfully." }, { status: STATUS_CODES.OK })
    }
    return json({ data: "Action" })
}

export default function Inventory() {
    const loaderData = useLoaderData();
    const actionData = useActionData();
    const navigate = useNavigate();
    const nav = useNavigation();
    const location = useLocation()
    console.log("loaderData", loaderData)
    console.log("actionData", actionData)
    const [activeDelete, setActiveDelete] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const submit = useSubmit();
    const isPageLoading = ["loading"].includes(nav.state);
    const [inventories, setinventories] = useState([])
    const [pageInfo, setPageInfo] = useState(null)

    useEffect(() => {
        if (loaderData?.status === "error") {
            shopify.toast.show(loaderData?.message, { isError: true });
        }

        if (loaderData?.data?.inventories) {
            console.log("isLoaderData")
            setinventories(loaderData?.data?.inventories ?? [])
        }

        if (loaderData?.data?.pageInfo) {
            setPageInfo(loaderData?.data?.pageInfo ?? null)
        }
    }, [loaderData])

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

    if (loaderData?.status === "NOT_LOGGED_IN") {
        return (
            <>
                <Page title="Update Inventory">
                    { nav.state === 'loading' ? <Loader /> : null }
                    <InventoryNav currentRoute={ location } />
                    <NotLoggedInScreen />
                </Page>
            </>
        )
    }

    if (!loaderData?.data?.isAdmin && !loaderData?.data?.scopes?.includes('view_inventory')) {
        return (
            <>
                <Page title="Update Inventory">
                    { nav.state === 'loading' ? <Loader /> : null }
                    <InventoryNav currentRoute={ location } />
                    <AccessScreen />
                </Page>
            </>
        )
    }

    return (
        <>
            { isPageLoading && (<Loader />) }
            
            <Page 
                title="Update Inventory" 
                // primaryAction={{content: 'Add New', onAction: () => navigate('/app/inventory/create')}}
            >
                <InventoryNav currentRoute={ location } />
                <Card>
                    <ResourceList
                        alternateTool={ (loaderData?.data?.isAdmin || loaderData?.data?.scopes?.includes('write_inventory')) ? <Button onClick={() => navigate('/app/inventory-add/create')}>Add New</Button> : null}
                        resourceName={{ singular: 'inventory', plural: 'inventories' }}
                        items={inventories}
                        emptyState={
                            (
                                <EmptyState
                                    heading="No found"
                                    action={{ content: 'Add New', onAction: () => navigate('/app/inventory-add/create'), disabled: (!loaderData?.data?.isAdmin && !loaderData?.data?.scopes?.includes('write_inventory')) }}
                                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                                >
                                </EmptyState>
                            )
                        }
                        renderItem={(inventory) => {
                            const { id, sku , inventory : currentInventory } = inventory;
                            const shortcutActions = (loaderData?.data?.isAdmin || loaderData?.data?.scopes?.includes('write_inventory')) ? [
                                {
                                    content: 'Adjust',
                                    icon: EditIcon,
                                    onAction: () => { navigate(`/app/inventory-add/${ id }`) }
                                },
                                {
                                    content: 'Delete',
                                    icon: DeleteIcon,
                                    onAction: () => { 
                                        setActiveDelete(true)
                                        setSelectedItem(id)
                                     }
                                }
                            ] : []

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

                    {
                        inventories.length > 0 && (
                            <div style={{ display: "flex", justifyContent: "center", gap: "5px", paddingTop: "15px" }}>
                                <Button 
                                    disabled={ pageInfo?.isFirstPage } 
                                    onClick={ () => navigate(`/app/inventory-update?page=${ pageInfo?.previousPage }`) }
                                    icon={ ChevronLeftIcon }
                                    />
                                
                                <Button 
                                    disabled={ pageInfo?.isLastPage } 
                                    onClick={ () => navigate(`/app/inventory-update?page=${ pageInfo?.nextPage }`) }
                                    icon={ ChevronRightIcon } 
                                    />
                            </div>
                        )
                    }
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