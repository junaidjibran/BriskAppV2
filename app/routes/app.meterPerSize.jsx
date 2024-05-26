import { json, useActionData, useLoaderData, useNavigate, useNavigation, useSubmit } from "@remix-run/react"
import { Badge, Card, Page, ResourceItem, ResourceList, Text, Modal } from "@shopify/polaris"
import { EditIcon, DeleteIcon } from "@shopify/polaris-icons"
import { useEffect, useState } from "react"
import { STATUS_CODES } from "../helpers/response"
// import { getUsers } from "../controllers/users.controller"
import { getSizes, deleteSize } from "../controllers/sizes.controller"
import Loader from "../components/loader"
import NotLoggedInScreen from "../components/notLoggedInScreen"
// import { deleteSession } from "../helpers/session.server"

export const loader = async ({ request }) => {
    try {
        const sizes = await getSizes();
        console.log('===========sizes', sizes)
        // const deleteSessionIfNotLogin = await deleteSession(request)
        // if (deleteSessionIfNotLogin) {
        //     return json({ status: "NOT_LOGGED_IN" }, deleteSessionIfNotLogin)
        // }

        // if (!users) {
        //     return json({ status: "error", message: "There is an issue while fetching users" }, { status: STATUS_CODES.BAD_REQUEST })
        // }

        // return json({ data: { users: users ?? [] } }, { status: STATUS_CODES.OK })
        return json({ data: { sizes: sizes ?? [] } }, { status: STATUS_CODES.OK })
    } catch (error) {
        return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
}

export const action = async ({ request }) => {
    const formData = await request.formData();
    const type = formData.get('type');
    const id = formData.get('id')

    if(type == 'delete'){
        const newSizes = await deleteSize({ id });
            return json({ data: { sizes: newSizes ?? null }, status: 'success', message: "Size deleted successfully." }, { status: STATUS_CODES.OK })
    }
    return json({ data: "Action" })
}

export default function MterePerSize() {
    const loaderData = useLoaderData();
    const actionData = useActionData();
    const navigate = useNavigate();
    const nav = useNavigation();
    console.log("loaderData", loaderData)
    console.log("actionData", actionData)
    const [activeDelete, setActiveDelete] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const submit = useSubmit();
    const isPageLoading = ["loading"].includes(nav.state);
    const [sizes, setsizes] = useState([])

    useEffect(() => {
        if (loaderData?.status === "error") {
            shopify.toast.show(loaderData?.message, { isError: true });
        }

        if (loaderData?.data?.sizes) {
            console.log("isLoaderData")
            setsizes(loaderData?.data?.sizes ?? [])
        }
    }, [loaderData])
    

    if (loaderData?.status === "NOT_LOGGED_IN") {
        return (
            <NotLoggedInScreen />
        )
    }

    useEffect(() => {
        setActiveDelete(false)
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
            type: "delete",
            id: selectedItem
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
            <Page title="Meters per Size" primaryAction={{content: 'Create New', onAction: () => navigate('/app/size/create')}}>
                <Card>
                    <ResourceList
                        resourceName={{ singular: 'size', plural: 'sizes' }}
                        items={sizes}
                        renderItem={(size) => {
                            const { id, size_title : sizeTitle, cloth_meters : meters } = size;
                            const shortcutActions = [
                                {
                                    content: 'Edit',
                                    icon: EditIcon,
                                    onAction: () => { navigate(`/app/size/${ id }`) }
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
                                    <div style={{display: 'flex'}}>
                                        <div style={{flex : "0 0 30%", marginRight: '10px'}}>
                                            <Text variant="bodyMd" fontWeight="bold" as="h3">
                                                Size : { sizeTitle} 
                                            </Text>
                                        </div>

                                    <Text variant="bodyMd" fontWeight="bold" as="h4">
                                        Meter : { meters }
                                    </Text>

                                    </div>
                                </ResourceItem>
                            );
                        }}
                    />
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