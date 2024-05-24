import { useActionData, useLoaderData, useLocation, useNavigation, useSubmit } from "@remix-run/react";
import { Badge, Button, Card, DropZone, EmptyState, FormLayout, InlineGrid, Modal, Page, ResourceItem, ResourceList, Select, Spinner, Text, TextField, Thumbnail } from "@shopify/polaris";
import { DeleteIcon, EditIcon, NoteIcon } from '@shopify/polaris-icons';
import { useCallback, useEffect, useState } from "react";
import { json } from "@remix-run/node";

// import {NoteIcon} from '@shopify/polaris-icons';

import { prismaGetVector, prismaCreateVector, prismaUpdateVector, prismaDeleteVector, prismaCheckVector } from "../../controllers/vector_controller";

import SettingsNav from "../../components/settingsNav";
import Loader from "../../components/loader";
import { loggedInCheckRedirect } from "../../helpers/session.server";

export async function action({ request }) {
    const formData = await request.formData();
    const titleEnglish = formData.get('title_english');
    const valueEnglish = formData.get('value_english');
    const titleUrdu = formData.get('title_urdu');
    const valueUrdu = formData.get('value_urdu');
    const imgCdn = formData.get('img_cdn');
    const actionType = formData.get('action_type')
    const vectorType = formData.get('vector_type')
    const vectorValueType = formData.get('vector_value_type')
    

    const id = formData.get('id')
    console.log('Form Data:', { titleEnglish, valueEnglish, titleUrdu, valueUrdu, imgCdn, actionType, id });
    // console.log(payload);
    try {
        if (actionType === 'create') {
            console.log('Creating new vector...');
            if (vectorValueType === 'Dynamic') {
                // @ts-ignore
                const existingVector = await prismaCheckVector({ titleEnglish, vectorType, vectorValueType });
                console.log('titleEnglish mac:',titleEnglish , 'VVVectorTTType:', vectorType)
                if (existingVector?.length) {
                    console.log('Existing Vector 1:', existingVector);
                    return json({
                    message: 'title already exist'
                }) }    
                else {
                    const payload = { titleEnglish, valueEnglish, titleUrdu, valueUrdu, imgCdn, vectorType, vectorValueType };
                    console.log('Payload:', payload);
                    let resp = await prismaCreateVector(payload);
                    return { status: 'OK', code: 200, data: resp, type: actionType };
                
                }
            } else if (vectorValueType === 'Constant')  {
                // @ts-ignore
                const existingVector = await prismaCheckVector({ titleEnglish, valueEnglish, vectorValueType, vectorType });
                console.log('title english2:', titleEnglish, 'value english2:', valueEnglish , 'vectorValueType2:', vectorValueType)
                if (existingVector?.length) {
                    console.log('Existing Vector 2:', existingVector);
                    return json({
                        message: 'title OR value already exist'
                    })
                } 
                else {
                    const payload = { titleEnglish, valueEnglish, titleUrdu, valueUrdu, imgCdn, vectorType, vectorValueType };
                    console.log('Payload:', payload);
                    let resp = await prismaCreateVector(payload);
                    return { status: 'OK', code: 200, data: resp, type: actionType };
                }
            }
            // const payload = { titleEnglish, valueEnglish, titleUrdu, valueUrdu, imgCdn, vectorType, vectorValueType }
            // let resp = await prismaCreateVector(payload);
            // return { status: 'OK', code: 200, data: resp, type: actionType }
        } else if (actionType === 'update') {
            const payload = { titleEnglish, valueEnglish, titleUrdu, valueUrdu, imgCdn, id, vectorType, vectorValueType }
            let resp = await prismaUpdateVector(payload);
            return { status: 'OK', code: 200, data: resp, type: actionType }
        } else if (actionType === 'delete') {
            const payload = { id }
            let resp = await prismaDeleteVector(payload);
            return { status: 'OK', code: 200, data: resp, type: actionType }
        }
    } catch (error) {
        console.error('Error in action function:', error);
        return json({
            message: error
        },{
            status: 400
        })
    } 
    
    // let resp = await fileUpload(imgCdn, request)  
}

export async function loader({ request }) {
    await loggedInCheckRedirect(request)
    return { data: await prismaGetVector() };
}

