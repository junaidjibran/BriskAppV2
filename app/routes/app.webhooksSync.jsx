import { Layout, Page, Text, Card, InlineStack, Button, Banner, ResourceList, ResourceItem } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { useActionData, useSubmit, useLoaderData, useNavigation } from "@remix-run/react";
import { syncWebhooks } from "../controllers/webhooksController";
import { appWebhooks } from "../constants/webhooks";
import { RefreshIcon } from "@shopify/polaris-icons";
import { useEffect } from "react";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const allWebhooks = await admin.rest.resources.Webhook.all({
    session: session,
  });

  // console.log('-----allWebhooks', allWebhooks)

  if (!allWebhooks || !allWebhooks?.data?.length)
    return json({ error: 'no webhooks resigtered', allWebhooks }, { status: 500 });

  const webhooksToBeRegistered = []

  for (let index = 0; index < appWebhooks.length; index++) {
    const singleWebhook = appWebhooks[index];
    if (!allWebhooks.data.find(webhook => webhook.topic === singleWebhook.topic)) {
      webhooksToBeRegistered.push(singleWebhook)
    }
  }

  if (!allWebhooks?.data) {
    console.log("not a single meta feidl resiger");
  }

  const unRegisterWebhooks = appWebhooks.filter(appWebhook =>
    !allWebhooks?.data.some(testItem => testItem.topic === appWebhook.topic)
  );

  return json({ webhooks: allWebhooks, webhooksToBeRegistered, unRegisterWebhooks: unRegisterWebhooks ?? [] }, { status: 200 });
}

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  const formData = await request.formData();
  let action = formData.get('action');
  let webhooksToBeRegistered = JSON.parse(formData.get('webhooksToBeRegistered'));

  if (action === 'syncWebhooks') {

    let resp = await syncWebhooks(admin, session, webhooksToBeRegistered);

    if (resp === 'success')
      return json({ webhooks: 'sync successfull' }, { status: 200 });

    return json({ webhooks: 'sync unsuccessfull, something went wrong.', error: resp }, { status: 500 });
  } else if (request.method === 'PATCH') {
    const webhookId = formData.get('webhookId')
    const topic = formData.get('topic');
    const appUrl = process.env.NODE_ENV === 'production' ? process.env.SHOPIFY_APP_URL : 'https://5372-2401-ba80-aa90-c9c0-f103-893b-fcb0-3b52.ngrok-free.app/'
    console.log("request.method", request.method);

    const targetWebhooks = appWebhooks?.find(item => item?.topic === topic)
    console.log(" targetWebhooks", JSON.stringify(targetWebhooks, null , 4))

    const webhook = new admin.rest.resources.Webhook({ session: session });
    webhook.id = webhookId;
    webhook.address = appUrl + targetWebhooks?.address;
    await webhook.save({
      update: true,
    });

    console.log("webhookUpdate", JSON.stringify(webhook, null, 4));
    return json({ data: webhook, message: "Webhook update success.", status: "success" })
  } else if (request.method === 'POST') {
    const topic = formData.get('topic');
    console.log("request.method", request.method, topic)
    const appUrl = process.env.NODE_ENV === 'production' ? process.env.SHOPIFY_APP_URL : 'https://5372-2401-ba80-aa90-c9c0-f103-893b-fcb0-3b52.ngrok-free.app/'
    console.log("request.method", request.method);

    const targetWebhooks = appWebhooks?.find(item => item?.topic === topic)
    console.log("targetWebhooks", targetWebhooks)
    const webhook = new admin.rest.resources.Webhook({session: session});
    webhook.address = appUrl + targetWebhooks?.address;
    webhook.topic = topic;
    webhook.format = "json";
    await webhook.save({
      update: true,
    });
    console.log("webhookUpdate", JSON.stringify(webhook, null, 4));
    return json({ data: webhook, message: "Webhook create success.", status: "success" })
  } else if (request.method === 'DELETE') {
    const webhookId = formData.get('webhookId')
    const deleteWebHook = await admin.rest.resources.Webhook.delete({
      session: session,
      id: webhookId
    });

    const deleteWebHookData = await deleteWebHook.json()
    console.log("deleteWebHookData", JSON.stringify(deleteWebHookData, null, 4));
    // const topic = formData.get('topic');
    // const appUrl = process.env.NODE_ENV === 'production' ? process.env.SHOPIFY_APP_URL : 'https://fd1f-2400-adc5-406-6300-5834-682-c011-b98f.ngrok-free.app'
    // console.log("request.method", request.method);

    // const targetWebhooks = appWebhooks?.find(item => item?.topic === topic)
    // const webhook = new admin.rest.resources.Webhook({session: session});
    // webhook.address = appUrl + targetWebhooks?.address;
    // webhook.topic = topic;
    // webhook.format = "json";
    // const webhookCreate = await webhook.save({
    //   update: true,
    // });
    // console.log("webhookUpdate", JSON.stringify(webhookCreate, null, 4));
    return json({ data: deleteWebHookData, message: "Webhook delete success.", status: "success" })
  }

  return json({ webhooks: 'no action performed' }, { status: 200 });

}

