import { Link, useNavigate } from "@remix-run/react";
import { Button, ButtonGroup } from "@shopify/polaris";

export default function SettingsNav({ currentRoute }) {
    const navigate = useNavigate()


    const checkActiveRoute = (getRoute) => {
        if (currentRoute && currentRoute?.pathname) return currentRoute?.pathname.includes(getRoute)
        return false
    }

    return (
        <>
            <div style={{ marginBottom: "10px" }}>
                <ButtonGroup>
                    <Button onClick={() => navigate('/app/vectors')} variant={checkActiveRoute('vectors') ? "primary" : "secondary"}>Vectors Upload</Button>
                    <Button onClick={() => navigate('/app/shopshirt')} variant={checkActiveRoute('shopshirt') ? "primary" : "secondary"}>Shop Shirt</Button>
                    <Button onClick={() => navigate("/app/manufacture-status")} variant={checkActiveRoute('manufacture-status') ? "primary" : "secondary"}>Manufacture Status</Button>
                    <Button onClick={() => navigate("/app/factory")} variant={checkActiveRoute('factory') ? "primary" : "secondary"}>Factory</Button>
                    <Button onClick={() => navigate("/app/orderSync")} variant={checkActiveRoute('orderSync') ? "primary" : "secondary"}>Order Sync</Button>
                </ButtonGroup>
            </div>
        </>
    )
}