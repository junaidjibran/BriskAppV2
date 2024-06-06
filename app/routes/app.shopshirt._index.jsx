// @ts-nocheck
import { Thumbnail, Modal, Button, Card, Page, ResourceItem, ResourceList, Text, EmptyState } from "@shopify/polaris";
import { ChevronLeftIcon, ChevronRightIcon, DeleteIcon, EditIcon } from '@shopify/polaris-icons';

import SettingsNav from "../components/settingsNav";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import prisma from "../db.server";
import {
    useLoaderData,
    useNavigation,
    useActionData,
    useNavigate,
    useSubmit,
    useLocation,
} from "@remix-run/react";
import { fetchProductQuery } from '../queries/productQueries.js'
import { useEffect, useState } from "react";
import { prismaGetShopShirt } from "../controllers/shopshirt_controller";
import Loader from "../components/loader";
import NotLoggedInScreen from "../components/notLoggedInScreen.jsx";
import { loggedInCheck } from "../controllers/users.controller.js";
import { STATUS_CODES } from "../helpers/response.js";
import AccessScreen from "../components/accessScreen.jsx";

export async function loader({ request }) {
    const { admin, session, sessionToken } = await authenticate.admin(request);
    if (!admin) {
        return json({ err: 'Not authenticated' })
    }

    const isLoggedIn = await loggedInCheck({ sessionToken })
    if (!isLoggedIn) {
        return json({ status: "NOT_LOGGED_IN", message: "You are not loggedIn." })
    }

    const url = new URL(request.url);
    const page = url.searchParams.get("page");
    // const searchQuery = url.searchParams.get("searchQuery");

    const [shopShirtItems, pagination] = await prismaGetShopShirt({ limit: 30, page, shop: session?.shop })

    if (shopShirtItems.length) {
        // fetching products from shopify
        for (let index = 0; index < shopShirtItems.length; index++) {
            const item = shopShirtItems[index];
            const response = await admin.graphql(fetchProductQuery,
                {
                    variables: {
                        id: item.product_id
                    },
                }
            );

            const responseJson = await response.json();
            if (responseJson?.data?.product) {
                item.product = responseJson.data.product
            }
        }
    }

    return json(
        {
            data: {
                shopShirtItems,
                pageInfo: pagination,
                scopes: isLoggedIn?.access,
                isAdmin: isLoggedIn?.is_admin
            }
        },
        { status: STATUS_CODES.OK })
}

