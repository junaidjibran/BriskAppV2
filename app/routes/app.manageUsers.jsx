import { json, useActionData, useLoaderData, useNavigate, useNavigation, useSubmit } from "@remix-run/react"
import { Badge, Button, Card, FormLayout, InlineGrid, Modal, Page, ResourceItem, ResourceList, Text, TextField } from "@shopify/polaris"
import { EditIcon } from "@shopify/polaris-icons"
import { useCallback, useEffect, useState } from "react"
import { STATUS_CODES } from "../helpers/response"
import { createUser, getUser, getUsers, loggedInCheck } from "../controllers/users.controller"
import Loader from "../components/loader"
import NotLoggedInScreen from "../components/notLoggedInScreen"
import { authenticate } from "../shopify.server"
import { generateRandomString } from "../helpers/randomString"
import AccessScreen from "../components/accessScreen"

export const loader = async ({ request }) => {
    try {
        const users = await getUsers();

        const { sessionToken } = await authenticate.admin(request);

        const isLoggedIn = await loggedInCheck({ sessionToken })
        if (!isLoggedIn) {
            return json({ status: "NOT_LOGGED_IN", message: "You are not loggedIn." })
        }

        if (!users) {
            return json({ status: "error", message: "There is an issue while fetching users" }, { status: STATUS_CODES.BAD_REQUEST })
        }

        return json({ data: { users: users ?? [], scopes: isLoggedIn?.access, isAdmin: isLoggedIn?.is_admin } }, { status: STATUS_CODES.OK })
    } catch (error) {
        return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
}

export const action = async ({ request }) => {
    try {
        const formData = await request.formData();
        const fieldData = formData.get('data');

        const jsonData = JSON.parse(fieldData) ?? null;
        if (!jsonData) {
            return json({ status: "error", message: "InValid data!" })
        }

        const checkUser = await getUser({ email: jsonData?.email });

        if (checkUser) {
            return json({ status: "error", message: "User already exist from this email." })
        }

        const createNewUser = await createUser({ 
            email: jsonData?.email, 
            username: jsonData?.username, 
            password: jsonData?.password 
        })

        if (!createNewUser) {
            return json({ status: "error", message: "Unable to create User." })
        }


        console.log("getUser", createNewUser)

        return json({ data: { createNewUser }, status: "success", message: "User Create success." })
    } catch (error) {
        return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }

}

export default function ManageUsers() {
    const loaderData = useLoaderData();
    const actionData = useActionData();
    const navigate = useNavigate();
    const nav = useNavigation();
    const submit = useSubmit();
    console.log("loaderData", loaderData)
    console.log("actionData", actionData)

    const isPageLoading = ["loading"].includes(nav.state);
    const isSubmitting = ["submitting"].includes(nav.state) && ["POST"].includes(nav.formMethod)

    const iniiState = {
        email: "",
        username: "",
        password: "",
        confirmPassword: ""
    }


    const [users, setUsers] = useState([])
    const [isAddUserModel, setIsAddUserModel] = useState(false);
    const [createUser, setCreateUser] = useState(iniiState)

    const [errors, setErrors] = useState({})

    const handleAddUserModel = useCallback(() => {
        setIsAddUserModel(!isAddUserModel)
    }, [isAddUserModel])

    const handleForm = useCallback((key, value) => {
        setCreateUser((prev) => ({
            ...prev,
            [key]: value
        }))
        
    }, [])

    useEffect(() => {
        if (loaderData?.status === "error") {
            shopify.toast.show(loaderData?.message, { isError: true });
        }

        if (loaderData?.data?.users) {
            console.log("isLoaderData")
            setUsers(loaderData?.data?.users ?? [])
        }
    }, [loaderData])

    useEffect(() => {
        if (actionData && actionData?.status?.length) {
            if (actionData?.status === 'error') {
                shopify.toast.show(actionData?.message, { isError: true });
            }

            if (actionData?.status === 'success') {
                shopify.toast.show(actionData?.message, { isError: false });

                // After successfully creating custom reset form 
                setCreateUser(iniiState);
                setIsAddUserModel(false)
            }
        }
    }, [actionData])

    const handleSubmit = () => {
        console.log("handle submit")

        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length) return

        submit({
            data: JSON.stringify(createUser)
        }, {
            action: "",
            method: "post",
            encType: "multipart/form-data",
            relative: "route",
        });
    }

    const validateForm = () => {
        let newErrors = {};
    
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
        if (!emailRegex.test(createUser.email)) {
          newErrors.email = "Invalid email format.";
        }
        if (createUser.username.trim() === "") {
          newErrors.username = "Username is required.";
        }
        if (createUser.password.trim() === "") {
          newErrors.password = "Password is required.";
        }
        if (createUser.confirmPassword.trim() === "") {
          newErrors.confirmPassword = "Confirm Password is required.";
        }
        if (createUser.password !== createUser.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match.";
        }

        setErrors(newErrors);
    
        return newErrors;
      };

    const generatePassword = () => {
        const getString = generateRandomString(12);
        console.log("getString", getString)
        setCreateUser(prev => ({
            ...prev,
            password: getString,
            confirmPassword: getString
        }))
    }

    if (loaderData?.status === "NOT_LOGGED_IN") {
        return (
            <NotLoggedInScreen />
        )
    }

    if (!loaderData?.data?.isAdmin) {
        return (
            <AccessScreen />
        )
    }

    return (
        <>
            {/* <pre>
                {
                    JSON.stringify(createUser, null, 4)
                }
            </pre>
            <pre>
                {
                    JSON.stringify(errors, null, 4)
                }
            </pre> */}
            { isPageLoading && (<Loader />) }
            <Page
                title="Manage Users"
            >
                <Modal
                    open={isAddUserModel}
                    onClose={!isSubmitting ? handleAddUserModel : null}
                    title="Add new user"
                    primaryAction={{
                        content: "Save",
                        onAction: handleSubmit,
                        loading: isSubmitting,
                    }}
                    secondaryActions={[
                        {
                            content: 'Close',
                            onAction: !isSubmitting ? handleAddUserModel : null
                        },
                    ]}
                >
                    <Modal.Section>
                        <FormLayout>
                            <InlineGrid gap="400" columns={2}>
                                <TextField
                                    type="email"
                                    name="email"
                                    label="Email*"
                                    value={createUser?.email}
                                    onChange={(value) => handleForm('email', value)}
                                    placeholder="example@gmail.com"
                                    autoComplete="on"
                                    error={ errors?.email ?? "" }
                                />
                                <TextField
                                    type="text"
                                    name="username"
                                    label="Username*"
                                    value={createUser?.username}
                                    onChange={(value) => handleForm('username', value)}
                                    autoComplete="off"
                                    error={ errors?.username ?? "" }
                                />
                                <TextField
                                    type="text"
                                    name="password"
                                    label="Password*"
                                    value={createUser?.password}
                                    onChange={(value) => handleForm('password', value)}
                                    placeholder="••••••••"
                                    autoComplete="off"
                                    error={ errors?.password ?? "" }
                                />
                                <TextField
                                    type="test"
                                    name="confirmPassword"
                                    label="Confirm Password*"
                                    value={createUser?.confirmPassword}
                                    onChange={(value) => handleForm('confirmPassword', value)}
                                    placeholder="••••••••"
                                    autoComplete="off"
                                    error={ errors?.confirmPassword ?? "" }
                                />
                            </InlineGrid>
                            <Button 
                                fullWidth={true} 
                                size="large" 
                                variant="primary"
                                onClick={ generatePassword }>Generate password</Button>
                        </FormLayout>
                    </Modal.Section>
                </Modal>
                <Card>
                    <ResourceList
                        alternateTool={<Button onClick={ handleAddUserModel }>Add User</Button>}
                        resourceName={{ singular: 'user', plural: 'users' }}
                        items={users}
                        renderItem={(user) => {
                            const { id, email, username, is_admin } = user;
                            const shortcutActions = [
                                {
                                    content: 'Edit',
                                    icon: EditIcon,
                                    onAction: () => { navigate(`/app/user/${id}`) }
                                },
                            ]

                            return (
                                <ResourceItem
                                    id={id}
                                    shortcutActions={shortcutActions}
                                    persistActions
                                >
                                    <Text variant="bodyMd" fontWeight="bold" as="h3">
                                        {username}
                                    </Text>
                                    <div style={{ display: 'flex', gap: "5px" }}>
                                        {email}
                                        {is_admin && (
                                            <Badge tone="attention">Admin</Badge>
                                        )}
                                    </div>
                                </ResourceItem>
                            );
                        }}
                    />
                </Card>
            </Page>
        </>
    )
}