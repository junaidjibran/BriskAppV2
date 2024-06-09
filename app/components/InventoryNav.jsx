import { useNavigate } from "@remix-run/react";
import { Button, ButtonGroup } from "@shopify/polaris";

export default function InventoryNav({ currentRoute }) {
    const navigate = useNavigate()


    const checkActiveRoute = (getRoute) => {
        if (currentRoute && currentRoute?.pathname) return currentRoute?.pathname.includes(getRoute)
        return false
    }

    return (
        <>
            <div style={{ marginBottom: "10px" }}>
                <ButtonGroup>
                    <Button onClick={() => navigate('/app/inventory-export')} variant={checkActiveRoute('inventory-export') ? "primary" : "secondary"}>Export Inventory</Button>
                    <Button onClick={() => navigate('/app/inventory-update')} variant={checkActiveRoute('inventory-update') ? "primary" : "secondary"}>Update Inventory</Button>
                    <Button onClick={() => navigate('/app/meters-per-size')} variant={checkActiveRoute('meters-per-size') ? "primary" : "secondary"}>Yards Per Size</Button>
                </ButtonGroup>
            </div>
        </>
    )
}