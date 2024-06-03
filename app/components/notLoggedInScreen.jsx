import { useNavigate } from "@remix-run/react";
import { EmptyState } from "@shopify/polaris";

export default function NotLoggedInScreen() {
    const navigate = useNavigate();

    return (
        <>
            <EmptyState
                heading="You are not logged in"
                action={{content: 'Login', onAction: () => navigate('/app/login')}}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
            </EmptyState>
        </>
    )
}