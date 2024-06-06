import { json, useActionData, useLoaderData, useNavigate, useNavigation, useParams, useSubmit } from "@remix-run/react"
import { Button, Card, Page, TextField, FormLayout, Text } from "@shopify/polaris"
import { useCallback, useEffect, useState } from "react"
import { STATUS_CODES } from "../helpers/response"
import { getInventory, createInventory, updateInventory, getInventoryBySKU, inventoryTransactionsLog } from "../controllers/inventory.controller"
import Loader from "../components/loader"
import { authenticate } from "../shopify.server"
import { loggedInCheck } from "../controllers/users.controller"
import NotLoggedInScreen from "../components/notLoggedInScreen"
import AccessScreen from "../components/accessScreen"

export const loader = async ({ request, params }) => {
	try {
		const { sessionToken } = await authenticate.admin(request);

		const isLoggedIn = await loggedInCheck({ sessionToken })

		if (!isLoggedIn) {
			return json({ status: "NOT_LOGGED_IN", message: "You are not loggedIn." })
		}
		const inventoryId = params.id
		let inventory = null;
		if (inventoryId != 'create') {
			inventory = await getInventory({ inventoryId });
			if (!inventory) {
				return json({ status: "error", message: "There is an issue while fetching inventory" }, { status: STATUS_CODES.BAD_REQUEST })
			}
		}

		return json({
			data: {
				inventory: inventory ?? null,
				scopes: isLoggedIn?.access,
				isAdmin: isLoggedIn?.is_admin
			}
		}, { status: STATUS_CODES.OK })
	} catch (error) {
		return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
	}
}

export const action = async ({ request, params }) => {
	try {
		const inventoryId = params.id

		const formData = await request.formData();
		const sku = formData.get('sku');
		const inventory = formData.get('inventory')

		if (inventoryId == 'create') {
			const newInventory = await createInventory({ sku, inventory });

			if (!newInventory) {
				return json({ status: "error", message: "There is an issue while creating inventory" }, { status: STATUS_CODES.BAD_REQUEST })
			}

			const inventroyLogTemp = {
				sku: sku,
				type: "ADD",
				inventory: inventory,
				new_inventory: newInventory?.inventory,
				current_inventory: 0
			}
			const addInventoryLog = await inventoryTransactionsLog(inventroyLogTemp)
			
			return json({ data: { inventory: newInventory ?? null, inventroyLog: addInventoryLog }, status: 'success', message: "inventory created successfully." }, { status: STATUS_CODES.OK })
		}

		const getCurrentInvntoryBySKU = await getInventoryBySKU({ sku })

		if (!getCurrentInvntoryBySKU) {
			return json({ status: "error", message: "There is an issue while getting current inventory" }, { status: STATUS_CODES.BAD_REQUEST })
		}


		const inventoryResp = await updateInventory({ inventoryId, sku, inventory });

		if (!inventoryResp) {
			return json({ status: "error", message: "There is an issue while updating inventory" }, { status: STATUS_CODES.BAD_REQUEST })
		}

		console.log("getCurrentInvntoryBySKU", getCurrentInvntoryBySKU)
		console.log("inventoryResp", inventoryResp)
		
		const inventroyLogTemp = {
			sku: sku,
			type: "UPDATE",
			inventory: parseFloat(inventoryResp?.inventory) - parseFloat(getCurrentInvntoryBySKU?.inventory),
			new_inventory: inventoryResp?.inventory,
			current_inventory: getCurrentInvntoryBySKU?.inventory
		}
		const addInventoryLog = await inventoryTransactionsLog(inventroyLogTemp)

		console.log("addInventoryLog", addInventoryLog)

		return json({ data: { inventory: inventoryResp ?? null, inventroyLog: addInventoryLog }, status: 'success', message: "inventory updated successfully." }, { status: STATUS_CODES.OK })
	} catch (error) {
		return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
	}

}

