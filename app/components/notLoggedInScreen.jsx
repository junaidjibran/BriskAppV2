import { useNavigate } from "@remix-run/react";
import { Card, EmptyState, Page } from "@shopify/polaris";

export default function NotLoggedInScreen() {
    const navigate = useNavigate();

    return (
        <>
            <Page>
                <Card sectioned>
                    <EmptyState
                        heading="You are not logged in"
                        action={{content: 'Login', onAction: () => navigate('/app/login')}}
                        // secondaryAction={{
                        //     content: 'Learn more',
                        //     url: 'https://help.shopify.com',
                        // }}
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                        >
                        {/* <p>You are not logged in</p> */}
                    </EmptyState>
                </Card>
            </Page>
        </>
    )
}