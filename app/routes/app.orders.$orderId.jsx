import { authenticate } from "../shopify.server";
import {
	Card,
	Page,
	Grid,
	Text,
	ResourceList,
	ResourceItem,
	InlineStack,
	BlockStack,
	Layout,
	Select,
	Tag,
	Thumbnail,
} from "@shopify/polaris";
import React, { useCallback, useState, useEffect, useRef } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useNavigation, useActionData, useSubmit } from "@remix-run/react";
import prisma from '../db.server';
import { dataTimeFormat } from "../helpers/dataFormat";
import Loader from "../components/loader";
import OrderDetailSheet from "../components/orderDetailSheet";
import CustomBadge from "../components/badge";
import { STATUS_CODES } from "../helpers/response";

export const loader = async ({ request, params }) => {
	try {
		const { admin } = await authenticate.admin(request);
		let orderId = params.orderId

		const factories = await prisma.factories.findMany();
		const manufactureStatusInfo = await prisma.manufacturing_status.findMany();

		const response = await admin.graphql(
			`#graphql
			query getOrderDetails($orderId: ID!) {
				order(id: $orderId) {
					id
					name
					createdAt
					displayFinancialStatus
					displayFulfillmentStatus
					shippingAddress {
						address1
						address2
						city
						country
						firstName
						lastName
						province
						zip
						phone
					}
					customer {
						email			
						displayName
					}
					lineItems(first: 100) {
						nodes {
							id
							name
							sku
							title
							quantity
							variant {
								title
							}
							image {
								url
							}
						}
					}
				}
			}`,
			{
				variables: {
					orderId: `gid://shopify/Order/${orderId}`,
				}
			},
		);

		const responseJson = await response.json();

		let shopifyOrder = responseJson?.data?.order ?? null

		if (!shopifyOrder) {
			console.log("order not found")
		}

		shopifyOrder.lineItems = shopifyOrder?.lineItems?.nodes

		const getDbOrder = await prisma.shopify_orders.findUnique({
			where: {
				shopify_order_id: orderId
			}
		});

		// console.log("getDbOrder", JSON.stringify(getDbOrder?.line_items, null, 4))

		shopifyOrder.lineItems.forEach(item => {
			const getID = item?.id.split('/').pop()
			// console.log("getID", getID)
			const matchDbOrder = getDbOrder?.line_items?.find(dbID => dbID?.id === parseInt(getID))
			// console.log("matchDbOrder", matchDbOrder)
			const matchStatus = manufactureStatusInfo.find(mid => mid?.id === matchDbOrder?.manufacturingStatus);

			// console.log("matchStatus", matchStatus)
			// item
			item["manufacturingStatus"] = matchStatus ?? null
		})

		if (getDbOrder?.factory) {
			const matchFactory = factories.find(item => item?.id === getDbOrder?.factory)
			shopifyOrder["factory"] = matchFactory
		}
		// console.log("orders Response==============================================", JSON.stringify(shopifyOrder, null, 4))

		return json({ data: { order: shopifyOrder, factories: factories } }, { status: STATUS_CODES.OK });
	} catch (error) {
		console.error("Loader error:", error);
		return json({ error: "An error occurred during loading data." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
	}
};
export async function action({ request, params }) {
	try {
		const { session } = await authenticate.admin(request);
		const formData = await request.formData();
		const shopifyOrderId = params.orderId;
		const factory = formData.get('factory');
		// const lineItems = formData.get('lineItems')

		if (!shopifyOrderId) {
			console.error('shopify_order_id is null or undefined');
			return json({ error: 'shopify_order_id is null or undefined' }, { status: 400 });
		}

		const res = await prisma.shopify_orders.update({
			where: { "shopify_order_id": shopifyOrderId, "shop": session?.shop },
			data: { "factory": factory },
		});
		return json({ data: { order: res, message: "Factory updated successfully" } }, { status: STATUS_CODES.OK })
	} catch (error) {
		return json({ error: "An error occurred during the action.", message: error }, { status: STATUS_CODES.NOT_IMPLEMENTED });
	}
}

export default function OrderDetail() {
	const submit = useSubmit();
	const nav = useNavigation();
	const navigate = useNavigate();
	const loadedData = useLoaderData();
	const designSheetRef = useRef(null);
	// const isloading = nav.state == "loading";  
	const isloading = ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";

	// const factories = loadedData.factories;
	const actionData = useActionData();
	console.log("loadedData----------", loadedData)
	console.log("actionData---------", actionData)
	const [orderData, setOrderData] = useState(null)
	const [factories, setFactories] = useState([]);
	const [factoriesOptions, setFactoriesOptions] = useState([]);
	const [factory, setFactory] = useState("");

	const handleFactory = useCallback(
		(value) => {
			setFactory(value);
			// setIsStatusAssigned(true);
		},
		[],
	);

	useEffect(() => {
		if (loadedData?.data?.order) {
			setOrderData(loadedData?.data?.order ?? null);
			setFactory(loadedData?.data?.order?.factory?.id ?? "")
		}
		if (loadedData?.data?.factories) {
			setFactories(loadedData?.data?.factories ?? []);
		}
	}, [loadedData])

	useEffect(() => {
		if (actionData) {
			shopify.toast.show("factory saved Successfully!")
		}
	}, [actionData]);

	useEffect(() => {
		const tempFactoriesOptions = factories.map(factory => ({
			label: factory?.title,
			value: factory?.id,
		})) ?? []
		// @ts-ignore
		setFactoriesOptions(tempFactoriesOptions)
	}, [factories])

	const splitId = (gid) => {
		return gid.split('/').pop()
	}

	const updateStatus = () => {
		submit(
			{
				shopifyOrderId: loadedData.orderId,
				factory: factory,
			},
			{
				action: "",
				method: "post",
				encType: "multipart/form-data",
				relative: "route",
			});
	}

	// const print = () => {
	// 	const printContents = document.querySelector(".briskApp__order_print_wrap");
	// 	const appWrapper = document.querySelector(".Polaris-Page");
	// 	// console.log(printContents);
	// 	// @ts-ignore
	// 	appWrapper.style.display = "none";
	// 	// @ts-ignore
	// 	printContents.style.display = "block";
	// 	window.print();
	// 	// @ts-ignore
	// 	appWrapper.style.display = "block";
	// 	// @ts-ignore
	// 	printContents.style.display = "none";

	// }

	// useEffect(() => {
	// 	if (orderData) {
	// 		const printableContent = ReactDOMServer.renderToStaticMarkup(<OrderDetailSheet data={orderData} />)
	// 		// console.log("printableContent", printableContent)
	// 		const parser = new DOMParser();
	// 		const doc = parser.parseFromString(printableContent, "text/html").querySelector(".briskApp__order_print_wrap");
	// 		// console.log("doc", doc)
	// 		// @ts-ignore
	// 		document.body.appendChild(doc);
	// 	}
	// }, [orderData])

	const print = () => {
		var printContents = designSheetRef?.current?.innerHTML;
		console.log(printContents)
		// Create a new window for printing
		var printWindow = window.open('', 'Print-Window');
		printWindow?.document.open();
		printWindow?.document.write('<html><head><title>Print</title></head><body>');
		printWindow?.document.write(printContents);
		printWindow?.document.write('</body></html>');
		printWindow?.document.close();

		// Wait for content to load before printing
		printWindow.onload = function () {
			printWindow?.print();
			printWindow.onafterprint = function () {
				// Close the print window after printing
				printWindow?.close();
			};
		};
	}

	return (
		<>
			{nav.state === 'loading' ? <Loader /> : null}
			<Page
				title={`Order ${orderData?.name}`}
				backAction={{ url: `/app` }}
				subtitle={`Created: ${dataTimeFormat(orderData?.createdAt)}`}
				primaryAction={{
					content: 'Save',
					onAction: updateStatus,
					loading: isloading
				}}
				secondaryActions={[
					{
						content: 'Print order',
						onAction: print
					}
				]}
			>
				<Layout>
					<Layout.Section>
						<Grid>
							<Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 8, xl: 8 }}>
								<Card>
									<ResourceList
										alternateTool={<></>}
										resourceName={{ singular: "item", plural: "items" }}
										items={orderData?.lineItems ?? []}
										renderItem={(item) => {
											const {
												id,
												url,
												title,
												name,
												sku,
												variant,
												quantity,
												image,
												manufacturingStatus
											} = item;
											const handleClick = () => {
												navigate(`/app/orderItem/${splitId(orderData?.id)}-${splitId(id)}`);
											}
											const media = (
												<Thumbnail
													source={image?.url || ''}
													size="large"
													alt={name}
												/>
											);
											return (
												<ResourceItem
													id={id}
													url={url}
													media={media}
													accessibilityLabel={`View details for ${name}`}
													onClick={handleClick}
												>
													<InlineStack align="space-between">
														<div>
															<Text variant="bodyMd" fontWeight="bold" as="h3">
																{title}
															</Text>
															<Tag>{variant?.title}</Tag>
															<Text as="h3" variant="bodyMd" fontWeight="bold">
																SKU: {sku}
															</Text>
															<Text as="h3" variant="bodyMd" fontWeight="bold">
																Quantity: {quantity}
															</Text>
														</div>
														{manufacturingStatus && (
															<div>
																<CustomBadge fontSize="12px" color={manufacturingStatus?.color_code} title={manufacturingStatus?.title} />
															</div>
														)}
													</InlineStack>
												</ResourceItem>
											);
										}}
									/>
								</Card>
							</Grid.Cell>
							<Grid.Cell columnSpan={{ xs: 2, sm: 2, md: 2, lg: 4, xl: 4 }}>
								<BlockStack gap="400">
									<Card>
										<Select
											label="Factory"
											options={factoriesOptions}
											placeholder="Select factory"
											onChange={handleFactory}
											value={factory}
										/>
									</Card>
									<Card>
										<BlockStack gap="300">
											<div>
												<Text as="h3" fontWeight="bold">
													Customer
												</Text>
												<Text as="dt">{orderData?.customer?.displayName}</Text>
											</div>
											<div>
												<Text as="h3" fontWeight="bold">
													Contact information
												</Text>
												<Text as="dt">{orderData?.email}</Text>
												<Text as="dt">{orderData?.shippingAddress?.phone}</Text>
											</div>
											<div>
												<Text as="h3" fontWeight="bold">
													Shipping address
												</Text>
												<Text as="dt">
													{orderData?.shippingAddress?.address1}
												</Text>
												<Text as="dt">
													{orderData?.shippingAddress?.address2}
												</Text>

												<Text as="dt">
													{orderData?.shippingAddress?.city} {"  "} {orderData?.shippingAddress?.zip}
												</Text>
												<Text as="dt">
													{orderData?.shippingAddress?.province}
												</Text>
												<Text as="dt">
													{orderData?.shippingAddress?.country}
												</Text>
												<Text as="dt">{orderData?.shippingAddress?.phone}</Text>
											</div>
										</BlockStack>
									</Card>
								</BlockStack>
							</Grid.Cell>
						</Grid>
					</Layout.Section>
				</Layout>
				<div className="jjj" ref={designSheetRef} style={{ display: "none" }}>
					<OrderDetailSheet data={orderData} />
				</div>
			</Page>
		</>
	);
}
