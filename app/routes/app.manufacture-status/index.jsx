import {
    ResourceList,
    ResourceItem,
    Text,
    Page,
    Button,
    Modal,
    TextField,
    Select,
    Card,
    FormLayout,
    EmptyState
    // eslint-disable-next-line import/no-duplicates
} from '@shopify/polaris';
import { DeleteIcon, EditIcon } from '@shopify/polaris-icons';


//   import React from 'react';
import React, { useState, useCallback, useEffect } from 'react';
import { useSubmit, useActionData, useLoaderData, useNavigation, useLocation } from "@remix-run/react";
import { json } from '@remix-run/node';
import prisma from '../../db.server';
import SettingsNav from '../../components/settingsNav';
import Loader from "../../components/loader";
import CustomBadge from '../../components/badge';

export async function loader() {
    // @ts-ignore
    const statuses = await prisma.manufacturing_status.findMany();
    return json(statuses)
}

export async function action({ request }) {
    const formData = await request.formData();
    const title = formData.get('title');
    const color = formData.get('color');
    const id = formData.get('id');
    // const colorCode = formData.get('color-code')
    const actionType = formData.get('actionType');

    let resp;

    if (id && actionType === 'delete') {
        await prisma.manufacturing_status.delete({
            where: { id: id },
        });
    } else if (id && actionType === 'update') {
        const colorCode = colorToBackgroundColor[color];
        resp = await prisma.manufacturing_status.update({
            where: { id: id },
            data: {
                title,
                color,
                // @ts-ignore
                "color_code": colorCode,
            },
        });
    } else {
        const colorCode = colorToBackgroundColor[color];
        resp = await prisma.manufacturing_status.create({
            data: {
                "title": title,
                "color": color,
                // @ts-ignore
                "color_code": colorCode,
            },
        });
    }

    return json({ resp })
}

const options = [
    { label: 'Primary', value: 'Primary' },
    { label: 'Secondary', value: 'Secondary' },
    { label: 'Success', value: 'Success' },
    { label: 'Danger', value: 'Danger' },
    { label: 'Warning', value: 'Warning' },
    { label: 'Dark', value: 'Dark' },
    { label: 'Info', value: 'Info' },
];

const colorToBackgroundColor = {
    Primary: '#007bff',
    Secondary: '#6c757d',
    Success: '#28a745',
    Danger: '#dc3545',
    Warning: '#ffc107',
    Dark: '#343a40',
    Info: '#17a2b8',

  };

// const colorToBadgeTone = {
//     Red: 'critical',
//     Blue: 'info',
//     Green: 'success',
//     Yellow: 'attention'
  
// }


export default function StatusSettings() {
    const data = useLoaderData();
    const submit = useSubmit();
    const nav = useNavigation();
    const actionData = useActionData();
    const location = useLocation();
    const [active, setActive] = useState(false);
    const [selectColor, setSelectColor] = useState('');
    const [textFieldValue, setTextFieldValue] = useState('');
    const [activeDelete, setActiveDelete] = useState(false);
    const [actionType, setActionType] = useState('');
    const [selectedItem, setSelectedItem] = useState(null)
    const [items, setitems] = useState([])
    const [showError, setShowError] = useState(false);

    const isLoading = ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";

    const handleSelectChange = useCallback(
        (string) => setSelectColor(string),
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
            setSelectColor(item?.color)
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
                    color: selectColor,
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
        if (!textFieldValue.trim()) {
            setShowError(true);
            return;
        }
        submit(
            {
                title: textFieldValue,
                color: selectColor,
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
            setShowError(true);
            return;
        }
        setShowError(false);
        submit({ title: textFieldValue, color: selectColor }, {
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
        setSelectColor('');
        setActive(false);
        setActiveDelete(false)
    }

    const handleClearButtonClick = useCallback(() => setTextFieldValue(''), []);
    return (
        <>
        {nav.state === 'loading' ? <Loader /> : null}
        <Page title="Manufacturing Status">
            <SettingsNav currentRoute={ location } />
            <Card>
            {
                    items && items.length ? (
                <ResourceList
                    alternateTool={ <Button onClick={ () => openModal('create') }>Add New</Button> }
                    resourceName={{ singular: 'manufacturing status', plural: 'manufacturing status' }}
                    items={ items }
                    renderItem={(item) => {
                        const { id, title, color } = item;
                        // @ts-ignore
                        // const badgeTone = colorToBadgeTone[color] || '';
                        const backgroundColor = colorToBackgroundColor[color] || '';
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

                                <div>
                                    <CustomBadge title={ title } color={ backgroundColor } fontSize="14px" />
                                    {/* <span style={{
                                        borderRadius: '8px',
                                        backgroundColor,
                                        padding: '2px 10px',
                                        textAlign: 'center',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        color: '#FFF',
                                        fontWeight: 500 }}>
                                        {title}
                                    </span> */}
                                    {/* <Badge tone={badgeTone}>{String(color)}</Badge> */}
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
                            placeholder='Add Status title'
                            error={showError ? 'Status title is required' : undefined}
                        />
                        <Select
                            label="Status color"
                            options={options}
                            placeholder="Select status color"
                            onChange={handleSelectChange}
                            value={selectColor}
                        />
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