export default function User() {
	const [sku, setSku] = useState('');
	const [inventory, setInvetory] = useState(0);
	const [incommingInventory, setIncommingInventory] = useState(0);
	const [calculatedInventory, setCalculatedInventory] = useState(0);

	const { id } = useParams()
	const loaderData = useLoaderData();
	const actionData = useActionData();
	const handleSKU = useCallback((value) => setSku(value), []);
	const handleInventory = useCallback((value) => setInvetory(value), []);
	const navigate = useNavigate();
	const submit = useSubmit();
	const nav = useNavigation();
	console.log("loaderData", loaderData)
	console.log("actionData", actionData)
	const isPageLoading = ["loading"].includes(nav.state);
	const isSubmitting = ["submitting"].includes(nav.state) && ["POST"].includes(nav.formMethod)

	useEffect(() => {
		setCalculatedInventory(parseFloat(inventory) + parseFloat(incommingInventory))
	}, [incommingInventory])

	useEffect(() => {
		if (loaderData?.status === "error") {
			shopify.toast.show(loaderData?.message, { isError: true });
		}

		if (loaderData?.data?.inventory?.sku) {
			setSku(loaderData?.data?.inventory?.sku ?? null)
			setInvetory(loaderData?.data?.inventory?.inventory ?? 0)
			setCalculatedInventory(loaderData?.data?.inventory?.inventory ?? 0)
		}
	}, [loaderData])

	useEffect(() => {
		if (actionData && actionData?.status?.length) {
			if (actionData?.status === 'error') {
				shopify.toast.show(actionData?.message, { isError: true });
			}

			if (actionData?.status === 'success') {
				setCalculatedInventory(inventory)
				shopify.toast.show(actionData?.message, { isError: false });
				setIncommingInventory(0);
				if (id == 'create' && actionData?.data?.inventory?.id) {
					navigate(`/app/inventory-add/${actionData?.data?.inventory?.id}`)
				}
			}
		}
	}, [actionData])

	const handleSubmit = () => {
		submit({
			sku,
			inventory: id == 'create' ? inventory : calculatedInventory,
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
				<Page title="Create inventory">
					{nav.state === 'loading' ? <Loader /> : null}
					<NotLoggedInScreen />
				</Page>
			</>
		)
	}

	if (!loaderData?.data?.isAdmin && !loaderData?.data?.scopes?.includes('write_inventory')) {
		return (
			<>
				<Page title="Create inventory">
					{nav.state === 'loading' ? <Loader /> : null}
					<AccessScreen />
				</Page>
			</>
		)
	}

	return (
		<>
			{isPageLoading && (<Loader />)}
			<Page
				title={id == 'create' ? 'Create new Inventory' : 'Update Inventory'}
				primaryAction={
					<Button
						loading={isSubmitting}
						onClick={handleSubmit}
						variant="primary"
					>
						{id == 'create' ? 'Create' : 'Update'}
					</Button>
				}
				backAction={{ url: "/app/inventory-update" }}
			>
				<Card>
					<FormLayout>
						<TextField
							type="text"
							name="sku"
							label="Product SKU"
							helpText="Enter SKU of producy"
							value={sku}
							onChange={handleSKU}
						/>
						{id == 'create' ?
							<TextField
								type="number"
								name="inventory"
								label="Inventory"
								// step={0.1}
								helpText="Enter inventory of product"
								value={inventory}
								onChange={handleInventory}
								suffix="meters"
							/>
							: <>
								<div style={{ marginTop: '10px' }}>
									<TextField
										type="number"
										name="inventory"
										label="Current Inventory"
										// step={0.1}
										value={inventory}
										disabled
										suffix="meters"
									/>

								</div>
								<div style={{ marginTop: '10px' }}>
									<TextField
										type="number"
										name="newinventory"
										// step={0.1}
										label="Adjust by new Inventory"
										value={incommingInventory}
										onChange={(val) => setIncommingInventory(val)}
										suffix="meters"
									/>

								</div>
								<div style={{ marginTop: '10px' }}>
									{
										<Text>Total Inventory : {calculatedInventory}</Text>
									}
								</div>

							</>
						}
					</FormLayout>
				</Card>
			</Page>
		</>
	)
}