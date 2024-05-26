import { json, useActionData, useLoaderData, useNavigation, useParams, useSubmit } from "@remix-run/react"
import { Badge, Button, Card, Page, TextField, FormLayout } from "@shopify/polaris"
import { useCallback, useEffect, useState } from "react"
import { STATUS_CODES } from "../helpers/response"
import { getInventory, createInventory, updateInventory } from "../controllers/inventory.controller"
import Loader from "../components/loader"
import { useNavigate } from "@remix-run/react"

export const loader = async ({ request, params }) => {
    try {
        const inventoryId = params.id
        let inventory = null;
        if(inventoryId != 'create'){
          inventory = await getInventory({ inventoryId });
          if (!inventory) {
              return json({ status: "error", message: "There is an issue while fetching inventory" }, { status: STATUS_CODES.BAD_REQUEST })
          }
        }

        return json({ data: { inventory: inventory ?? null } }, { status: STATUS_CODES.OK })
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
            return json({ data: { inventory: newInventory ?? null }, status: 'success', message: "inventory created successfully." }, { status: STATUS_CODES.OK })
        }

        const inventoryResp = await updateInventory({ inventoryId, sku , inventory });
 
        if (!inventoryResp) {
            return json({ status: "error", message: "There is an issue while fetching inventory" }, { status: STATUS_CODES.BAD_REQUEST })
        }

        return json({ data: { inventory: inventoryResp ?? null }, status: 'success', message: "inventory updated successfully." }, { status: STATUS_CODES.OK })
    } catch (error) {
        return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }

}

export default function User() {
    const [sku, setSku] = useState('');
    const [inventory, setInvetory] = useState('');
    const {id} = useParams()
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
        if (loaderData?.status === "error") {
            shopify.toast.show(loaderData?.message, { isError: true });
        }

        if (loaderData?.data?.inventory?.sku) {
            setSku(loaderData?.data?.inventory?.sku ?? null)
            setInvetory(loaderData?.data?.inventory?.inventory ?? false )
        }
    }, [loaderData])

    useEffect(() => {
        if (actionData && actionData?.status?.length) {
            if (actionData?.status === 'error') {
                shopify.toast.show(actionData?.message, { isError: true });
            }

            if (actionData?.status === 'success') {
                shopify.toast.show(actionData?.message, { isError: false });
                if(id == 'create'){
                  navigate(`/app/inventory/${actionData?.data?.inventory?.id}`)
                }
            }
        }
    }, [actionData])

    const handleSubmit = () => {
        submit({
            sku,
            inventory
        },
        {
            action: "",
            method: 'post',
            encType: 'multipart/form-data',
            relative: 'route',
        })
    }

    return (
        <>
            { isPageLoading && (<Loader />) }
            <Page
                title={id == 'create' ? 'Create new Inventory' : 'Update Inventory'}
                primaryAction={
                    <Button
                        loading={ isSubmitting }
                        onClick={ handleSubmit }
                        variant="primary"
                    >
                        {id == 'create' ? 'Create' : 'Update'}
                    </Button>
                }
                backAction={{ url: "/app/inventories" }}
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
                    {
                      id == 'create' ? 
                      <TextField
                        type="number"
                        name="inventory"
                        label="Inventory"
                        helpText="Enter inventory of product"
                        value={inventory}
                        onChange={handleInventory}
                      />
                      :
                      <TextField
                      type="number"
                      name="inventory"
                      label="Current Inventory"
                      value={inventory}
                      disabled
                    /> 
                    }
                  </FormLayout>
                </Card>
            </Page>
        </>
    )
}