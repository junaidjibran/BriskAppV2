import prisma from '../db.server';
import { authenticate } from "../shopify.server";
import { useLoaderData, useActionData, useNavigation, useSubmit } from '@remix-run/react';
import {
	Page,
	Card,
	Text,
	ResourceList,
	Button,
	ButtonGroup,
	ResourceItem,
	Thumbnail,
	InlineStack,
	Layout,
	Grid,
	Select,
	TextField,
	Modal,
	Badge,
	Divider,
	BlockStack,
	FormLayout
} from '@shopify/polaris';
import { useState, useCallback, useEffect, useRef } from 'react';
import { json } from "@remix-run/node";
import DesignSheet from '../components/designSheet';
import Loader from '../components/loader';
import { dataTimeFormat } from '../helpers/dataFormat';
import { prismaCreateNote, prismaDeleteNote, prismaUpdateNote } from '../controllers/notes';
import { DeleteIcon, EditIcon } from '@shopify/polaris-icons';
import { STATUS_CODES } from '../helpers/response';
import { jsonLogs } from '../helpers/logs';
import NotLoggedInScreen from '../components/notLoggedInScreen';
import { loggedInCheck } from '../controllers/users.controller';
import AccessScreen from '../components/accessScreen';

export const loader = async ({ request, params }) => {
	try {
		const { sessionToken } = await authenticate.admin(request)

		const isLoggedIn = await loggedInCheck({ sessionToken })
        if (!isLoggedIn) {
            return json({ status: "NOT_LOGGED_IN", message: "You are not loggedIn." })
        }

		if (!params.id) {
			return json({ status: "error", message: "parems: Order id or lineItem id not found" }, { status: STATUS_CODES.BAD_REQUEST })
			// throw Error('Parems Not found!')
		}
		const orderId = params?.id.split('-')[0];
		const lineItemId = params.id?.split('-')[1];
		if (!orderId) {
			return json({ status: "error", message: "parems: Order id not found" }, { status: STATUS_CODES.BAD_REQUEST })
			// throw Error('Parems Not found!')
		}
		if (!lineItemId) {
			return json({ status: "error", message: "parems: lineItem id not found" }, { status: STATUS_CODES.BAD_REQUEST })
			// throw Error('Parems Not found!')
		}

		const { session, admin } = await authenticate.admin(request);
		const getManufacturingStatus = await prisma.manufacturing_status.findMany();
		//const lineItems = await prisma.shopify_orders.findMany();

		const notesData = await prisma.notes.findMany({
			where: {
				order_id: orderId,
				line_item_id: lineItemId,
				shop: session?.shop
			}
		})

		// console.log("bd wherer", JSON.stringify({
		// 	where: {
		// 		shopify_order_id: orderId,
		// 		line_items: {
		// 			has: {
		// 				id: parseInt(lineItemId, 10)
		// 			}
		// 		}
		// 	}
		// }, null, 4))

		const getDbOrder = await prisma.shopify_orders.findUnique({
			where: {
				shopify_order_id: orderId
			}
		})

		if (!getDbOrder) {
			return json({ status: "error", message: `Order ${orderId} not found in DB` }, { status: STATUS_CODES.NOT_FOUND })
		}

		const getLineItem = getDbOrder?.line_items?.find(item => item?.id === parseInt(lineItemId, 10));

		if (!getLineItem) {
			return json({ status: "error", message: `LineItem ${lineItemId} not found in DB` }, { status: STATUS_CODES.NOT_FOUND })
		}

		const shopifyOrderResp = await admin.graphql(
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
								product {
									id
									title
									tags
								}
								customAttributes {
									key
									value
								}
								variant {
									title
								}
								image {
									url
								}
							}
						}
						# name
						# id
						# createdAt
						# lineItems(first: 50) {
						# 	nodes {
						# 		id
						# 		sku
						# 		quantity
						# 		title
						# 		variant {
						# 			title
						# 		}
						# 		customAttributes {
						# 			key
						# 			value
						# 		}
						# 		originalUnitPriceSet {
						# 			presentmentMoney {
						# 				amount
						# 				currencyCode
						# 			}
						# 		}
						# 		image {
						# 			src
						# 		}
						# 		product {
						# 			id
						# 			title
						# 			tags
						# 		}
						# 	}
						# }
					}
				}
			`,
			{
				variables: {
					orderId: `gid://shopify/Order/${orderId}`,
				},
			},
		);


		const shopifyOrderData = await shopifyOrderResp.json();

		let shopifyOrder = shopifyOrderData?.data?.order ?? null;
		shopifyOrder.lineItems = shopifyOrder?.lineItems.nodes
		const filteredLineItems = shopifyOrder?.lineItems.find((item) => item.id.split('/').pop() === lineItemId);

		const vectorsDataPayload = getLineItem?.properties?.map(item => {
			let title_english = item.name;
			let value_english = item.value;
			let updated_at = item?.updated_at ?? null
			return { title_english, value_english, updated_at }
		})

		jsonLogs(vectorsDataPayload, "vectorsDataPayload-------------------------------------------------------")

		let vectorsData = [];
		if (filteredLineItems?.product?.tags?.includes('BRISK_APP_shop_shirt')) {
			let targetAttributesDynamic = getLineItem?.properties.map(item => {
				let title_english = item.name.toString();
				let value_type = "Dynamic";
				let type = "ShopShirt";
				return { title_english, value_type, type }
			});

			let targetAttributesConstant = getLineItem?.properties.map(item => {
				let title_english = item.name.toString();
				let value_english = item.value.toString();
				let value_type = "Constant";
				let type = "ShopShirt";
				return { title_english, value_english, value_type, type }
			});

			let tempPayload = [...targetAttributesDynamic, ...targetAttributesConstant]

			vectorsData = await prisma.vectors.findMany({
				where: {
					OR: tempPayload
				}
			})

			let productID = filteredLineItems?.product?.id;
			let getShopShirt = await prisma.shop_shirt.findUnique({
				where: {
					product_id: productID,
					shop: session?.shop
				}
			})

			if (getShopShirt) {
				let tempVectorData = await prisma.vectors.findMany({
					where: {
						OR: getShopShirt.vectors_ids.map(item => {
							let id = item;
							return { id };
						})
					}
				})
				// vectorsData = 

				tempVectorData.forEach(item => {
					getLineItem?.properties.push({
						name: item?.title_english,
						value: item?.value_english
					})
				})
				vectorsData = [...vectorsData, ...tempVectorData];
			}
		} else {
			if (vectorsDataPayload.length) {
				let targetAttributesDynamic = getLineItem?.properties.map(item => {
					let title_english = item.name.toString();
					let value_type = "Dynamic";
					let type = "CustomOrder";
					return { title_english, value_type, type }
				});

				let targetAttributesConstant = getLineItem?.properties.map(item => {
					let title_english = item.name.toString();
					let value_english = item.value.toString();
					let value_type = "Constant";
					let type = "CustomOrder";
					return { title_english, value_english, value_type, type }
				});

				let tempPayload = [...targetAttributesDynamic, ...targetAttributesConstant]

				vectorsData = await prisma.vectors.findMany(
					{
						where: {
							OR: tempPayload
						}
					}
				);
			}
		}

		let modifiedAttributes = [...getLineItem?.properties];
		for (let i = 0; i < modifiedAttributes.length; i++) {
			for (let j = 0; j < vectorsData.length; j++) {
				if ((modifiedAttributes[i].name === vectorsData[j].title_english &&
					modifiedAttributes[i].value === vectorsData[j].value_english) ||
					(modifiedAttributes[i].name === vectorsData[j].title_english &&
						vectorsData[j].value_type === 'Dynamic')) {
					modifiedAttributes[i] = {
						...modifiedAttributes[i],
						title_urdu: vectorsData[j].title_urdu,
						value_urdu: vectorsData[j].value_urdu,
						// Update the object in modifiedAttributes with values from vectorsData
						id: vectorsData[j].id,
						img_cdn: vectorsData[j].img_cdn,
						type: vectorsData[j].type,
						value_type: vectorsData[j].value_type
						// You can add more properties from vectorsData if needed
					};
					break; // Exit the inner loop once a match is found
				}
			}
		}

		//  This is optimized code use in next time.
		// let modifiedAttributes = [...getLineItem?.properties];
		// for (let i = 0; i < modifiedAttributes.length; i++) {
		// 	let matchingVector = vectorsData.find(vector =>
		// 		(modifiedAttributes[i].name === vector.title_english &&
		// 			modifiedAttributes[i].value === vector.value_english) ||
		// 		(modifiedAttributes[i].name === vector.title_english &&
		// 			vector.value_type === 'Dynamic')
		// 	);

		// 	if (matchingVector) {
		// 		modifiedAttributes[i] = {
		// 			...modifiedAttributes[i],
		// 			title_urdu: matchingVector.title_urdu,
		// 			value_urdu: matchingVector.value_urdu,
		// 			id: matchingVector.id,
		// 			img_cdn: matchingVector.img_cdn,
		// 			type: matchingVector.type,
		// 			value_type: matchingVector.value_type
		// 		};
		// 	}
		// }


		let modifiedAttributesTemp = modifiedAttributes.map(item => {
			let title_english = item.name ?? null;
			let value_english = item.value ?? null;
			let title_urdu = item.title_urdu ?? null;
			let value_urdu = item.value_urdu ?? null;
			// let id = item.id ?? null;
			let img_cdn = item.img_cdn ?? null;
			let type = item.type ?? null;
			let value_type = item.value_type ?? null;
			return { title_english, value_english, title_urdu, value_urdu, img_cdn, type, value_type }
		})
		filteredLineItems['customAttributes'] = modifiedAttributesTemp;

		const finalOrderData = Object.assign({}, getDbOrder)
		delete finalOrderData?.line_items;

		let tempLineItem = Object.assign({}, getLineItem);
		tempLineItem["customAttributes"] = modifiedAttributesTemp;

		if (tempLineItem?.manufacturingStatus) {
			const matchManufacturingStatus = getManufacturingStatus.find(item => item?.id === tempLineItem?.manufacturingStatus)
			tempLineItem["manufacturingStatus"] = matchManufacturingStatus
		}
		tempLineItem["variantTitle"] = !tempLineItem?.variant_title ? filteredLineItems?.variant?.title : null
		tempLineItem["image"] = !tempLineItem?.image?.url ? filteredLineItems?.image?.url : null

		delete tempLineItem?.properties;

		const result = {
			order: finalOrderData,
			manufacturingStatus: getManufacturingStatus,
			lineItem: tempLineItem,
			notesData,
			scopes: isLoggedIn?.access, 
			isAdmin: isLoggedIn?.is_admin
		};

		return json({ data: result }, { status: STATUS_CODES.OK });
	} catch (error) {
		console.error('Loader error:', error);
		return json({ error: error }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR })
	}
};

