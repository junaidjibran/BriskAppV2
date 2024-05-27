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
import { hasNextPage, hasPreviousPage } from "../controllers/paginationController"
import InventoryNav from "../components/InventoryNav"
// import { deleteSession } from "../helpers/session.server"

export const loader = async ({ request }) => {
    try {
        const { session } = await authenticate.admin(request);
        const shop = session?.shop

        // console.log('===========sizes', sizes)

        const url = new URL(request.url);
        const cursorParam = url.searchParams.get("cursor");
        const pageAction = url.searchParams.get("page-action");
        // const searchQuery = url.searchParams.get("search")
        const cursor = cursorParam ? { id: cursorParam } : null;
        const defaultLimit = 30;
        let pagination = {
            startCursor: null,
            endCursor: null,
            count: 0,
            hasPrev: false,
            hasNext: false,
        };

        const query = {
            orderBy: {
                created_at: 'desc',
            },
        }

        if (cursor) {
            query['cursor'] = cursor;
            query['take'] = pageAction === 'prev' ? -defaultLimit : parseInt(defaultLimit);
            query['skip'] = 1
        } else {
            query['take'] = parseInt(defaultLimit);
        }

        // console.log("searchQuery--------------", searchQuery)

        // if (searchQuery && searchQuery.length) {
        //     query['where'] = {
        //         shop: session?.shop,
        //         order_name: {
        //             contains: searchQuery
        //         }
        //     }
        // }


        console.log("query-------", query)

        // const getOrderCall = await prisma.shopify_orders.findMany(query)
        const sizes = await getSizes({ query });

        if (!sizes.length) {
            return json({ message: "No Size found in APP" }, { status: STATUS_CODES.NOT_FOUND })
        }
        // jsonLogs(getOrderCall.length, "getOrderCall---------------");

        if (sizes?.length === defaultLimit) {
            console.log("Has Pagination")
            let startCursor = { id: sizes[0]?.id }
            let endCursor = { id: sizes[sizes.length - 1]?.id }
            let hasNext = await hasNextPage({ cursor: endCursor, take: defaultLimit, collection: "metersPerSize" });
            let hasPrev = await hasPreviousPage({ cursor: startCursor, take: -defaultLimit, collection: "metersPerSize" });
            // @ts-ignore
            pagination['hasNext'] = hasNext;
            // @ts-ignore
            pagination['hasPrev'] = hasPrev;
            // @ts-ignore
            pagination['startCursor'] = sizes[0]?.id;
            // @ts-ignore
            pagination['endCursor'] = sizes[sizes.length - 1]?.id;
            pagination['count'] = sizes.length
        }

        return json({ data: { sizes: sizes ?? [], pageInfo: pagination } }, { status: STATUS_CODES.OK })
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
    const [pageinfo, setPageInfo] = useState(null);

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

    return (
        <>
            {isPageLoading && (<Loader />)}
            <Page 
                title="Meters per Size"
            >
                <InventoryNav currentRoute={ location } />
                <Card>
                    <ResourceList
                        alternateTool={<Button onClick={() => navigate('/app/size/create')}>Add New</Button>}
                        resourceName={{ singular: 'size', plural: 'sizes' }}
                        items={sizes}
                        emptyState={
                            (
                                <EmptyState
                                    heading="No Sizes found"
                                    action={{ content: 'Add New', onAction: () => navigate('/app/size/create') }}
                                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                                >
                                </EmptyState>
                            )
                        }
                        renderItem={(size) => {
                            const { id, size_title: sizeTitle, cloth_meters: meters } = size;
                            const shortcutActions = [
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
                            ]

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
                                    disabled={ !pageinfo?.hasPrev } 
                                    onClick={ () => navigate(`/app/meterPerSize?cursor=${pageinfo?.startCursor}&page-action=prev`) }
                                    icon={ ChevronLeftIcon }
                                    />
                                
                                <Button 
                                    disabled={ !pageinfo?.hasNext } 
                                    onClick={ () => navigate(`/app/meterPerSize?cursor=${pageinfo?.endCursor}&page-action=next`) }
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