export default function WebhooksSync() {
  const submit = useSubmit();
  const loaderData = useLoaderData();
  const nav = useNavigation();
  let { webhooksToBeRegistered, webhooks } = loaderData;
  const actionData = useActionData();

  console.log('----loaderdata', loaderData)
  console.log('----actionData', actionData)

  const isPageLoading = ["loading"].includes(nav.state);

  useEffect(() => {
    if (isPageLoading) {
        shopify.loading(true);
    }

    return () => {
        shopify.loading(false);
    }
}, [isPageLoading])

  const handleSyncWebhooks = () => {
    webhooksToBeRegistered = JSON.stringify(webhooksToBeRegistered);
    submit({ action: 'syncWebhooks', webhooksToBeRegistered }, {
      action: "",
      method: "post",
      encType: "multipart/form-data",
      relative: "route",
    });
  }

  // const handleDeleteWebhooks = (id) => {
  //   submit({ webhookId: id }, {
  //     action: "",
  //     method: "delete",
  //     encType: "multipart/form-data",
  //     relative: "route",
  //   });
  // }

  const handleUpdateWebHook = ({ id, topic }) => {
    console.log("handleUpdateWebHook", id);
    submit({ webhookId: id, topic: topic }, {
      action: "",
      method: "patch",
      encType: "multipart/form-data",
      relative: "route",
    });
  }

  const handleCreateWebHook = ({ topic }) => {
    console.log("handleCreateWebHook", topic);
    submit({ topic: topic }, {
      action: "",
      method: "post",
      encType: "multipart/form-data",
      relative: "route",
    });
  }

  console.log("webhooks", webhooks?.data)

  return (
    <Page title="App Settings" >
      <Layout>
        <Layout.Section>
          {webhooksToBeRegistered?.length > 0 &&
            <Banner
              title="Webhooks sync required!"
              tone="critical"
            >
              <p>
                Some webhooks are not registered properly. Please sync webhooks for app to work properly.
              </p>
            </Banner>
          }
          <div style={{ marginTop: '10px' }}>
            <Card>
              <InlineStack align="space-between" blockAlign="center">
                <div style={{ marginBottom: '15px' }}>
                  <Text as="p">Sync webhooks</Text>
                  <Text as="p">{process.env.NODE_ENV === 'production' ? process.env.SHOPIFY_APP_URL : 'https://5372-2401-ba80-aa90-c9c0-f103-893b-fcb0-3b52.ngrok-free.app/'}</Text>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <Button variant="primary" onClick={handleSyncWebhooks}>Sync</Button>
                  {/* <Button variant="primary" onClick={handleUpdateWebhooks}>Update All</Button> */}
                </div>
              </InlineStack>
            </Card>
          </div>
          <div style={{ marginTop: '10px' }}>
            <Card>
              <Text as="p">Need to Update webhooks</Text>
              <ResourceList
                resourceName={{ singular: 'Webhook', plural: 'Webhooks' }}
                items={webhooks?.data ?? []}
                renderItem={(item) => {
                  const { id, address, topic } = item;
                  const shortcutActions = [
                    {
                      content: 'Update',
                      icon: RefreshIcon,
                      onAction: () => handleUpdateWebHook({ id, topic })
                    }
                  ]
                  return (
                    <ResourceItem
                      id={id}
                      shortcutActions={shortcutActions}
                      persistActions
                    >
                      <Text variant="bodyMd" fontWeight="bold" as="h3">
                        {topic}
                      </Text>
                      <Text as="p">{address}</Text>

                    </ResourceItem>
                  );
                }}
              />
            </Card>
          </div>
          <div style={{ marginTop: '10px' }}>
            <Card>
              <Text as="p">Need to Subscribe webhooks</Text>
              <ResourceList
                resourceName={{ singular: 'Webhook', plural: 'Webhooks' }}
                items={loaderData?.unRegisterWebhooks ?? []}
                renderItem={(item) => {
                  const { address, topic } = item;
                  const shortcutActions = [
                    {
                      content: 'Subscribe',
                      icon: RefreshIcon,
                      onAction: () => handleCreateWebHook({ topic })
                    }
                  ]
                  return (
                    <ResourceItem
                      id={topic}
                      shortcutActions={shortcutActions}
                      persistActions
                    >
                      <Text variant="bodyMd" fontWeight="bold" as="h3">
                        {topic}
                      </Text>
                      <Text as="p">{address}</Text>

                    </ResourceItem>
                  );
                }}
              />
            </Card>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  )
}