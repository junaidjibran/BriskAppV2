import { json, useActionData, useLoaderData, useNavigation, useParams, useSubmit } from "@remix-run/react"
import { Badge, Button, Card, Page, TextField, FormLayout } from "@shopify/polaris"
import { useCallback, useEffect, useState } from "react"
import { STATUS_CODES } from "../helpers/response"
import { getSize, createSize, updateSize } from "../controllers/sizes.controller"
import Loader from "../components/loader"
import { useNavigate } from "@remix-run/react"

export const loader = async ({ request, params }) => {
    try {
        const sizeId = params.id
        let size = null;
        if(sizeId != 'create'){
          size = await getSize({ sizeId });
          if (!size) {
              return json({ status: "error", message: "There is an issue while fetching user" }, { status: STATUS_CODES.BAD_REQUEST })
          }
        }

        return json({ data: { size: size ?? null } }, { status: STATUS_CODES.OK })
    } catch (error) {
        return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
}

export const action = async ({ request, params }) => {
    try {
        const sizeId = params.id

        const formData = await request.formData();
        const size = formData.get('size');
        const meters = formData.get('meters')

        if (sizeId == 'create') {
            const newSize = await createSize({ size, meters });
            return json({ data: { size: newSize ?? null }, status: 'success', message: "Size created successfully." }, { status: STATUS_CODES.OK })
        }

        const sizeResp = await updateSize({ sizeId, size , meters });

        if (!sizeResp) {
            return json({ status: "error", message: "There is an issue while fetching size" }, { status: STATUS_CODES.BAD_REQUEST })
        }

        return json({ data: { size: sizeResp ?? null }, status: 'success', message: "User size successfully." }, { status: STATUS_CODES.OK })
    } catch (error) {
        return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }

}

export default function Size() {
    const [size, setSize] = useState('');
    const [meters, setMeters] = useState('');
    const {id} = useParams()
    const loaderData = useLoaderData();
    const actionData = useActionData();
    const handleSize = useCallback((value) => setSize(value), []);
    const handleMeters = useCallback((value) => setMeters(value), []);
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

        if (loaderData?.data?.size?.size_title) {
            setSize(loaderData?.data?.size?.size_title ?? null)
            setMeters(loaderData?.data?.size?.cloth_meters ?? false )
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
                  navigate(`/app/size/${actionData?.data?.size?.id}`)
                }
            }
        }
    }, [actionData])

    const handleSubmit = () => {
        submit({
            size,
            meters
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
                title={id == 'create' ? 'Create new size' : 'Update size'}
                primaryAction={
                    <Button
                        loading={ isSubmitting }
                        onClick={ handleSubmit }
                        variant="primary"
                    >
                        {id == 'create' ? 'Create' : 'Update'}
                    </Button>
                }
                backAction={{ url: "/app/meterPerSize" }}
            >
                <Card>
                  <FormLayout>
                    <TextField
                      type="text"
                      name="sizeName"
                      label="Size Name"
                      helpText="Enter name of SIze"
                      value={size}
                      onChange={handleSize}
                    />
                    <TextField
                      type="number"
                      name="meters"
                      label="Meters"
                      helpText="Enter size of cloth in meters"
                      value={meters}
                      onChange={handleMeters}
                    />
                  </FormLayout>
                </Card>
            </Page>
        </>
    )
}