import { Layout, Page, Text, Card, InlineStack, Button, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { useActionData, useSubmit, useLoaderData } from "@remix-run/react";
import { syncWebhooks } from "../controllers/webhooksController";
import { appWebhooks } from "../constants/webhooks";
import { loggedInCheckRedirect } from "../helpers/session.server";

export const loader = async ({ request }) => {
  await loggedInCheckRedirect(request)
  const { admin, session } = await authenticate.admin(request);
  const allWebhooks = await admin.rest.resources.Webhook.all({
    session: session,
  });

  console.log('-----allWebhooks', allWebhooks)

  if (!allWebhooks || !allWebhooks?.data?.length)
    return json({ error: 'no webhooks resigtered', allWebhooks }, { status: 500 });

  const webhooksToBeRegistered = []

  for (let index = 0; index < appWebhooks.length; index++) {
    const singleWebhook = appWebhooks[index];
    if (!allWebhooks.data.find(webhook => webhook.topic === singleWebhook.topic)) {
      webhooksToBeRegistered.push(singleWebhook)
    }
  }
  return json({ webhooks: allWebhooks, webhooksToBeRegistered }, { status: 200 });
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
  }

  return json({ webhooks: 'no action performed' }, { status: 200 });

}

export default function WebhooksSync() {
  const submit = useSubmit();
  const loaderData = useLoaderData();
  let { webhooksToBeRegistered } = loaderData;
  const actionData = useActionData();

  console.log('----loaderdata', loaderData)
  console.log('----actionData', actionData)

  const handleSyncWebhooks = () => {
    webhooksToBeRegistered = JSON.stringify(webhooksToBeRegistered);
    submit({ action: 'syncWebhooks', webhooksToBeRegistered }, {
      action: "",
      method: "post",
      encType: "multipart/form-data",
      relative: "route",
    });
  }

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
                </div>
                <Button variant="primary" onClick={handleSyncWebhooks}>Sync</Button>
              </InlineStack>
            </Card>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  )
}