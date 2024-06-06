import { json, useActionData, useLoaderData, useLocation, useNavigate, useNavigation, useSubmit } from "@remix-run/react"
import { Card, Page, ResourceItem, ResourceList, Text, Modal, Button, EmptyState } from "@shopify/polaris"
import { EditIcon, DeleteIcon, ChevronLeftIcon, ChevronRightIcon } from "@shopify/polaris-icons"
import { useEffect, useState } from "react"
import { STATUS_CODES } from "../helpers/response"
// import { getUsers } from "../controllers/users.controller"
import { getSizes, deleteSize } from "../controllers/sizes.controller"
import Loader from "../components/loader"
// import NotLoggedInScreen from "../components/notLoggedInScreen"
// import prisma from "../db.server"
import { authenticate } from "../shopify.server"
import InventoryNav from "../components/InventoryNav"
import { loggedInCheck } from "../controllers/users.controller"
import NotLoggedInScreen from "../components/notLoggedInScreen"
import AccessScreen from "../components/accessScreen"
// import { deleteSession } from "../helpers/session.server"

export const loader = async ({ request }) => {
    try {
        const { sessionToken } = await authenticate.admin(request);

        const isLoggedIn = await loggedInCheck({ sessionToken })
        if (!isLoggedIn) {
            return json({ status: "NOT_LOGGED_IN", message: "You are not loggedIn." })
        }

        // console.log('===========sizes', sizes)

        const url = new URL(request.url);
        const page = url.searchParams.get("page");
        const searchQuery = url.searchParams.get("searchQuery");
        console.log(page, searchQuery)

        const [sizes, pageInfo] = await getSizes({ limit: 30, page, searchQuery });
        console.log(sizes, pageInfo)

        return json(
            { 
                data: 
                { 
                    sizes: sizes ?? [], 
                    pageInfo: pageInfo,
                    scopes: isLoggedIn?.access, 
                    isAdmin: isLoggedIn?.is_admin
                } 
            },
            { status: STATUS_CODES.OK })
    } catch (error) {
        return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
}

export const action = async ({ request }) => {
    try {
        const formData = await request.formData();
        const id = formData.get('id')
        switch (request.method) {
            case "DELETE":
                const newSizes = await deleteSize({ id });
                if (!newSizes) {
                    return json({ status: "error", message: "There is an issue while deleting." })
                }
                return json({ data: { sizes: newSizes ?? null }, status: 'success', message: "Size deleted successfully." }, { status: STATUS_CODES.OK })
        }
    } catch (error) {
        return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
}

export default function MetersPerSize() {
    const loaderData = useLoaderData();
    const actionData = useActionData();
    const navigate = useNavigate();
    const nav = useNavigation();
    const submit = useSubmit();
    const location = useLocation();
    console.log("loaderData", loaderData)
    console.log("actionData", actionData)

    const isPageLoading = ["loading"].includes(nav.state);
    const [activeDelete, setActiveDelete] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [sizes, setsizes] = useState([])
    const [pageInfo, setPageInfo] = useState(null);
    const pageTitle = "Meter per Size"


    useEffect(() => {
        if (loaderData?.status === "error") {
            shopify.toast.show(loaderData?.message, { isError: true });
        }

        if (loaderData?.data?.sizes) {
            console.log("isLoaderData")
            setsizes(loaderData?.data?.sizes ?? [])
        }
        if (loaderData?.data?.pageInfo) {
            setPageInfo(loaderData?.data?.pageInfo)
        }
    }, [loaderData])

    useEffect(() => {
        if (actionData) {
            setActiveDelete(false)
        }
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
            id: selectedItem
        },
        {
            action: "",
            method: 'delete',
            encType: 'multipart/form-data',
            relative: 'route',
        })
    }

    // if (loaderData?.status === "NOT_LOGGED_IN") {
    //     return (
    //         <NotLoggedInScreen />
    //     )
    // }

    if (loaderData?.status === "NOT_LOGGED_IN") {
        return (
            <>
                <Page title={ pageTitle }>
                    { nav.state === 'loading' ? <Loader /> : null }
                    <InventoryNav currentRoute={ location } />
                    <NotLoggedInScreen />
                </Page>
            </>
        )
    }

    if (!loaderData?.data?.isAdmin && !loaderData?.data?.scopes?.includes('view_invendtory_settings')) {
        return (
            <>
                <Page title={ pageTitle }>
                    { nav.state === 'loading' ? <Loader /> : null }
                    <InventoryNav currentRoute={ location } />
                    <AccessScreen />
                </Page>
            </>
        )
    }

    return (
        <>
            {isPageLoading && (<Loader />)}
            <Page 
                title="Meters per Size"
            >
                <InventoryNav currentRoute={ location } />
                <Card>
                    <ResourceList
                        alternateTool={ (loaderData?.data?.isAdmin || loaderData?.data?.scopes?.includes('write_inventory_settings')) ? <Button onClick={() => navigate('/app/size/create')}>Add New</Button> : null}
                        resourceName={{ singular: 'size', plural: 'sizes' }}
                        items={sizes}
                        emptyState={
                            (
                                <EmptyState
                                    heading="No Sizes found"
                                    action={{ content: 'Add New', onAction: () => navigate('/app/size/create'), disabled: (!loaderData?.data?.isAdmin && !loaderData?.data?.scopes?.includes('write_inventory_settings')) }}
                                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                                >
                                </EmptyState>
                            )
                        }
                        renderItem={(size) => {
                            const { id, size_title: sizeTitle, cloth_meters: meters } = size;
                            const shortcutActions = (loaderData?.data?.isAdmin || loaderData?.data?.scopes?.includes('write_inventory_settings')) ? [
                                {
                                    content: 'Edit',
                                    icon: EditIcon,
                                    onAction: () => { navigate(`/app/size/${id}`) }
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
                                    <div style={{ display: 'flex' }}>
                                        <div style={{ flex: "0 0 30%", marginRight: '10px' }}>
                                            <Text variant="bodyMd" fontWeight="bold" as="h3">
                                                Size : {sizeTitle}
                                            </Text>
                                        </div>

                                        <Text variant="bodyMd" fontWeight="bold" as="h4">
                                            Meter : {meters}
                                        </Text>

                                    </div>
                                </ResourceItem>
                            );
                        }}
                    />

                    {
                        sizes.length > 0 && (
                            <div style={{ display: "flex", justifyContent: "center", gap: "5px", paddingTop: "15px" }}>
                                <Button 
                                    disabled={ pageInfo?.isFirstPage } 
                                    onClick={ () => navigate(`/app/meters-per-size?page=${ pageInfo?.previousPage }`) }
                                    icon={ ChevronLeftIcon }
                                    />
                                
                                <Button 
                                    disabled={ pageInfo?.isLastPage } 
                                    onClick={ () => navigate(`/app/meters-per-size?page=${ pageInfo?.nextPage }`) }
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