export async function action({ request, params }) {

    // console.log('--------toDeleteId', toDeleteId );

    try {
        const formData = await request.formData();
        const id = formData.get('id');

        switch (request?.method) {
            case "DELETE":
                if (!id) {
                    return json({ status: "error", message: 'Shopshirt id is missing.' }, { status: STATUS_CODES.BAD_REQUEST })
                };
                const deleteShopShirt = await prisma.shop_shirt.delete({
                    where: {
                        id: id
                    }
                })
                if (!deleteShopShirt) {
                    return json({ status: "error", message: 'There is an issue while deleting Shopshirt.' }, { status: STATUS_CODES.BAD_REQUEST })
                }
                return json({ data: { ...deleteShopShirt }, status: "success", message: "Shopshirt delete success." }, { status: STATUS_CODES.ACCEPTED });
            default:
                return json({ status: "error", message: 'Method not supported.' }, { status: STATUS_CODES.BAD_GATEWAY })
        }

    }
    catch (error) {
        return json({ error: JSON.stringify(error) }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
        // let msg = 'something went wrong';
        // if (err?.meta?.target == "shop_shirt_product_id_key") {
        //     msg = "Vectors against this product already exist"
        // }


        // return json({ success: false, err, action: 'create', msg });
    }
}

export default function Shopshirt() {
    const navigate = useNavigate();
    const nav = useNavigation();
    const submit = useSubmit();
    const actionData = useActionData();
    const loaderData = useLoaderData();
    const location = useLocation();
    const isLoading = ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";

    const [deleteModalOpen, setdeleteModalOpen] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [pageInfo, setPageInfo] = useState(null);

    // console.log("LoaderData", loaderData)
    // const [searchTerm, setSearchTerm] = useState("");
    // const [textFieldValue, setTextFieldValue] = useState('Jaded Pixel');

    // const lastPostInResults = loaderData?.firstQueryResults[1]?.id // Remember: zero-based index! :)
    // const myCursor = lastPostInResults?.id // Example: 52

    console.log('--------loaderData', loaderData);
    // console.log('--------actionData', actionData);

    // useEffect(() => {
    //     if (actionData) {
    //         setToDelete(null)
    //         setdeleteModalOpen(false)
    //     }
    // }, [actionData])

    useEffect(() => {
        if (loaderData && loaderData?.data?.pageInfo) {
            setPageInfo(loaderData?.data?.pageInfo)
        }
    }, [loaderData])

    useEffect(() => {
        // if (actionData) {
        //     setActiveDelete(false)
        // }
        if (actionData && actionData?.status?.length) {
            if (actionData?.status === 'error') {
                shopify.toast.show(actionData?.message, { isError: true });
            }

            if (actionData?.status === 'success') {
                shopify.toast.show(actionData?.message, { isError: false });
                setdeleteModalOpen(false)
            }
        }
    }, [actionData])

    const toggleDeleteModal = (id = null) => {
        setdeleteModalOpen((state) => !state);
        setToDelete(id)
    }

    const deleteShopshirt = () => {
        // console.log(    '--------toDelete', toDelete);
        submit(
            {
                id: toDelete,
            },
            {
                action: "",
                method: 'delete',
                encType: 'multipart/form-data',
                relative: 'route',
            }
        )
    }

    // const handleSearchChange = useCallback(
    //     (value) => setSearchTerm(value),
    //     []
    //     );
    //     const handleClearButtonClick = useCallback(() => {
    //         setSearchTerm('');
    //         navigate('/app/shopshirt'); 
    //     }, []);
    //  const handleSearchButtonClick = () => {
    //      navigate(`/app/shopshirt?search=${searchTerm}`);
    //  };

    // const handleKeyUp = (event) => {
    //     if (event.key === 'Enter') {
    //         handleSearchButtonClick();
    //     }
    // };

    const pageTitle = "Shop Shirt"

    if (loaderData?.status === "NOT_LOGGED_IN") {
        return (
            <>
                <Page title={pageTitle}>
                    {nav.state === 'loading' ? <Loader /> : null}
                    <SettingsNav currentRoute={location} />
                    <NotLoggedInScreen />
                </Page>
            </>
        )
    }

    if (!loaderData?.data?.isAdmin && !loaderData?.data?.scopes?.includes('view_shopshirt')) {
        return (
            <>
                <Page title={pageTitle}>
                    {nav.state === 'loading' ? <Loader /> : null}
                    <SettingsNav currentRoute={location} />
                    <AccessScreen />
                </Page>
            </>
        )
    }


    return (
        <>
            {nav.state === 'loading' ? <Loader /> : null}
            <Page title="Shop Shirt">
                <SettingsNav currentRoute={location} />
                <Card>
                    <ResourceList
                        alternateTool={(loaderData?.data?.isAdmin || loaderData?.data?.scopes?.includes('write_shopshirt')) ? <Button onClick={() => navigate("/app/shopshirt/new")}>Add New</Button> : null}
                        resourceName={{ singular: "Shop Shirt", plural: "Shop Shirts" }}
                        emptyState={(<EmptyState
                            heading="Add New ShopShirt"
                            action={{ content: 'Add', onAction: () => navigate("/app/shopshirt/new"), disabled: (!loaderData?.data?.isAdmin && !loaderData?.data?.scopes?.includes('write_shopshirt')) }}
                            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                        >
                        </EmptyState>)}
                        items={loaderData?.data?.shopShirtItems}
                        renderItem={(item) => {
                            const { id, title, featuredImage } = item.product;
                            const media = <Thumbnail
                                source={featuredImage?.url}
                                alt={featuredImage?.altText}
                            />
                            let editUrl = `/app/shopshirt/${item.id}`
                            return (
                                <ResourceItem
                                    id={id}
                                    // url={editUrl}
                                    media={media}
                                    accessibilityLabel={`View details for ${title}`}
                                    shortcutActions={(loaderData?.data?.isAdmin || loaderData?.data?.scopes?.includes('write_shopshirt')) ? [
                                        {
                                            content: "Edit",
                                            url: editUrl,
                                            icon: EditIcon,
                                        },
                                        {
                                            content: "Delete",
                                            onClick: () => toggleDeleteModal(item.id),
                                            icon: DeleteIcon,
                                        },
                                    ] : []}
                                    persistActions
                                >
                                    <Text variant="bodyMd" fontWeight="bold" as="h3">
                                        {title}
                                    </Text>
                                    <div> vectors added {item.vectors_ids?.length}</div>
                                </ResourceItem>
                            );
                        }}
                    />
                    {
                        loaderData?.data?.shopShirtItems?.length && (
                            <div style={{ display: "flex", justifyContent: "center", gap: "5px", paddingTop: "15px" }}>
                                <Button 
                                    disabled={ pageInfo?.isFirstPage } 
                                    onClick={ () => navigate(`/app/shopshirt?page=${ pageInfo?.previousPage }`) }
                                    icon={ ChevronLeftIcon }
                                    />
                                
                                <Button 
                                    disabled={ pageInfo?.isLastPage } 
                                    onClick={ () => navigate(`/app/shopshirt?page=${ pageInfo?.nextPage }`) }
                                    icon={ ChevronRightIcon } 
                                    />
                            </div>
                        )
                    }
                </Card>
                <Modal
                    open={deleteModalOpen}
                    onClose={toggleDeleteModal}
                    title="Confirm Deletion"
                    primaryAction={{
                        content: 'Delete',
                        // @ts-ignore
                        onAction: deleteShopshirt,
                        loading: isLoading
                    }}
                    secondaryActions={[
                        {
                            content: 'Cancle',
                            onAction: toggleDeleteModal,
                        },
                    ]}
                >
                    <Modal.Section>
                        Are you sure you want to delete this product with vectors? This action cannot be undone.
                    </Modal.Section>
                </Modal>
            </Page>
        </>
    );
}

