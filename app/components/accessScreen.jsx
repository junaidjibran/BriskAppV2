// import { useNavigate } from "@remix-run/react";
import { Card, EmptyState, Page } from "@shopify/polaris";

export default function AccessScreen() {
    // const navigate = useNavigate();

    return (
        <>
            <Page>
                <Card sectioned>
                    <EmptyState
                        heading="Access Restricted"
                        // action={{content: 'Login', onAction: () => navigate('/app/login')}}
                        // secondaryAction={{
                        //     content: 'Learn more',
                        //     url: 'https://help.shopify.com',
                        // }}
                        // footerContent={
                        //     <p>
                        //       If you don’t want to add a transfer, you can import your inventory
                        //       from.
                        //     </p>
                        //   }
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                        >
                        <p>You do not have the necessary permissions to view this page. Please contact your administrator if you believe this is an error or if you need access to this page.</p>
                    </EmptyState>
                </Card>
            </Page>
        </>
    )
}