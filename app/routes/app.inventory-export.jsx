import { Card, Page } from "@shopify/polaris";
import InventoryNav from "../components/InventoryNav";

export default function ExportInventory() {
    return (
        <>
        
            <Page title="Export Inventory">
                <InventoryNav currentRoute={ location } />
                
                <Card>

                </Card>
            </Page>
        </>
    )
}
