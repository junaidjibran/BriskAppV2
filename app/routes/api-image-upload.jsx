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
import { authenticate } from "../shopify.server";

export async function action({ request }) {
    const { admin } = await authenticate.admin(request);
    try {

        const formData = await request.formData();
        const file = formData.get('fileInput');
        var file_name = file.name;
        var file_type = file.type;
        var size = file.size;
        var alt_tag = file_name.split('.')[0];
        if (!file || !file_name || !file_type || !alt_tag) {
            return {
                code: 400,
                message: 'Required file name, file type, base64 encoded image & alt-tag to process request.'
            };
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
                        filename: `${file_name}`,
                        httpMethod: 'POST',
                        mimeType: `${file_type}`,
                        resource: 'FILE' // Important to set this as FILE and not IMAGE. Or else when you try and create the file via Shopify's api there will be an error.
                    }]
                }
            }
        )

        let stagedUploadsQueryResult = await stagedUploadsQueryResponse.json()
        const target = stagedUploadsQueryResult.data.stagedUploadsCreate.stagedTargets[0];
        
        console.log(JSON.stringify(target, null, 4))

        const params = target.parameters; // Parameters contain all the sensitive info we'll need to interact with the storage bucket.
        const url = target.url; // This is the url you'll use to post data to bucket. It's a generic url that when combined with the params sends your data to the right place.
        const resourceUrl = target.resourceUrl; // This is the specific url that will contain your image data after you've uploaded the file to the staged target.
        const baseUrl = `https://cdn.shopify.com/s/files/1`; // Base url used to generate shopify cdn link
        let key;
        for (const obj of params) {
            if (obj.name === 'key') {
                key = obj.value;
            }
        }
        console.log(`Key before function: ${key}`);
        const keyArray = key.split('/');
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
        form.append('file', file, 'dummy.png');

        // console.log(`form: ${form}`);
        const formReq = await fetch(url, {
            method: 'POST',
            body: form
        })

        if (formReq.status != 201)
        {
            console.log("formRe00000000000000000000000000000000000000000000000000000000000q", formReq)
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
                            alt
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }
            `,
            {
                variables: {
                    files: {
                        alt: alt_tag,
                        contentType: 'IMAGE',
                        duplicateResolutionMode: 'APPEND_UUID',
                        originalSource: resourceUrl // Pass the resource url we generated above as the original source. Shopify will do the work of parsing that url and adding it to files.
                    }
                }
            }  
        )

        let createFileQueryResult = await createFileQueryResponse.json();

        // console.log(`createFileQueryResult: ${JSON.stringify(createFileQueryResult, null, 4)}`);

        // return createFileQueryResult
        if (createFileQueryResult?.data.fileCreate.userErrors.length != 0) {
            return {
                code: 500,
                message: 'Unable to upload image.',
                data: createFileQueryResult?.data.data.fileCreate.userErrors
            };
        }
        return {
            code: 200,
            message: 'Image successfully saved.',
            data: finalUrl,
        };


        // return stagedUploadsQueryResult;
        // Ensure to handle errors and responses appropriately.
        }
        return json({message : "Oops"})
    } catch (error) {
        console.log('Error------', error)
    }

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
