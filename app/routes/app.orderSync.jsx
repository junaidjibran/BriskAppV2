import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useLocation, useNavigation, useSubmit } from "@remix-run/react";
import { Button, Card, FormLayout, Page, TextField } from "@shopify/polaris";
import { useCallback, useEffect, useState } from "react";
import Loader from "../components/loader";
import SettingsNav from "../components/settingsNav";
import { orderCreation } from "../controllers/ordersController";
import prisma from "../db.server";
import { STATUS_CODES } from "../helpers/response";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
    try {
        return json({ data: {}, message: "Success" }, { status: STATUS_CODES.OK })
    } catch (error) {
        return json({ error: error }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR })
    }
}

export async function action({ request }) {
    try {
        const { admin, session } = await authenticate.admin(request);

        const formData = await request.formData();
		const getOrderID = formData.get('orderID');

        // const orderIDArray = JSON.parse(orderIDList) ?? []
        // if (!orderIDList || !orderIDArray.length) {
        //     return json({ error: "List or order IDS required." }, { status: STATUS_CODES.BAD_REQUEST})
        // }
        if (!getOrderID || !getOrderID.length) {
            return json({ status: 'error', message: "Please enter order ID." }, { status: STATUS_CODES.BAD_REQUEST})
        }

        // const ids = orderIDArray.map(id => "gid://shopify/Order/" + id);
        console.log("id------------", getOrderID)
        const shopifyOrdersResp = await admin.graphql(`#graphql
            query MyQuery($id: ID!) {
                node(id: $id) {
                    ... on Order {
                    id
                    name
                    createdAt
                    lineItems(first: 50) {
                        nodes {
                            id
                            name
                            sku
                            quantity
                            title
                            variantTitle
                            customAttributes {
                                value
                                key
                            }
                            variant {
                                id
                                price
                            }
                            product {
                                id
                            }
                        }
                    }
                    }
                }
            }`,
            {
                variables: {
                    "id": `gid://shopify/Order/${ getOrderID }`
                }
            }
        )
        // jsonLogs(shopifyOrdersResp, "shopify order resppppppp--------")
        const shopifyOrdersData = await shopifyOrdersResp.json()
        

        if (!shopifyOrdersData?.data?.node) {
            return json({ status: 'error', message: "Order not found against this ID" }, { status: STATUS_CODES.NOT_FOUND})
        }

        const orderID = shopifyOrdersData?.data?.node?.id?.split('/').pop();
        const checkInDB = await prisma.shopify_orders.findUnique({
            where: {
                shopify_order_id: orderID
            }
        })
        // console.log("checkInDB", JSON.stringify(checkInDB, null, 4));

        if (checkInDB) {
            return json({ status: 'error', message: "This order is already exist in App" }, { status: STATUS_CODES.FORBIDDEN})
        }

        const orderName = shopifyOrdersData?.data?.node?.name;
        const createdAt = shopifyOrdersData?.data?.node?.createdAt;
        const lineItems = shopifyOrdersData?.data?.node?.lineItems?.nodes?.map(item => {
            let id = parseInt(item?.id?.split('/').pop()) ?? null;
            let name = item?.name ?? null;
            let price = item?.variant?.price ?? null;
            let sku = item?.sku ?? null;
            let quantity = item?.quantity ?? null;
            let title = item?.title ?? null;
            let variantTitle = item?.variant_title ?? null;
            let properties = item?.customAttributes?.map(prop => {
                let name = prop?.key ?? null;
                let value = prop?.value ?? null;
                return { name, value }
            });
            let variantID = parseInt(item?.variant?.id?.split("/").pop()) ?? null;
            let productID = parseInt(item?.product?.id?.split('/').pop()) ?? null;
            return { id, name, price, sku, quantity, title, variantTitle, properties, variantID, productID }
        })
        const shop = session?.shop;

        const dbCall = await orderCreation({ orderID, orderName, lineItems, shop, createdAt });
        // console.log("dbCall", JSON.stringify(dbCall, null, 4))
        return json({ status: 'success', data: dbCall, message: "Order successfull store in App" }, { status: STATUS_CODES.CREATED })

    } catch (error) {
        return json({ status: 'error', message: JSON.stringify(error) }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR })
    }
}

export default function OrderSync() {
    const location = useLocation();
	const submit = useSubmit();
    const nav = useNavigation();

    const actionData = useActionData();
    const loaderData = useLoaderData();

    console.log("actionData-----", actionData)
    console.log("loaderData-----", loaderData)
    const isLoading = ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";


    const [orderID, setOrderIDs] = useState('');
    const handleChange = useCallback((value) => setOrderIDs(value),[]);

    useEffect(() => {
        if (actionData && actionData?.status?.length) {
            if (actionData?.status === 'error') {
                shopify.toast.show(actionData?.message, { isError: true });
            }

            if (actionData?.status === 'success') {
                shopify.toast.show(actionData?.message, { isError: false });

                setOrderIDs('')
            }
        }
    }, [actionData])
    
    
    const submitHandle = async () => {
        console.log("orderID", orderID)
        // const stringToArray = convertToArray(orderID)
        // console.log(stringToArray)
        submit({
			orderID: orderID
		}, {
			action: "",
			method: "post",
			encType: "multipart/form-data",
			relative: "route",
		});
    }

    // const convertToArray = (input) => {
    //     if (!input || typeof input !== 'string') {
    //         return [];
    //     }
    
    //     return input
    //         .split(',')
    //         .map(item => item.trim())
    //         .filter(item => item !== '');
    // }

    return (
        <>
            { isLoading ? <Loader /> : null }
            <Page
				title={ "Order Sync" }
			>
                <SettingsNav 
                    currentRoute={ location } 
                />
                <Card>
                    <FormLayout>
                    <TextField
                        label="Enter order number"
                        value={ orderID }
                        onChange={handleChange}
                        // multiline={3}
                        autoComplete="off"
                        helpText="Please enter order id like '5826925527331'"
                    />

                    <Button
                        variant="primary"
                        onClick={ submitHandle }
                    >
                        Order Sync
                    </Button>
                    </FormLayout>
                </Card>
            </Page>
        </>
    )
}