export default function Vectors() {
    const loadData = useLoaderData();
    const actionData = useActionData();
    const submit = useSubmit();
    const nav = useNavigation();
    // const matches = useMatches();
    const location = useLocation();
    console.log('matches', location)

    const isLoading = ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";

    console.log('loadedData', loadData)
    console.log('actionData', actionData)

    const loadedData = useLoaderData();
    const validImageTypes = ['image/gif', 'image/jpeg', 'image/png'];
    // @ts-ignore
    const [vectorsList, setVectorsList] = useState([])
    const [isModal, setIsModal] = useState(false);
    const [imgFile, setImgFile] = useState(null)
    const [vectorType, setVectorType] = useState('CustomOrder');
    const [vectorValueType, setVectorValueType] = useState('Constant');
    const [titleEnglish, setTitleEnglish] = useState('');
    const [valueEnglish, setValueEnglish] = useState('');
    const [titleUrdu, setTitleUrdu] = useState('');
    const [valueUrdu, setValueUrdu] = useState('');
    const [imgCdn, setImgCdn] = useState("")
    const [isLoadingFile, setIsLoadingFile] = useState(false)
    // @ts-ignore
    const [selectedItem, setSelectedItem] = useState(null);
    const [actionType, setActionType] = useState("");

    const [isDelModal, setIsDelModal] = useState(false);


    const handleVectorType = useCallback(
        (newValue) => setVectorType(newValue),
        [],
    );

    const handleVectorValueType = useCallback(
        (newValue) => setVectorValueType(newValue),
        [],
    );
    const handleTitleEnglish = useCallback(
        (newValue) => setTitleEnglish(newValue),
        [],
    );
    const handleValueEnglish = useCallback(
        (newValue) => setValueEnglish(newValue),
        [],
    );
    const handleTitleUrdu = useCallback(
        (newValue) => setTitleUrdu(newValue),
        [],
    );
    const handleValueUrdu = useCallback(
        (newValue) => setValueUrdu(newValue),
        [],
    );


    const handleDropZoneDrop = useCallback(
        (_dropFiles, acceptedFiles, _rejectedFiles) => { 
            console.log("_dropFiles", _dropFiles, "acceptedFiles", acceptedFiles, "_rejectedFiles", _rejectedFiles)
            setImgFile(acceptedFiles[0])
        },[]
    );

    useEffect(() => {
        console.log('ComponentMount--------', loadedData)
        if (loadedData) {
            setVectorsList(loadedData.data)
        }
    }, [loadedData])

    useEffect(() => {
        console.log('Image File--------')

        if (imgFile) {
            uploadImage()
        }

    }, [imgFile])
    
    useEffect(() => {
        if (actionData) {
            if (actionType === 'delete') {
                shopify.toast.show("Deleted successfully!");
            } else if (actionType === 'update') {
                shopify.toast.show("Updated successfully!");
        //     } else if(actionType === 'create')
        //         shopify.toast.show("Created successfully!");
        // }
            } else if (actionType === 'create' && actionData.status === 'OK') {
                shopify.toast.show("Created successfully!");
            } else if (actionType === 'create' && actionData.status !== 'OK') 
                shopify.toast.show(actionData.message, { isError: true });
            }
            
        modalClose();
        if (actionType === 'delete') {
            delModalClose();
        }
        
    }, [actionData])

    const uploadImage = async () => {
        // if (!imgFile) {
        //     return;
        // }
        const formData = new FormData();
        // @ts-ignore
        formData.append('file', imgFile);
        console.log(imgFile)
        try {
            setIsLoadingFile(true)
            const response = await fetch('/api/fileUpload', {
              method: 'POST',
              body: formData,
            });

            const data = await response.json();

            console.log("fileUpload data", data)
            // return false
        
            setIsLoadingFile(false);
            setImgCdn(data?.data?.url)
            if (selectedItem) 
            {
                let tempObj = Object.assign({}, selectedItem);
                // @ts-ignore
                tempObj.img_cdn = resizeImage(data?.data?.url)
                console.log(tempObj)
                setSelectedItem(tempObj);
            }
            console.log('Upload response:', data);
          } catch (error) {
            setIsLoadingFile(false)
            console.error('Error uploading file:', error);
          }
    }

    const fileUpload = !imgFile && <DropZone.FileUpload  />;
    const uploadedFile = imgFile && (
        <>
            <Thumbnail
                size="large"
                // @ts-ignore
                alt={imgFile?.name}
                source={
                    // @ts-ignore
                    validImageTypes.includes(imgFile.type)
                        ? window.URL.createObjectURL(imgFile)
                        : NoteIcon
                }
            />
            <div style={{ marginTop: "10px" }}>
                <Text variant="bodySm" as="p">
                    {imgFile?.
// @ts-ignore
                    name}
                </Text>
            </div>
        </>
    );


    console.log('loadedData-----------', loadedData)

    const modalClose = () => {
        setIsModal(false);
        // if (actionType === 'update') {
            resetFields();
        // }
        setActionType('');
    }

    // @ts-ignore
    const modalopen = () => {
        setIsModal(true)
    }

    const delModalClose = () => {
        setIsDelModal(false)
        setActionType('');
        setSelectedItem(null);
    }

    // @ts-ignore
    const delModalopen = () => {
        setIsDelModal(true)
    }

    const createHandle = () => {
        setActionType('create');
        modalopen();
    }

    const updateHandle = (targetItem) =>  {
        setActionType('update')
        setSelectedItem(targetItem);
        populateFieldsData(targetItem)
        modalopen();
    }

    const delHandle = (targetItem) => {
        console.log('targetItem', targetItem);
        setActionType('delete')
        setSelectedItem(targetItem);
        delModalopen();
    }

    const submitAction = (actionType, targetItem = null) => {
        if (actionType === 'create') {
            console.log('Create Vectors', targetItem)
            submit({ 
                title_english: titleEnglish,
                value_english: valueEnglish,
                title_urdu: titleUrdu,
                value_urdu: valueUrdu,
                img_cdn: imgCdn,
                action_type: actionType,
                vector_type: vectorType,
                vector_value_type: vectorValueType
                }, {
                action: "",
                method: "post",
                encType: "multipart/form-data",
                relative: "route",
            });
        } else if (actionType === 'update') {
            console.log('Update Vector', targetItem);
            console.log('imgCdn', imgCdn)
            submit({ 
                title_english: titleEnglish,
                value_english: valueEnglish,
                title_urdu: titleUrdu,
                value_urdu: valueUrdu,
                img_cdn: imgCdn,
                // @ts-ignore
                id: selectedItem?.id,
                action_type: actionType,
                vector_type: vectorType,
                vector_value_type: vectorValueType
                }, {
                action: "",
                method: "post",
                encType: "multipart/form-data",
                relative: "route",
            });

        } else if (actionType === 'delete') {
            console.log('Delete', targetItem)
            submit({ 
                    // @ts-ignore
                    id: selectedItem?.id,
                    action_type: actionType
                }, {
                    action: "",
                    method: "post",
                    encType: "multipart/form-data",
                    relative: "route",
            });
        }
    }

    const populateFieldsData = (targetItem) => {
        setTitleEnglish(targetItem.title_english)
        setValueEnglish(targetItem.value_english)
        setTitleUrdu(targetItem.title_urdu)
        setValueUrdu(targetItem.value_urdu);
        setVectorType(targetItem.type);
        setVectorValueType(targetItem.value_type);
        setImgCdn(targetItem.img_cdn)
    }

    // @ts-ignore
    const resetFields = () => {
        setTitleEnglish("")
        setValueEnglish("")
        setTitleUrdu("")
        setValueUrdu("");
        setVectorType('CustomOrder');
        setVectorValueType('Constant');
        setSelectedItem(null);
        setImgFile(null);
    }

    const resizeImage = (getURL) => {
        if (getURL && getURL.length && getURL !== "undefined") {
            return `${ getURL }?width=300`
        } else {
            return ""
        }
    }

    return (
        <>
            { nav.state === 'loading' ? <Loader /> : null }
            <Page title="Vectors">
                <SettingsNav currentRoute={ location } />
                <Card>
                    { vectorsList && vectorsList.length ?
                    <ResourceList
                    resourceName={{ singular: 'Vector', plural: 'Vectors' }}
                    alternateTool={<Button onClick={ () => createHandle() }>Add Vector</Button>}
                    items={ vectorsList }
                    
                    renderItem={(item) => {
                        // @ts-ignore
                        const { id, title_english, value_english, title_urdu, value_urdu, img_cdn, type, value_type} = item;
                        const media = <Thumbnail
                            source={resizeImage(img_cdn)}
                            size="large"
                            // @ts-ignore
                            alt={value_english}
                        />;
                        const shortcutActions = [
                            {
                                content: 'Edit',
                                // @ts-ignore
                                onAction: () => updateHandle(item),
                                icon: EditIcon,
                            },
                            {
                                content: 'Delete',
                                // @ts-ignore
                                onAction: () => delHandle(item),
                                icon: DeleteIcon,
                            },
                        ]

                        return (
                            <
// @ts-ignore
                            ResourceItem
                                id={id}
                                media={media}
                                accessibilityLabel={`View details for ${value_english}`}
                                shortcutActions={shortcutActions}
                                persistActions
                            >
                                <Text variant="bodyMd" as="h3">
                                    {title_english} : {value_english}
                                </Text>
                                <Text variant="bodyMd" as="h3">
                                    {title_urdu} : {value_urdu}
                                </Text>
                                <br />
                                <div>
                                    <Badge 
                                        tone={ type === "ShopShirt" ? 'success' : 'info' }> 
                                    { type === "ShopShirt" ? 'Shop Shirt' : type === "CustomOrder" ? "Design Your Shirt" : "" } 
                                    </Badge>
                        
                                </div>
                            </ResourceItem>
                        );
                    }}
                />
                     : 
                        (
                            <EmptyState
                                heading="Add New Vector"
                                action={{content: 'Add', onAction: createHandle}}
                                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                            >
                            </EmptyState>
                        )
                     }
                    
                </Card>

                <Modal
                    open={ isDelModal }
                    onClose={ isLoading ? () => {} : delModalClose}
                    title="Delete vector"
                    primaryAction={{
                        content: "Delete",
                        onAction: () => { submitAction(actionType) },
                        loading: isLoading,
                    }}
                    secondaryActions={[
                        {
                            content: 'Close',
                            onAction: isLoading ? () => {} : delModalClose,
                            disabled: isLoading
                        },
                    ]}
                >
                    <Modal.Section>
                        <Text variant="bodyMd" as="h3">
                            Are you sure you want to delete this Vector? This action cannot be undone.
                        </Text>
                    </Modal.Section>
                </Modal>

                <Modal
                    open={ isModal}
                    onClose={isLoadingFile ? () => {} : modalClose}
                    title={ actionType === 'create' ? "Add new vector" : actionType === 'update' ? "Edit vector" : ""  }
                    primaryAction={{
                        content: actionType === 'create' ? "Add " : actionType === 'update' ? "Update" : "",
                        onAction: () => submitAction(actionType),
                        loading: isLoading,
                        disabled: isLoadingFile
                    }}
                    secondaryActions={[
                        {
                            content: 'Close',
                            onAction: isLoadingFile ? () => {} : modalClose,
                            disabled: isLoadingFile
                        },
                    ]}
                >
                    <Modal.Section>
                        {/* <Frame>
                            <Loading />
                        </Frame> */}
                        <FormLayout>
                            <div style={{ position: "relative" }}>
                            <DropZone 
                                allowMultiple={false} 
                                onDrop={handleDropZoneDrop} 
                                type="image"
                                accept=".png, .jpg, .jpeg, .gif, .webp"
                                disabled={ isLoadingFile }>
                                <div style={{ padding: "10px", paddingTop: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    {/* { selectedItem && selectedItem?.img_cdn && selectedItem?.img_cdn.length ? <>
                                        <Thumbnail
                                            size="large"
                                            // @ts-ignore
                                            alt={ valueEnglish }
                                            source={ selectedItem?.img_cdn }
                                        />
                                    </> :  <>
                                    {uploadedFile}
                                    {fileUpload}
                                    </> } */}

                                    { imgFile ? <>
                                        {uploadedFile}
                                        {fileUpload}
                                    </> :  selectedItem ? <>
                                    <Thumbnail
                                            size="large"
                                            // @ts-ignore
                                            alt={ valueEnglish }
                                            // @ts-ignore
                                            source={ selectedItem?.img_cdn }
                                        />
                                    </> : <>{fileUpload}</> }
                                    
                                </div>
                                
                            </DropZone>
                            {
                                isLoadingFile && (
                                    <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
                                        <Spinner accessibilityLabel="Spinner example" size="large" />
                                    </div>
                                )
                            }
                            </div>

                            <InlineGrid gap="400" columns={2}>

                            <Select
                                label="Vector Type"
                                options={[
                                    {
                                        value: "CustomOrder",
                                        label: "Design Your Shirt"
                                    },
                                    {
                                        value: "ShopShirt",
                                        label: "Shop Shirt"
                                    }
                                ]}
                                onChange={handleVectorType}
                                value={vectorType}
                            />

                            <Select
                                label="Vector Value Type"
                                options={[
                                    
                                    {
                                        value: "Constant",
                                        label: "Constant"
                                    },
                                    {
                                        value: "Dynamic",
                                        label: "Dynamic"
                                    }
                                ]}
                                onChange={handleVectorValueType}
                                value={vectorValueType}
                            />

                            

                            <TextField
                                label="Title (English)"
                                value={titleEnglish}
                                onChange={handleTitleEnglish}
                                autoComplete="off"
                            />

                            <TextField
                                label="Value (English)"
                                value={valueEnglish}
                                onChange={handleValueEnglish}
                                autoComplete="off"
                                />

                            <TextField
                                label="Title (Urdu)"
                                value={titleUrdu}
                                onChange={handleTitleUrdu}
                                autoComplete="off"
                                />

                            <TextField
                                label="Value (Urdu)"
                                value={valueUrdu}
                                onChange={handleValueUrdu}
                                autoComplete="off"
                                />

                            
                            </InlineGrid>
                        </FormLayout>
                    </Modal.Section>
                </Modal>
            </Page>
        </>
    )
}