export async function action({ request, params }) {
	try {
		if (!params.id) {
			return json({ error: "parems: Order id or lineItem id not found" }, { status: STATUS_CODES.BAD_REQUEST })
		}
		const shopifyOrderId = params?.id.split('-')[0];
		const lineItemId = params.id?.split('-')[1];
		if (!shopifyOrderId) {
			return json({ error: "parems: Order id not found" }, { status: STATUS_CODES.BAD_REQUEST })
		}
		if (!lineItemId) {
			return json({ error: "parems: lineItem id not found" }, { status: STATUS_CODES.BAD_REQUEST })
		}

		const formData = await request.formData();
		const { session } = await authenticate.admin(request);

		const status = formData.get('status');
		const note = formData.get('notes');
		const noteID = formData.get('note_id')
		const actionType = formData.get('action_type')

		console.log("actionType----------------------------", actionType)


		if (actionType === 'CREATE_NOTE' || actionType === 'UPDATE_NOTE' || actionType === 'DELETE_NOTE') {
			if (actionType === 'CREATE_NOTE') {
				const notesRes = await prismaCreateNote({ orderID: shopifyOrderId, lineItemID: lineItemId, note, shop: session?.shop })
				return { statusCode: 202, data: notesRes }
			} else if (actionType === 'UPDATE_NOTE') {
				const notesRes = await prismaUpdateNote({ note, noteID })
				return { statusCode: 202, data: notesRes }
			} else if (actionType === 'DELETE_NOTE') {
				const notesRes = await prismaDeleteNote({ noteID })
				return { statusCode: 202, data: notesRes }
			}
		} else if (actionType === 'UPDATE_PROP') {
			const data = formData.get('data');
			const respData = JSON.parse(data)
			jsonLogs(respData, "resp-----actionType-")
			console.log(respData);
			const getDbOrder = await prisma.shopify_orders.findUnique({
				where: { shopify_order_id: shopifyOrderId }
			});

			if (!getDbOrder) {
				return json({ error: `Order ${shopifyOrderId} not found in DB` }, { status: STATUS_CODES.NOT_FOUND })
			}

			const lineItemPayload = getDbOrder?.line_items?.map(item => {
				if (item?.id === parseInt(lineItemId, 10)) {
					return {
						...item,
						properties: item?.properties?.map((itemProp, itemPropindex) => {
							if (itemPropindex === respData?.id) {
								return {
									...itemProp,
									value: respData?.value,
									updated_at: new Date().toISOString()
								};
							}
							return itemProp;
						})
					};
				}
				return item;
			});

			const updateItemStatus = await prisma.shopify_orders.update({
				where: { shopify_order_id: shopifyOrderId },
				data: {
					line_items: {
						set: lineItemPayload
					}
				}
			});

			return json({ resp: { data: updateItemStatus, message: "Update option successfully!", type: "UPDATE_PROP" } }, { status: STATUS_CODES.ACCEPTED })

		} else {
			const getDbOrder = await prisma.shopify_orders.findUnique({
				where: { shopify_order_id: shopifyOrderId }
			});

			if (!getDbOrder) {
				return json({ error: `Order ${shopifyOrderId} not found in DB` }, { status: STATUS_CODES.NOT_FOUND })
			}

			// jsonLogs(getDbOrder, "getDbOrder-------------------------------")

			const lineItemPayload = getDbOrder?.line_items?.map(item => {
				if (item?.id === parseInt(lineItemId, 10)) {
					return { ...item, manufacturingStatus: status };
				}
				return item;
			});

			jsonLogs(lineItemPayload, "LineItems------------")

			const updateItemStatus = await prisma.shopify_orders.update({
				where: { shopify_order_id: shopifyOrderId },
				data: {
					line_items: {
						set: lineItemPayload
					}
				}
			})

			console.log("updateItemStatus-----", JSON.stringify(updateItemStatus))
			return json({ resp: { data: updateItemStatus, message: "Update status successfully!", type: "UPDATE_STATUS" } }, { status: STATUS_CODES.CREATED })
		}
	} catch (error) {
		return json({ error: JSON.stringify(error) }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR })
	}

}

