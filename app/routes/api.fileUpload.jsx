// // upload_route.ts
// import { ActionFunction } from 'remix';

// export let action: ActionFunction = async ({ request }) => {
//   const formData = await request.formData();
//   const file = formData.get('fileInput');

//   if (file instanceof File) {
//     // Handle the file upload logic here, e.g., save it to a server or storage
//     console.log('File details:', file.name, file.size, file.type);
//     // Ensure to handle errors and responses appropriately.
//   }

//   return new Response(null, { status: 200 });
// };


import { json } from "@remix-run/node";
import { STATUS_CODES } from "../helpers/response";
import { authenticate } from "../shopify.server";

const MIME_TYPE = {
    "VIDEO": [
        "video/mp4",
        "video/mpeg",
        "video/ogg",
        "video/quicktime",
        "video/webm"
    ],
    "IMAGE": [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/bmp",
        "image/webp"
    ]
}

const SIZE_LIMIT = 5242880  // 5 MB into Bytes

export async function action({ request }) {
    const { admin } = await authenticate.admin(request);
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        var fileName = file.name;
        var fileType = file.type;
        var fileSize = file.size;
        // var alt_tag = file_name.split('.')[0];
        if (fileSize > SIZE_LIMIT) {
            return json({ error: `${ fileName } is too large. Try a file size less than 5MB` }, { status: STATUS_CODES.BAD_REQUEST })
        }
        if (!file || !fileName || !fileType) {
            return json({
                error: 'Required file name, file type, base64 encoded image & to process request.'
            }, { status: STATUS_CODES.BAD_REQUEST })
        }

        if (file instanceof File) {
            // Handle the file upload logic here, e.g., save it to a server or storage
            console.log('File details:', file.name, file.size, file.type);
            const stagedUploadsQueryResponse = await admin.graphql(
                `#graphql
            mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
                stagedUploadsCreate(input: $input) {
                    stagedTargets {
                        resourceUrl
                        url
                        parameters {
                            name
                            value
                        }
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }`,
                {
                    variables: {
                        input: [{
                            fileSize: fileSize.toString(),
                            filename: fileName,
                            httpMethod: "POST",
                            mimeType: fileType,
                            resource: getMineType(fileType) // Important to set this as FILE and not IMAGE. Or else when you try and create the file via Shopify's api there will be an error.
                        }]
                    }
                }
            )

            const stagedUploadsQueryResult = await stagedUploadsQueryResponse.json()
            const target = stagedUploadsQueryResult?.data?.stagedUploadsCreate?.stagedTargets[0];

            console.log("stagedUploadsQueryResult-------------", JSON.stringify(stagedUploadsQueryResult, null, 4))
            console.log("target-------------------------------", JSON.stringify(target, null, 4))

            const params = target.parameters; // Parameters contain all the sensitive info we'll need to interact with the storage bucket.
            console.log("params----", params)
            const url = target.url; // This is the url you'll use to post data to bucket. It's a generic url that when combined with the params sends your data to the right place.
            console.log("url-----", url)
            const resourceUrl = target.resourceUrl; // This is the specific url that will contain your image data after you've uploaded the file to the staged target.
            console.log("resourceUrl------", resourceUrl)
            const baseUrl = `https://cdn.shopify.com/s/files/1`; // Base url used to generate shopify cdn link
            let key;
            for (const obj of params) {
                if (obj.name === 'key') {
                    key = obj.value;
                }
            }
            console.log(`Key before function: ${key}`);
            const keyArray = key.split('/');
            console.log("keyArray", keyArray)
            console.log(`keyArray: ${keyArray}`);
            let str = splitToSubstrings(keyArray[1], 4);
            console.log(`Key after splitToSubstrings function: ${keyArray}`);
            var finalUrl = `${baseUrl}/${str}${keyArray[2]}/${keyArray[keyArray.length - 1]}`;
            console.log(`finalUrl: ${finalUrl}`);
            // Generate a form, add the necessary params and append the file.
            // Must use the FormData library to create form data via the server.
            const form = new FormData();
            // Add each of the params we received from Shopify to the form. this will ensure our ajax request has the proper permissions and bucket location data.
            params.forEach(({ name, value }) => {
                form.append(name, value);
            });

            // Adding file name on appending file to form. This allows large files to be uploaded
            // Removing file name would result in an error 'metadata too large' on uploading file.


            form.append('file', file, fileName);
            // console.log(`form: ${form}`);
            const formReq = await fetch(url, {
                method: 'POST',
                body: form
            })

            if (formReq.status != 201) {
                const error = {
                    "message": "Error while uploading to storage server.",
                    "data": formReq
                }
                throw new Error(JSON.stringify(error));
                // console.log("formRe00000000000000000000000000000000000000000000000000000000000q", formReq)
            }

            const formResp = await formReq.text()

            console.log("------------------------------", JSON.stringify(formResp, null, 4))

            // var formReq = await axios.post(
            //     url,
            //     // console.log(`formRequest: ${formReq}`);
            // if (formReq.status != 201) {
            //     return {
            //         code: 200,
            //         message: 'Unable to upload image.'
            //     };
            // }

            const createFileQueryResponse = await admin.graphql(
                `#graphql
                    mutation fileCreate($files: [FileCreateInput!]!) {
                    fileCreate(files: $files) {
                        files {
                            id
                            fileStatus
                            ... on GenericFile {
                                id
                                url
                                mimeType
                            }
                            ... on MediaImage {
                                id
                                preview {
                                    image {
                                        url
                                    }
                                }
                                mimeType
                            }
                            ... on Video {
                                id
                                sources {
                                    url
                                    mimeType
                                }
                            }
                        }
                        userErrors {
                            message
                            field
                            code
                        }
                    }
                }
            `,
                {
                    variables: {
                        "files": {
                            "contentType": getMineType(fileType),
                            "duplicateResolutionMode": "APPEND_UUID",
                            "originalSource": resourceUrl // Pass the resource url we generated above as the original source. Shopify will do the work of parsing that url and adding it to files.
                        }
                    }
                }
            )

            console.log("getMineType(fileType)-------", getMineType(fileType))

            let createFileQueryResult = await createFileQueryResponse.json();

            console.log("createFileQueryResult--------", JSON.stringify(createFileQueryResult, null, 4))

            // console.log(`createFileQueryResult: ${JSON.stringify(createFileQueryResult, null, 4)}`);

            // return createFileQueryResult
            if (createFileQueryResult?.data.fileCreate.userErrors.length != 0) {
                return json({
                    error: 'Unable to upload image.',
                    data: createFileQueryResult?.data?.data?.fileCreate.userErrors
                }, { status: STATUS_CODES.FORBIDDEN });
            }

            const createFileObject = createFileQueryResult?.data?.fileCreate.files;

            let currentFileStatus = ""
            let getFileByIDDataTemp = null

            do {
                const getFileByIDResp = await admin.graphql(`#graphql
                query getFile($id: ID!) {
                    node(id: $id) {
                        id
                        ... on GenericFile {
                            id
                            url
                            mimeType
                            fileStatus
                        }
                        ... on MediaImage {
                        id
                        preview {
                            image {
                                url
                            }
                        }
                            mimeType
                            fileStatus
                        }
                        ... on Video {
                            id
                            sources {
                                url
                                mimeType
                            }
                        }
                    }
                }`,
                {
                    variables: {
                        "id": createFileObject[0].id
                    }
                }
            )

            const getFileByIDData = await getFileByIDResp.json();
            currentFileStatus = getFileByIDData?.data?.node?.fileStatus ?? ""
            if (currentFileStatus === "READY") {
                getFileByIDDataTemp = getFileByIDData?.data?.node ?? null
            }
            console.log("getFileByIDData--------------------------------", getFileByIDData)
            } while (currentFileStatus !== "READY")

            if ( getFileByIDDataTemp && getFileByIDDataTemp.mimeType.includes('image'))
            {
                getFileByIDDataTemp = {
                    ...getFileByIDDataTemp,
                    url: getFileByIDDataTemp?.preview?.image?.url
                }
                delete getFileByIDDataTemp.preview 
            }
            
            return json({
                message: 'Image successfully saved.',
                url: finalUrl,
                data: getFileByIDDataTemp
            }, { status: STATUS_CODES.OK });
        }
        return json({ message: "Not file instanceof File" }, { status: STATUS_CODES.BAD_REQUEST })
    } catch (error) {
        console.log('Error------', error)
        return json({ error: JSON.stringify(error) }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR })
    }
}

const getMineType = (fileType) => {
    for (const key in MIME_TYPE) {
        if (MIME_TYPE[key].includes(fileType)) {
            return key;
        }
    }
    return "FILE";
}


function splitToSubstrings(str, n) {
    var arr = [];
    let substr = 0;
    var loop = Math.ceil(str.length / n);
    for (let i = 0; i < loop; i++) {
        if (str.length < 4) {
            arr.push(str);
        } else {
            substr = str.slice(-n);
            str = str.slice(0, -n);
            arr.push(substr);
        }
    }
    arr = arr.reverse();
    if (arr[0].length != n) {
        loop = Math.abs(arr[0].length - n);
        for (let i = 0; i < loop; i++) {
            arr[0] = `0${arr[0]}`;
        }
    }
    let strr = '';
    for (let i = 0; i < arr.length; i++) {
        strr = `${strr}${arr[i]}/`;
    }
    return strr;
}
