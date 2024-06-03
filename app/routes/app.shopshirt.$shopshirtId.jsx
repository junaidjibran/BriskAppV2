// @ts-nocheck
import { BlockStack, Button, Banner, Card, InlineStack, Page, ResourceItem, ResourceList, Text, Thumbnail } from "@shopify/polaris";
import { useEffect, useState } from "react";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import prisma from "../db.server";
import {
    useLoaderData,
    useSubmit,
    useNavigation,
    useActionData
} from "@remix-run/react";
import { fetchProductQuery } from '../queries/productQueries.js'
import Loader from '../components/loader';
import NotLoggedInScreen from "../components/notLoggedInScreen.jsx";
import { loggedInCheck } from "../controllers/users.controller.js";
import { STATUS_CODES } from "../helpers/response.js";
import AccessScreen from "../components/accessScreen.jsx";

export async function loader({ request, params }) {
    try {
        const { admin, session, sessionToken } = await authenticate.admin(request);
        if (!admin) {
            return json({ err: 'Not authenticated' })
        }

        const isLoggedIn = await loggedInCheck({ sessionToken })
        if (!isLoggedIn) {
            return json({ status: "NOT_LOGGED_IN", message: "You are not loggedIn." })
        }

        const shopshirtId = params.shopshirtId

        console.log('-----------params', params.shopshirtId)

        const shopshirt = await prisma.shop_shirt.findUnique({
            where: {
                shop: session?.shop,
                id: shopshirtId,
            },
        })
        console.log(' shopshirtiddd', shopshirtId)
        let shopshirtProduct = await admin.graphql(fetchProductQuery,
            {
                variables: {
                    id: shopshirt?.product_id
                },
            }
        );

        shopshirtProduct = await shopshirtProduct.json();

        if (shopshirtProduct?.data?.product) {
            const product = shopshirtProduct?.data?.product
            const productJson = {
                id: product?.id,
                productTitle: product?.title,
                productAlt: product?.featuredImage?.altText,
                productImage: product?.featuredImage?.url,
            }
            shopshirt.product = productJson
        }

        const vectorsData = await prisma.vectors.findMany({
            where: {
                type: "ShopShirt"
            }
        })

        console.log('--------vectorsData', shopshirt);

        return json(
            {
                data: {
                    shopshirt,
                    vectorsData,
                    scopes: isLoggedIn?.access,
                    isAdmin: isLoggedIn?.is_admin
                }
            },
            { status: STATUS_CODES.OK }
        )
        // return json({ shopshirt, vectorsData })
    } catch (error) {
        return json({ error: JSON.stringify(error) }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
}

export async function action({ request, params }) {
    try {
        const formData = await request.formData();
        const shopshirtId = params.shopshirtId
        const productId = formData.get('product');
        const vectors = formData.get('vectors');

        if (!productId || !vectors) {
            return json({ status: "error", message: "Missing product or vectors" }, { status: STATUS_CODES.BAD_REQUEST });
        }

        // console.log('--------product', productId, vectors);
        const { session } = await authenticate.admin(request);

        const res = await prisma.shop_shirt.update({
            where: {
                id: shopshirtId,
                shop: session.shop
            },
            data: {
                "product_id": productId,
                "vectors_ids": vectors.split(','),
            }
        })

        return json({ data: res, status: "success", message: "Shopshirt update success." });
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

export default function ShopShirtDetail() {
    const [selectedProducts, setSelectedProducts] = useState([])
    const submit = useSubmit();
    const nav = useNavigation();
    const actionData = useActionData();
    const loaderData = useLoaderData();
    const isLoading = ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";
    const [selectedItems, setSelectedItems] = useState([]);
    const [errors, setErrors] = useState([]);

    console.log('--------loaderData', loaderData);
    console.log('--------actionData', actionData);

    useEffect(() => {
        if (loaderData?.data?.shopshirt?.vectors_ids) {
            setSelectedItems(loaderData?.data?.shopshirt?.vectors_ids)
        }
        if (loaderData?.data?.shopshirt?.product) {
            setSelectedProducts([loaderData?.data?.shopshirt?.product])
        }
    }, [loaderData])

    useEffect(() => {
        if (actionData && actionData?.status?.length) {
            if (actionData?.status === 'error') {
                shopify.toast.show(actionData?.message, { isError: true });
            }

            if (actionData?.status === 'success') {
                shopify.toast.show(actionData?.message, { isError: false });
                // navigate(`/app/shopshirt/${actionData?.data?.id}`);
            }
        }
    }, [actionData])

    // useEffect(() => {
    //     console.log({ selectedProducts })
    // }, [selectedProducts])

    async function selectProduct() {
        const products = await window.shopify.resourcePicker({
            // type: "product",
            // multiple: false,
            // filter: {
            //     variants: false
            // },
            // action: "select",
            // query: selectedProducts?.productTitle,
            // // selectionIds: [selectedProducts?.id]

            type: "product",
            multiple: false,
            action: "select",
            filter: {
                variants: false
            },
            query: selectedProducts[0]?.productTitle ?? "",
            selectionIds: selectedProducts?.map(item => {
                return { id: item?.id }
            }) ?? [],
        });


        console.log("products", products)

        if (products) {
            console.log(products)
            const allSelectedProducts = products.map(product => {
                const { images, id, title, handle } = product;
                return {
                    id: id,
                    // productVariantId: variants[0].id,
                    productTitle: title,
                    productHandle: handle,
                    productAlt: images[0]?.altText,
                    productImage: images[0]?.originalSrc,
                }
            });
            setSelectedProducts(allSelectedProducts);
        }
    }

    const updateShopShirt = () => {
        if (!selectedProducts.length) {
            shopify.toast.show("Please select product.", { isError: true });
            return false;
        }
        if(!selectedItems.length) {
            shopify.toast.show("Please select any vector.", { isError: true });
            return false; 
        }
        // if (!selectedProducts.length || !selectedItems.length) return
        submit({
            product: selectedProducts[0]?.id,
            vectors: selectedItems
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
                { nav.state === 'loading' ? <Loader /> : null }
                <NotLoggedInScreen />
            </>
        )
    }

    if (!loaderData?.data?.isAdmin && !loaderData?.data?.scopes?.includes('write_shopshirt')) {
        return (
            <>
                { nav.state === 'loading' ? <Loader /> : null } 
                <AccessScreen />
            </>
        )
    }

    return (
        <>
            {nav.state === 'loading' ? <Loader /> : null}
            <Page
                title="Update shop shirt"
                backAction={{ url: "../shopshirt" }}
                primaryAction={<Button loading={isLoading} onClick={updateShopShirt} variant="primary">Update</Button>}
            // secondaryActions={ renderSecondaryActions() }
            >
                {
                    errors.length > 0 ?
                        <div style={{ marginBottom: '15px' }}>
                            <Banner
                                onDismiss={() => { }}
                                title="Errors"
                                tone="critical"
                            >
                                <div>
                                    {
                                        errors.map((error) => {
                                            return <Text key={error}>{error}</Text>
                                        })
                                    }
                                </div>
                            </Banner>
                        </div>
                        : null
                }

                <BlockStack gap="300">
                    <Card>
                        <InlineStack align="space-between">
                            <div>
                                {
                                    selectedProducts?.length > 0 ? selectedProducts.map(item => {
                                        let productImage = item?.productImage
                                        let productTitle = item?.productTitle
                                        let productAlt = item?.productAlt

                                        return (
                                            <div key={item?.id}>
                                                <InlineStack wrap={false} gap="400" blockAlign='start' margin-left="100px">
                                                    <Thumbnail
                                                        source={productImage}
                                                        size="large"
                                                        alt={productAlt}
                                                    />
                                                    <div>
                                                        <Text variant="bodyMd" fontWeight="bold" as="h1">
                                                            {productTitle}
                                                        </Text>
                                                    </div>

                                                </InlineStack>
                                            </div>
                                        )
                                    }) : (
                                        <Card>
                                            <h1>No product Selected</h1>
                                        </Card>
                                    )
                                }
                            </div>
                            <div>
                                <Button onClick={selectProduct}>Change Product</Button>
                            </div>
                        </InlineStack>
                    </Card>

                    {
                        <Card>
                            {/* <div style={{ marginBottom: '20px' }}>
                            <Autocomplete
                                allowMultiple
                                options={list}
                                selected={[]}
                                textField={<Autocomplete.TextField
                                    label="Shop Shirt Vecotrs"
                                    placeholder="Select shop shirt vecotrs"
                                    autoComplete="off"
                                />}
                                onSelect={ () => alert('Select item')}
                                listTitle="Suggested Tags"
                            />
                        </div> */}
                            <ResourceList
                                resourceName={{ singular: "Vector", plural: "Vectors" }}
                                selectable
                                items={loaderData?.data?.vectorsData}
                                selectedItems={selectedItems}
                                onSelectionChange={setSelectedItems}
                                renderItem={(item) => {
                                    const { id, title, img_cdn, title_english, title_urdu, value_urdu, value_english } = item;
                                    const media = <Thumbnail
                                        source={img_cdn}
                                        size="small"
                                        alt={title}
                                    />
                                    // const shortcutActions = [
                                    //     {
                                    //         content: "Delete",
                                    //         accessibilityLabel: `View ${title}’s latest order`,
                                    //     }
                                    // ]

                                    return (
                                        // @ts-ignore
                                        <ResourceItem
                                            id={id}
                                            media={media}
                                            accessibilityLabel={`View details for ${title}`}
                                            //shortcutActions={shortcutActions}
                                            persistActions

                                        >
                                            <Text variant="bodyMd" fontWeight="bold" as="p">
                                                <InlineStack>
                                                    {title_english} :
                                                    <div style={{ marginLeft: '15px' }}>
                                                        {value_english}
                                                    </div>
                                                </InlineStack>
                                                <InlineStack>
                                                    {value_urdu} :
                                                    <div style={{ marginLeft: '15px' }}>
                                                        {title_urdu}
                                                    </div>
                                                </InlineStack>
                                            </Text>
                                            {/* <div>{value}</div> */}
                                        </ResourceItem>
                                    );
                                }}
                            />
                        </Card>
                    }
                </BlockStack>
                {/* {
                    (!selectedProducts.length && !vectorsList.length) ? (
                        <Card>
                            <div style={{ paddingTop: "50px" }}>
                                <EmptyState
                                    heading="Add Shop shirt product"
                                    action={{content: 'Add product', onAction: () => selectProduct()}}
                                    image=""
                                >
                                    <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printe.</p>
                                </EmptyState>
                            </div>
                        </Card>
                    ) : (
                            selectedProducts?.length ? selectedProducts.map(item => {
                                let productImage = item?.productImage
                                let productTitle = item?.productTitle
                                let productAlt = item?.productAlt
                                return (
                                    <>
                                        <Card>
                                            <div>
                                                <InlineStack wrap={false} gap="400" blockAlign='start' margin-left="100px">
                                                    <Thumbnail
                                                        source={productImage}
                                                        size="large"
                                                        alt={ productAlt }
                                                    />
                                                    <div>
                                                        <Text variant="bodyMd" fontWeight="bold" as="h1">
                                                            { productTitle }
                                                        </Text>
                                                        <Text as="p">
                                                            $100.00
                                                        </Text>
                                                    </div>
                                                    <div style={{ marginLeft: 'auto' }}>
                                                        <Button variant="primary" onClick={ () => removeProduct() }>Remove</Button>
                                                    </div>
                                                </InlineStack>
                                            </div>
                                        </Card>
                                    </>
                                ) 
                            }) : (
                                <h1>No product Selected</h1>
                            )
                    )
                } */}

            </Page>
        </>
    )
}