export default function LineItemDetails() {
	const submit = useSubmit();
	// const { id } = useParams()
	const actionData = useActionData();
	const loadedData = useLoaderData();
	const nav = useNavigation();
	const designSheetRef = useRef(null);

	// const lineItemId = id?.split('-')[1];
	const isLoading = ["loading", "submitting"].includes(nav?.state) && ["POST", "PUT", "DELETE"].includes(nav?.formMethod);

	const [orderData, setOrderData] = useState(null);
	const [lineItem, setLineItem] = useState(null);
	const [manufacturingStatus, setManufacturingStatus] = useState([]);
	const [currentManufacturingStatus, setCurrentManufacturingStatus] = useState("");
	const [notes, setNotes] = useState([]);


	const [notesValue, setNotesValue] = useState('');
	const [isPostLoading, setIsPostLoading] = useState(false);
	const [isDeleteLoading, setIsDeleteLoading] = useState(false);
	const [isUpdateLoading, setIsUpdateLoading] = useState(false);
	const [editedNote, setEditedNote] = useState('');
	const [editNoteId, setEditNoteId] = useState(null);
	const [toDelete, setToDelete] = useState('');
	const [activeDelete, setActiveDelete] = useState(false);
	const [selectedItem, setSelectedItem] = useState(null);

	const [isEditModal, setIsEditModal] = useState(false);
	const [selectedProp, setSelectedProp] = useState(null);
	const [editPropFields, setEditPropFields] = useState({
		title: "",
		value: "",
		id: -1
	})

	console.log("loaderData------------", loadedData)
	console.log("actionDat------------", actionData)

	const toggleEditPropModal = useCallback(() => {
		setIsEditModal(!isEditModal)
	}, [isEditModal]);

	const editProp = useCallback((getData, index) => {
		setSelectedProp(getData)
		setEditPropFields((prev) => ({
			...prev,
			title: getData?.title_english,
			value: getData?.value_english,
			id: parseInt(index)
		}))
		toggleEditPropModal();
	}, []);

	const handleEditFields = useCallback((key, value) => {
		setEditPropFields((prev) => ({
			...prev,
			[key]: value
		}));
	}, []);

	useEffect(() => {
		if (!isEditModal) {
			setSelectedProp(null);
			setEditPropFields((prev) => ({
				...prev,
				title: "",
				value: "",
				id: -1
			}))
		}
	}, [isEditModal]);

	const submitHandleProp = () => {
		submit(
			{
				data: JSON.stringify(editPropFields),
				action_type: "UPDATE_PROP"
			},
			{
				action: "",
				method: "post",
				encType: "multipart/form-data",
				relative: "route",
			}
		);
	}

	// useEffect()

	const toggleDeleteModal = useCallback(() => {
		setActiveDelete(false)
		setSelectedItem(null)
	}, []);


	const handleStatusChange = useCallback(
		(value) => {
			setCurrentManufacturingStatus(value);
			// setIsStatusAssigned(true);
		},
		[],
	);

	const handleNotesChange = useCallback(
		(string) => setNotesValue(string),
		[],
	);

	useEffect(() => {
		if (loadedData?.data?.order) {
			setOrderData(loadedData?.data?.order ?? null);
			setCurrentManufacturingStatus(loadedData?.data?.lineItem?.manufacturingStatus?.id ?? "")
		}
		if (loadedData?.data?.lineItem) {
			setLineItem(loadedData?.data?.lineItem ?? null)
		}
		if (loadedData?.data?.manufacturingStatus) {
			setManufacturingStatus(loadedData?.data?.manufacturingStatus?.map(item => {
				let value = item?.id;
				let label = item?.title;
				return { value, label }
			}) ?? []);
		}
		if (loadedData?.data?.notesData) {
			setNotes(loadedData?.data?.notesData ?? [])
		}
	}, [loadedData])

	useEffect(() => {
		if (actionData) {
			console.log("actionData--------- useEffect", actionData)
			if (actionData?.resp) {
				if (actionData?.resp?.type === "UPDATE_PROP") {
					toggleEditPropModal();
					shopify.toast.show(actionData?.resp?.message, { isError: false });
				} else if (actionData?.resp?.type === "UPDATE_STATUS") {
					shopify.toast.show(actionData?.resp?.message, { isError: false });
				}
			} else if (actionData?.error) {
				shopify.toast.show(actionData?.error, { isError: true });
			}
		}
	}, [actionData])

	useEffect(() => {
		setIsPostLoading(false);
		setIsDeleteLoading(false);
		toggleDeleteModal();
		setIsUpdateLoading(false);
	}, [loadedData])


	const printDesignSheet = () => {
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

	const updateStatus = async () => {
		submit(
			{
				status: currentManufacturingStatus,
			},
			{
				action: "",
				method: "post",
				encType: "multipart/form-data",
				relative: "route",
			}
		);
	}

	const updateNotes = (noteId, editedNote) => {
		// if (lineItemId === undefined) {
		// 	console.error('lineItems id undefined')
		// 	return false
		// }
		// if (orderId === undefined) {
		// 	console.error('orderId undefined');
		// 	return false;
		// }
		setIsUpdateLoading(true);
		submit({
			// shopifyOrderId: orderId,
			notes: editedNote,
			// lineItemId: lineItemId,
			note_id: noteId,
			action_type: 'UPDATE_NOTE'
		}, {
			action: "",
			method: "post",
			encType: "multipart/form-data",
			relative: "route",

		});
	}

	// const updateLineitem = (getID) => {
	// 	console.log("Update lineitem", getID)
	// }

	const deleteNote = (noteId) => {
		// if (lineItemId === undefined) {
		// 	console.error('lineItems id undefined')
		// 	return false
		// }
		// if (orderId === undefined) {
		// 	console.error('orderId undefined');
		// 	return false;
		// }
		try {
			setIsDeleteLoading(true)
			submit(
				{
					// shopifyOrderId: orderId,
					notes: notesValue,
					// lineItemId: lineItemId,
					action_type: 'DELETE_NOTE',
					note_id: noteId
				},
				{
					action: "",
					method: 'post',
					encType: 'multipart/form-data',
					relative: 'route',
				}
			);
		} catch (error) {
			console.error('Error deleting status:', error);
		}

	};
	const createNotes = () => {
		// if (lineItemId === undefined) {
		// 	console.error('lineItems id undefined')
		// 	return false
		// }
		// if (orderId === undefined) {
		// 	console.error('orderId undefined');
		// 	return false;
		// }
		setIsPostLoading(true)
		submit({
			// shopifyOrderId: orderId,
			notes: notesValue,
			// lineItemId: lineItemId,
			action_type: 'CREATE_NOTE'
		}, {
			action: "",
			method: "post",
			encType: "multipart/form-data",
			relative: "route",
		});
	}
	const handlePostClick = () => {
		if (notesValue) {
			createNotes()
		}
		setNotesValue('')
		console.log('Post button clicked!');
	};
	const handleDeleteClick = async (noteId) => {
		setToDelete(noteId);
		//  deleteNote(noteId);
		setSelectedItem(noteId);
		setActiveDelete(true);
		//  toggleDeleteModal();
	};
	const handleEditClick = async (noteId) => {
		setEditNoteId(noteId);
		const noteToEdit = loadedData.notesData.find((note) => note.id === noteId);
		setEditedNote(noteToEdit.note);
	};
	const handleUpdateClick = async () => {
		try {

			updateNotes(editNoteId, editedNote);
			setEditNoteId(null);
			setEditedNote('');

		} catch (error) {
			console.error('Error handling save click:', error);
		}
	};
	const handleCancelClick = () => {
		setEditedNote('');
		setEditNoteId(null);
	};

	if (loadedData?.status === "NOT_LOGGED_IN") {
        return (
            <>
				<Page title="Order item">
					{ nav.state === 'loading' ? <Loader /> : null }
					<NotLoggedInScreen />
				</Page>
            </>
        )
    }

	if (!loadedData?.data?.isAdmin && !loadedData?.data?.scopes?.includes('view_orders')) {
        return (
            <>
				<Page title="Order item">
					{ nav.state === 'loading' ? <Loader /> : null }
					<AccessScreen />
				</Page>
            </>
        )
    }


	return (
		<>
			{nav.state === 'loading' ? <Loader /> : null}
			<Page
				backAction={{ url: `/app/orders/${orderData?.shopify_order_id}` }}
				// @ts-ignore
				title={lineItem?.title}
				subtitle={` Order : ${orderData?.order_name}`}
				primaryAction={ (loadedData?.data?.isAdmin || loadedData?.data?.scopes?.includes('write_orders')) ? {
					content: 'Save',
					onAction: updateStatus,
					loading: isLoading,
				} : null }
				secondaryActions={[
					{
						content: 'Print designsheet',
						onAction: () => printDesignSheet()
					}
				]}
			>
				<Layout>
					<Layout.Section>
						<Grid>
							<Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 8, xl: 8 }}>
								<Card>
									<div style={{ marginBottom: "15px" }}>
										<div style={{ marginTop: '10px' }}>
											<InlineStack wrap={false} gap="400" blockAlign="start">
												<Thumbnail
													// @ts-ignore
													source={lineItem?.image ?? ""}
													size="large"
													alt={lineItem?.title ?? ""}
												/>
												<div>
													<Text variant="bodyMd" fontWeight="bold" as="h2">
														{lineItem?.title ?? ""}
													</Text>
													<Badge tone="critical">{lineItem?.variantTitle ?? ""}</Badge>
													<Text as="h3" variant="bodyMd" fontWeight="bold">
														SKU: {lineItem?.sku || ''}
													</Text>
													<Text as="h3" variant="bodyMd" fontWeight="bold">
														Quantity: {lineItem?.quantity}
													</Text>
												</div>
											</InlineStack>
										</div>
									</div>
									<Divider />
									<div style={{ marginTop: "15px" }}>
										{/* <Card> */}
										<ResourceList
											// @ts-ignore
											items={lineItem?.customAttributes ?? []}
											resourceName={{ singular: 'Vector', plural: 'Vectors' }}
											emptyState={
												<Text as="h4" fontWeight="bold">No vectors found.</Text>
											}
											renderItem={(item, index) => {
												const { title_english, value_english, title_urdu, value_urdu, id, img_cdn, value_type } = item;
												const media = <Thumbnail
													source={img_cdn ?? "https://placehold.co/220x220?text=No%20Vector"}
													size="medium"
													alt={title_english + '--' + value_english}
												/>;

												return (
													<ResourceItem
														onClick={() => { }}
														id={title_english + '--' + value_english + '--' + id}
														media={media}
														shortcutActions={[
															{
																content: 'Edit',
																// @ts-ignore
																icon: EditIcon,
																onAction: () => editProp(item, index)
															}
														]}
														persistActions
													>
														<div style={{ display: 'flex' }}>
															<Text variant="bodyMd" fontWeight="bold" as="h2">
																{title_english}:{' '}
															</Text>
															<Text as="p">{value_english}</Text>
														</div>
														{
															title_urdu || value_urdu ? (
																<div style={{ display: 'flex' }}>
																	{value_type === 'Constant' ? (
																		<Text as="p">{value_urdu}</Text>
																	) : <Text as="p">{value_english}</Text>}

																	<Text variant="bodyMd" fontWeight="bold" as="h2">
																		:{title_urdu}
																	</Text>{'  '}
																</div>
															) : ""
														}
													</ResourceItem>
												);
											}}
										/>
										{/* </Card> */}
									</div>
								</Card>
								<BlockStack gap="300">
									<div style={{ marginTop: "15px" }}>
										<Card>
											<TextField
												label="Add Notes"
												value={notesValue}
												onChange={handleNotesChange}
												multiline={2}
												autoComplete="off"
												placeholder='Add Notes.....'
											/>
											<div style={{ marginTop: "10px", textAlign: "end" }}>
												<Button
													onClick={handlePostClick}
													loading={isPostLoading}
													disabled={!notesValue.trim()}>
													Post
												</Button>
											</div>
										</Card>
									</div>
									<BlockStack gap="100">
										{/* <pre>
											{ JSON.stringify(notes, null, 3) }
										</pre> */}
										{/* {loadedData && loadedData.notesData && loadedData.notesData.length > 0 && loadedData.notesData.map((note, index) => ( */}
										{notes?.map((note, index) => (
											<Card key={note?.id}>
												<Text variant="headingMd" as='h3'>Created at: {dataTimeFormat(note.created_at)}</Text>
												{editNoteId === note.id ? (
													<>
														<TextField
															label="Editing Note"
															value={editedNote}
															onChange={(string) => setEditedNote(string)}
															multiline={2}
															autoComplete="off"
														/>
														<div style={{ marginTop: "10px", textAlign: "end" }}>
															<ButtonGroup>
																<Button
																	onClick={handleUpdateClick}
																	disabled={!editedNote.trim()}
																	loading={isUpdateLoading}
																>
																	Update
																</Button>
																<Button
																	variant="primary"
																	onClick={handleCancelClick}
																>
																	Cancel
																</Button>
															</ButtonGroup>
														</div>
													</>
												) : (
													<>
														<Text as='p'>{note.note}</Text>
														<InlineStack align="end">
															<ButtonGroup>
																<Button
																	icon={EditIcon}
																	onClick={() => handleEditClick(note.id)}
																>
																	Edit
																</Button>
																<Button
																	variant="primary"
																	onClick={() => handleDeleteClick(note.id)}
																	icon={DeleteIcon}
																	accessibilityLabel="Delete"
																	loading={isDeleteLoading && toDelete === note.id}
																>
																	Delete
																</Button>
															</ButtonGroup>
														</InlineStack>
													</>
												)}
											</Card>
										))
										}
									</BlockStack>
								</BlockStack>
							</Grid.Cell>
							<Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
								<Card>
									<Select
										label="Select Status"
										options={manufacturingStatus}
										placeholder="Select"
										onChange={handleStatusChange}
										value={currentManufacturingStatus}
										disabled={ !loadedData?.data?.isAdmin && !loadedData?.data?.scopes?.includes('write_orders') }
									/>
								</Card>
							</Grid.Cell>
						</Grid>
					</Layout.Section>
					<Modal
						open={activeDelete}
						onClose={toggleDeleteModal}
						title="Confirm Deletion"
						primaryAction={{
							content: 'Delete',
							onAction: () => deleteNote(selectedItem),
							loading: isLoading
						}}
						secondaryActions={[
							{
								content: 'Cancel',
								onAction: toggleDeleteModal,
							},
						]}
					>
						<Modal.Section>
							Are you sure you want to delete this status? This action cannot be undone.
						</Modal.Section>
					</Modal>
					<Modal
						size="small"
						open={isEditModal}
						onClose={toggleEditPropModal}
						title="Edit option"
						primaryAction={{
							content: 'Update',
							onAction: () => submitHandleProp(),
							loading: isLoading
						}}
						secondaryActions={[
							{
								content: 'Cancel',
								onAction: toggleEditPropModal,
							},
						]}
					>
						<Modal.Section>
							<FormLayout>
								<TextField
									readOnly
									// disabled
									label="Title"
									value={editPropFields.title}
									onChange={(value) => handleEditFields('title', value)}
									autoComplete="off"
								/>
								<TextField
									label="Value"
									value={editPropFields.value}
									onChange={(value) => handleEditFields('value', value)}
									autoComplete="off"
								/>
							</FormLayout>
						</Modal.Section>
					</Modal>
				</Layout>
				<div ref={designSheetRef} style={{ display: "none" }}>
					<DesignSheet orderData={orderData} lineItem={lineItem} />
				</div>
			</Page>
		</>
	);
}
