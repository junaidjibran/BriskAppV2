import { Card, Page } from "@shopify/polaris";
import InventoryNav from "../components/InventoryNav";
import { useLocation } from "@remix-run/react";

export default function ExportInventory() {
    const location = useLocation();
    return (
        <>
        
            <Page title="Export Inventory">
                <InventoryNav currentRoute={ location } />
                <Card>
                    Export Inventory
                </Card>
            </Page>
        </>
    )
}
