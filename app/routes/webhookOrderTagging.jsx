import { STATUS_CODES } from "../helpers/response";
import { authenticate } from "../shopify.server";
// import { createOrderTagLog } from "~/controllers/ordertagging";
import { orderCreation } from "../controllers/ordersController";
// import { appSubscriptionUpdated } from "~/controllers/subscriptionController";

const TARGET_COLLECTION = {
	order_custom_size: process.env.NODE_ENV == 'production' ? "design-your-shirt" :  "testing-collection-1",
	shop_shirt: process.env.NODE_ENV == 'production' ? "all-shirts" : "testing-collection-2"
}

console.log("TARGET_COLLECTION", TARGET_COLLECTION)


export const action = async ({ request }) => {
	const { shop, admin, payload } = await authenticate.webhook(request);
	// 
	// console.log('---------subs called')
	if (!admin) {
		console.log("not admin", admin)
		// The admin context isn't returned if the webhook fired after a shop was uninstalled.
		throw new Response();
	}

	// console.log('---------subs called 2')
	try {
		if (shop && payload) {
			// console.log("Shop", shop, JSON.stringify(payload, null, 4));
			console.log("has Session-------------------")
			const statusArray = [];
			const payloadLineItems = payload?.line_items;

			for (let index = 0; index < payloadLineItems.length; index++) {
				const lineItem = payloadLineItems[index];
				const getResp = await admin.graphql.query({
					data: {
						query: `#graphql 
							query getProduct($id: ID!) {
							product(id: $id) {
								title
								handle
								collections(first: 50) {
									nodes {
										handle
									}
								}
							}
						}`,
						variables: {
							"id": `gid://shopify/Product/${lineItem?.product_id}`
						}
					}
				});
				const getProductData = getResp.body;
				const collectionsHandles = getProductData?.data?.product?.collections?.nodes.map(handle => handle.handle) ?? []
				console.log("getResp --- get Product API", JSON.stringify(collectionsHandles, null, 4))
				if (
					collectionsHandles &&
					collectionsHandles.length &&
					(collectionsHandles.includes(TARGET_COLLECTION.order_custom_size) || collectionsHandles.includes(TARGET_COLLECTION.shop_shirt))) {
					console.log("This order is from target collection and need to apply tag on current order");
					statusArray.push(true);
				} else {
					statusArray.push(false);
				}
			}
			console.log("statusArray", statusArray)

			if (statusArray.length && statusArray.some((value) => value === true) ) {
				// console.log('API call to add tag on order', JSON.stringify(payload, null, 4));
				const orderID = payload?.id;
				const orderName = payload?.name;
				const createdAt = payload?.created_at
				// const shippingAddress = payload?.shipping_address;
				// const billingAddress = payload?.billing_address;
				// const customDetails = payload?.customer ? {
				// 	first_name: payload?.customer?.first_name,
				// 	last_name: payload?.customer?.last_name,
				// 	email: payload?.customer?.email,
				// } : null;
				const lineItems = payload?.line_items?.map(item => {
					let id = item?.id ?? null;
					let name = item?.name ?? null;
					let price = item?.price ?? null;
					let sku = item?.sku ?? null;
					let quantity = item?.quantity ?? null;
					let title = item?.title ?? null;
					let variantTitle = item?.variant_title ?? null;
					let properties = item?.properties;
					let variantID = item?.variant_id;
					let productID = item?.product_id
					return { id, name, price, sku, quantity, title, variantTitle, properties, variantID, productID }
				})
				const tempPayload = {
					orderID, orderName, lineItems, createdAt
				}
				console.log("payload-------------", JSON.stringify(tempPayload, null, 4))
				const dbCall = await orderCreation({ orderID, orderName, lineItems, shop, createdAt });
				console.log("DB call for save order Data-==-=--=-=-=-=-=-=-=-=-=-=-=-=", JSON.stringify(dbCall, null, 4));
				// const getOrderTags = await admin.graphql.query({
				// 	data: {
				// 		query: `#graphql 
				// 		query getOrderTags($id: ID!) {
				// 			order(id: $id) {
				// 				tags
				// 			}
				// 		}`,
				// 		variables: {
				// 			"id": `gid://shopify/Order/${payload?.id}`
				// 		}
				// 	}
				// });
				// // console.log("getOrderData-----------------------------", JSON.stringify(getOrderTags, null, 4))
				// const getOrderData = getOrderTags.body;
				// const ordersTagsArray = getOrderData?.data?.order?.tags ?? [];

				// ordersTagsArray.push('BriskP')

				// if (ordersTagsArray.length) {
				// 	const setOrderTags = await admin.graphql.query({
				// 		data: {
				// 			query: `#graphql 
				// 			mutation setOrderTags($input: OrderInput!) {
				// 				orderUpdate(input: $input) {
				// 					order {
				// 						tags
				// 					}
				// 					userErrors {
				// 						message
				// 						field
				// 					}
				// 				}
				// 			}`,
				// 			variables: {
				// 				"input": {
				// 					"id": `gid://shopify/Order/${payload?.id}`,
				// 					"tags": ordersTagsArray.join(', ')
				// 				}
				// 			}
				// 		}
				// 	});
				// 	if (!setOrderTags?.body?.data?.orderUpdate || 
				// 		(setOrderTags?.body?.data?.orderUpdate?.userErrors && setOrderTags?.body?.data?.orderUpdate?.userErrors?.length)) {
				// 		console.log("tag not added due to reson");
				// 		const dbCall = await createOrderTagLog({
				// 			order_id: payload?.id,
				// 			order_number: payload?.order_number,
				// 			message: JSON.stringify(setOrderTags?.body) ?? "Something went wrong! Error Due to add to on order :: userErrors :: Shopify"
				// 		})
				// 		// const dbCall = await prisma.order_tag_logs.create({
				// 		//   data: {
				// 		//     // @ts-ignore
				// 		//     order_id: payload?.id,
				// 		//     order_number: payload?.order_number,
				// 		// 	message: JSON.stringify(setOrderTags?.body) ?? "Something went wrong! Error Due to add to on order :: userErrors :: Shopify"
				// 		//   }
				// 		// })
				// 		console.log("DB call", JSON.stringify(dbCall, null, 2))
				// 	}

				// 	const dbCall = await createOrderTagLog({
				// 		order_id: payload?.id,
				// 		order_number: payload?.order_number,
				// 		message: JSON.stringify(setOrderTags?.body?.data?.orderUpdate?.order?.tags) ?? "Error:: Something went wrongs!"
				// 	})

				// 	// const dbCall = await prisma.order_tag_logs.create({
				// 	// 	data: {
				// 	// 	  // @ts-ignore
				// 	// 	  order_id: payload?.id,
				// 	// 	  order_number: payload?.order_number,
				// 	// 	  message: JSON.stringify(setOrderTags?.body?.data?.orderUpdate?.order?.tags) ?? "Error:: Something went wrongs!"
				// 	// 	}
				// 	// })
				// 	  console.log("DB call", JSON.stringify(dbCall, null, 2))
				// 	// console.log("setOrderTags---------------------------", JSON.stringify(setOrderTags, null, 4))
				// }
			}
			throw new Response("{}", { status: STATUS_CODES.OK });
		}
	}
	catch (err) {
		console.log('', err)
	}
	throw new Response();
};
