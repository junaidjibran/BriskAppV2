import {
    ResourceList,
    ResourceItem,
    Text,
    Page,
    Button,
    Modal,
    TextField,
    FormLayout,
    Card,
    EmptyState
    // eslint-disable-next-line import/no-duplicates
} from '@shopify/polaris';
import { DeleteIcon, EditIcon } from '@shopify/polaris-icons';


//   import React from 'react';
import React, { useState, useCallback, useEffect } from 'react';
import { useSubmit, useActionData, useLoaderData, useNavigation, useLocation } from "@remix-run/react";
import { json } from '@remix-run/node';
import SettingsNav from '../../components/settingsNav';
// import Loader from '../components/loader';
import prisma from '../../db.server';
import Loader from '../../components/loader';
import NotLoggedInScreen from '../../components/notLoggedInScreen';
import { STATUS_CODES } from '../../helpers/response';
import { loggedInCheck } from '../../controllers/users.controller';
import { authenticate } from '../../shopify.server';

export async function loader({request}) {
    try {
        const { sessionToken } = await authenticate.admin(request);

        const isLoggedIn = await loggedInCheck({ sessionToken })
        if (!isLoggedIn) {
            return json({ status: "NOT_LOGGED_IN", message: "You are not loggedIn." })
        }

        const statuses = await prisma.factories.findMany();
        return json(statuses)
    } catch (error) {
        return json({ error: JSON.stringify(error) }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
}

export async function action({ request }) {
    const formData = await request.formData();
    const title = formData.get('title');
    const location = formData.get('location');
    const id = formData.get('id');
    const actionType = formData.get('actionType');

    

    let resp = [];

    console.log("------------------------", title, location, actionType)

    if (id && actionType === 'delete') {
        await prisma.factories.delete({
            where: { id: id },
        });
    } else if (id && actionType === 'update') {
        // @ts-ignore
        resp = await prisma.factories.update({
            where: { id: id },
            data: {
                // @ts-ignore
                title,
                location
            },
        });
    } else {
        // @ts-ignore
        resp = await prisma.factories.create({
            data: {
                // @ts-ignore
                "title": title,
                "location": location
            },
        });
    }

    return json({ resp })
}

// const options = [
//     { label: 'Red', value: 'Red' },
//     { label: 'Blue', value: 'Blue' },
//     { label: 'Green', value: 'Green' },
//     { label: 'Yellow', value: 'Yellow' }
// ];


export default function FactorySetting() {
    const data = useLoaderData();
    const submit = useSubmit();
    const nav = useNavigation();
    const actionData = useActionData();
    const routeLocation = useLocation();
    const [active, setActive] = useState(false);
    const [location, setLocation] = useState('');
    const [textFieldValue, setTextFieldValue] = useState('');
    const [activeDelete, setActiveDelete] = useState(false);
    const [actionType, setActionType] = useState('');
    const [selectedItem, setSelectedItem] = useState(null)
    const [items, setitems] = useState([])
    const [showTitleError, setShowTitleError] = useState(false);
    const [showLocationError, setShowLocationError] = useState(false);

    const isLoading = ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";

    const handleSelectChange = useCallback(
        (string) => setLocation(string),
        [],
    );

    const toggleDeleteModal = useCallback(() => {
        setActiveDelete(false)
        setSelectedItem(null)
    }, []);

    const handleTextFieldChange = useCallback(
        (string) => setTextFieldValue(string),
        [],
    );

    useEffect(() => {
        if (data) {
            setitems(data)
        }
    }, [data])

    useEffect(() => {
        if (actionData) {
            if (actionType === 'delete') {
                shopify.toast.show("Deleted successfully!");
            } else if (actionType === 'update') {
                shopify.toast.show("Updated successfully!");
            } else if(actionType === 'create')
                shopify.toast.show("Created successfully!");
        }
        resetStates();
    }, [actionData])

    const closeModal = () => {
        setActive(false);
        // @ts-ignore
        setActionType(null);
        resetStates();
    }

    const openModal = (modalType, item = null) => {
        setActive(true);
        setActionType(modalType)
        setSelectedItem(item);
        if (modalType === 'create') {
            console.log('Create Modal')
        }
        else if (modalType === 'update') {
            // @ts-ignore
            setTextFieldValue(item?.title)
            // @ts-ignore
            setLocation(item?.location)
        }
    }


    const deleteStatus = (statusId) => {
        // setLoading(true);
        setActionType('delete')
        // @ts-ignore
        // const statusId = editStatus?.id;
        console.log('Deleting status with ID:', statusId);
        try {
            submit(
                {
                    title: textFieldValue,
                    location: location,
                    // @ts-ignore
                    // eslint-disable-next-line no-undef
                    id: statusId,
                    actionType: 'delete',
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

    const updateStatus = () => {
        submit(
            {
                title: textFieldValue,
                location: location,
                // @ts-ignore
                id: selectedItem?.id,
                actionType: 'update',
            },
            {
                action: "",
                method: 'post',
                encType: 'multipart/form-data',
                relative: 'route',
            }
        );
    }


    const createStatus = () => {
        if (!textFieldValue.trim()) {   
            setShowTitleError(true);
        } else {
            setShowTitleError(false);
        }

        if (!location.trim()) {
            setShowLocationError(true);
        } else {
            setShowLocationError(false);
        }
        if (!textFieldValue.trim() || !location.trim()) {
            return;
        }

        submit({ title: textFieldValue, location: location }, {
            action: "",
            method: "post",
            encType: "multipart/form-data",
            // preventScrollReset: false,
            // replace: false,
            relative: "route",
        });
    }

    const handleConfirmationPopup = (getItem) => {
        console.log(getItem)
        setSelectedItem(getItem);
        setActiveDelete(true);
        console.log('--------delete id ', getItem);
    }

    // Modal Primary Action Handle
    const modalPrimaryAction = (type) => {
        if (type === 'create') {
            createStatus()
        }
        else if (type === 'update') {
            updateStatus()
        }
    }

    // Reset modal form States
    const resetStates = () => {
        setTextFieldValue('');
        setLocation('');
        setActive(false);
        setActiveDelete(false)
    }

    const handleClearButtonClick = useCallback(() => setTextFieldValue(''), []);

    const pageTitle = "Factory"

    if (data?.status === "NOT_LOGGED_IN") {
        return (
            <>
                <Page title={ pageTitle }>
                    { nav.state === 'loading' ? <Loader /> : null }
                    <SettingsNav currentRoute={ routeLocation } />
                    <NotLoggedInScreen />
                </Page>
            </>
        )
    }

    return (
        <>
        {nav.state === 'loading' ? <Loader/> : null}
            <Page title="Factory">
                <SettingsNav currentRoute={ routeLocation } />
                <Card>
                    {
                        items && items.length ? (
                            <ResourceList
                                alternateTool={ <Button onClick={ () => openModal('create') }>Add New</Button> }
                                resourceName={{ singular: 'factory', plural: 'factories' }}
                                items={ items }
                                renderItem={(item) => {items
                                    const { id, title, location } = item;
                                    const shortcutActions = [
                                        {
                                            content: 'Edit',
                                            icon: EditIcon,
                                            onAction: () => openModal('update', item)
                                        },
                                        {
                                            content: 'Delete',
                                            icon: DeleteIcon,
                                            onAction: () => handleConfirmationPopup(item)
                                        }
                                    ]

                                    return (
                                        <
                                        // @ts-ignore
                                        ResourceItem
                                            id={id}
                                            shortcutActions={shortcutActions}
                                            persistActions
                                        >
                                            <Text variant="bodyMd" fontWeight="bold" as="h3">
                                                {title}
                                            </Text>
                                            <div>
                                                { location }
                                            </div>
                                        </ResourceItem>
                                    );
                                }}
                            />
                        ) : (
                            <Card>
                                <EmptyState
                                    heading="Add a city list to get started"
                                    action={{
                                        content: 'Add New',
                                        onAction: () => openModal('create')
                                    }}
                                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                                >
                                    <p>It looks like you haven't added any cities for any country yet. Click the "Add New" button to creating your city list.</p>
                                </EmptyState>
                            </Card>
                        )
                    }

                </Card>
                <Modal
                    open={active}
                    onClose={closeModal}
                    title={actionType === 'create' ? 'Add new manufacturing status' : 'update'}
                    primaryAction={{
                        content: actionType === 'create' ? 'Add' : actionType === 'update' ? 'Update' : '',
                        onAction: () => modalPrimaryAction(actionType),
                        loading: isLoading
                    }}
                    secondaryActions={[
                        {
                            content: 'Cancel',
                            onAction: closeModal,
                        },
                    ]}
                >
                    <Modal.Section>
                        <FormLayout>
                            <TextField
                                label="Status title"
                                value={textFieldValue}
                                onChange={handleTextFieldChange}
                                clearButton
                                onClearButtonClick={handleClearButtonClick}
                                autoComplete="off"
                                placeholder='Add Factory'
                                error={showTitleError ? 'Factory title is required' : undefined}
                            />
                            <TextField
                                label="Shipping address"
                                value={location}
                                onChange={handleSelectChange}
                                multiline={4}
                                autoComplete="off"
                                placeholder='Add Factory Address'
                                error={showLocationError ? 'Factory address is required' : undefined}
                            />
                            {/* <Select
                                label="Status color"
                                options={options}
                                placeholder="Select status color"
                                onChange={handleSelectChange}
                                value={location}
                            /> */}
                        </FormLayout>
                    </Modal.Section>
                </Modal>

                <Modal
                    open={activeDelete}
                    onClose={toggleDeleteModal}
                    title="Confirm Deletion"
                    primaryAction={{
                        content: 'Discard',
                        // @ts-ignore
                        onAction: () => deleteStatus(selectedItem?.id),
                        loading: isLoading
                    }}
                    secondaryActions={[
                        {
                            content: 'Cancle',
                            onAction: toggleDeleteModal,
                        },
                    ]}
                >
                    <Modal.Section>
                        Are you sure you want to delete this status? This action cannot be undone.
                    </Modal.Section>
                </Modal>
                
            </Page>
        </>

    );
}