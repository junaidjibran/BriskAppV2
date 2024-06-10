import { Badge, Button, Card, DatePicker, IndexTable, Modal, Page, Text } from "@shopify/polaris";
import InventoryNav from "../components/InventoryNav";
import { json, useActionData, useLoaderData, useLocation, useNavigate, useNavigation, useSubmit } from "@remix-run/react";
import { STATUS_CODES } from "../helpers/response";
import { loggedInCheck } from "../controllers/users.controller";
import { authenticate } from "../shopify.server";
import { useCallback, useEffect, useState } from "react";
import { inventoryTransactionsLogs } from "../controllers/inventory.controller";
import { dataTimeFormat } from "../helpers/dataFormat";
import { ChevronLeftIcon, ChevronRightIcon } from "@shopify/polaris-icons";
import Loader from "../components/loader";
import * as XLSX from 'xlsx';
import FileSaver from 'file-saver';
import NotLoggedInScreen from "../components/notLoggedInScreen";
import AccessScreen from "../components/accessScreen";

export const loader = async ({ request }) => {
    try {
        const { sessionToken } = await authenticate.admin(request);

        const isLoggedIn = await loggedInCheck({ sessionToken })
        if (!isLoggedIn) {
            return json({ status: "NOT_LOGGED_IN", message: "You are not loggedIn." })
        }

        const url = new URL(request.url);
        const page = url.searchParams.get("page");
        const searchQuery = url.searchParams.get("searchQuery");
        const [logs, pageInfo] = await inventoryTransactionsLogs({ limit: 100, page, searchQuery })

        return json(
            {
                data: {
                    logs: logs ?? [],
                    pageInfo: pageInfo,
                    scopes: isLoggedIn?.access,
                    isAdmin: isLoggedIn?.is_admin
                }
            },
            { status: STATUS_CODES.OK }
        )

    } catch (error) {
        return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
}

export default function ExportInventory() {
    const location = useLocation();
    const navigate = useNavigate();
    const loaderData = useLoaderData();
    const actionData = useActionData();
    const nav = useNavigation();

    console.log("loaderData------------------", loaderData)
    console.log("actionData------------------", actionData)
    const isPageLoading = ["loading"].includes(nav.state);

    const [logs, setLogs] = useState([]);
    const [pageInfo, setPageInfo] = useState(null);
    const [isExportModal, setIsExportModal] = useState(false)
    const [isExportLoading, setIsExportLoading] = useState(false)

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const futureData = new Date();
    futureData.setHours(0, 0, 0, 0);
    futureData.setDate(currentDate.getDate() + 30)

    const [{ month, year }, setDate] = useState({ month: currentDate.getMonth(), year: currentDate.getFullYear() });
    const [selectedDates, setSelectedDates] = useState({
        start: currentDate,
        end: futureData,
    });

    const handleMonthChange = useCallback((month, year) => setDate({ month, year }), []);
    const handleExportModal = useCallback(() => setIsExportModal(!isExportModal), [isExportModal]);

    // useEffect(() => {
    //     const getCurrentData = new Date()
    //     console.log(getCurrentData);
    // }, [])

    useEffect(() => {
        if (loaderData?.status === "error") {
            shopify.toast.show(loaderData?.message, { isError: true });
        }

        if (loaderData?.data?.logs) {
            console.log("isLoaderData")
            setLogs(loaderData?.data?.logs ?? [])
        }

        if (loaderData?.data?.pageInfo) {
            setPageInfo(loaderData?.data?.pageInfo ?? null)
        }

    }, [loaderData])

    useEffect(() => {
        if (actionData && actionData?.status?.length) {
            if (actionData?.status === 'error') {
                shopify.toast.show(actionData?.message, { isError: true });
            }

            if (actionData?.status === 'success') {
                shopify.toast.show(actionData?.message, { isError: false });
            }
        }
    }, [actionData])

    const exportHandle = async () => {
        try {
            setIsExportLoading(true);
            const fetchDataResp = await fetch("/api/export-sheet", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "startDate": selectedDates?.start,
                    "endDate": selectedDates?.end,
                })
            })
            if (!fetchDataResp.ok) {
                throw new Error(JSON.stringify(fetchDataResp))   
            }

            setIsExportLoading(false);
            const fetchData = await fetchDataResp.json()
            console.log("fetchData", fetchData)
            const data = fetchData?.data?.finalArray;
            const worksheet = XLSX.utils.aoa_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
            // Buffer to store the generated Excel file
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
            FileSaver.saveAs(blob, `${new Date()}.xlsx`);
            handleExportModal();

        } catch (error) {
            setIsExportLoading(false);
            shopify.toast.show(error, { isError: true });
            console.error('ERROR: exportHandle() :: inventory-export.jxs => catch ::: ', error);
        }
    }

    if (loaderData?.status === "NOT_LOGGED_IN") {
        return (
            <>
                <Page title="Export Invetory Sheet">
                    { nav.state === 'loading' ? <Loader /> : null }
                    <InventoryNav currentRoute={ location } />
                    <NotLoggedInScreen />
                </Page>
            </>
        )
    }

    if (!loaderData?.data?.isAdmin && !loaderData?.data?.scopes?.includes('export_inventory')) {
        return (
            <>
                <Page title="Export Invetory Sheet">
                    { nav.state === 'loading' ? <Loader /> : null }
                    <InventoryNav currentRoute={ location } />
                    <AccessScreen />
                </Page>
            </>
        )
    }


    return (
        <>
            {isPageLoading && (<Loader />)}
            <Modal
                open={isExportModal}
                onClose={handleExportModal}
                title="Export Invetory Sheet"
                primaryAction={{
                    content: 'Export',
                    onAction: () => exportHandle(),
                    loading: isExportLoading
                }}
                secondaryActions={[
                    {
                        content: 'Cancel',
                        onAction: handleExportModal
                    },
                ]}
            >
                <Modal.Section>
                    {/* <pre>
                        {JSON.stringify(selectedDates, null, 4)}
                    </pre> */}
                    <DatePicker
                        month={month}
                        year={year}
                        onChange={setSelectedDates}
                        onMonthChange={handleMonthChange}
                        selected={selectedDates}
                        multiMonth
                        allowRange
                    />
                </Modal.Section>
            </Modal>
            <Page
                title="Export Inventory"
                primaryAction={
                    <Button
                        loading={false}
                        onClick={handleExportModal}
                        variant="secondary"
                    >
                        Export Sheet
                    </Button>
                }>
                <InventoryNav currentRoute={location} />
                <Card>
                    <IndexTable
                        selectable={false}
                        resourceName={{
                            singular: "Invetory log",
                            plural: "Invetory Logs",
                        }}
                        itemCount={logs?.length}
                        headings={[
                            { title: "SKU" },
                            { title: "Created At" },
                            { title: "Action" },
                            { title: "Current Invetory (Yards)" },
                            { title: "Update Inventory (Yards)" },
                            { title: "New inventory (Yards)" }
                        ]}
                    >
                        {
                            logs?.map((log, index) => (
                                <IndexTable.Row
                                    id={log?.id}
                                    key={log?.id}
                                    position={index}
                                >
                                    <IndexTable.Cell>
                                        <Text variant="bodyMd" fontWeight="bold" as="span">
                                            {log?.sku}
                                        </Text>
                                    </IndexTable.Cell>
                                    <IndexTable.Cell>{log?.createdAt ? dataTimeFormat(log?.createdAt) : '-'}</IndexTable.Cell>
                                    <IndexTable.Cell>
                                        {
                                            log?.type === 'ADD' && (
                                                <Badge tone="attention">{log?.type}</Badge>
                                            )
                                        }
                                        {
                                            log?.type === 'REMOVE' && (
                                                <Badge tone="critical">{log?.type}</Badge>
                                            )
                                        }
                                        {
                                            log?.type === 'UPDATE' && (
                                                <Badge tone="warning">{log?.type}</Badge>
                                            )
                                        }
                                    </IndexTable.Cell>
                                    <IndexTable.Cell>{log?.current_inventory ?? "-"}</IndexTable.Cell>
                                    <IndexTable.Cell>{log?.inventory ?? "-"}</IndexTable.Cell>
                                    <IndexTable.Cell>{log?.new_inventory ?? "-"}</IndexTable.Cell>
                                </IndexTable.Row>
                            ))
                        }
                    </IndexTable>

                    {
                        logs?.length && (
                            <div style={{ display: "flex", justifyContent: "center", gap: "5px", paddingTop: "15px" }}>
                                <Button
                                    disabled={pageInfo?.isFirstPage}
                                    onClick={() => navigate(`/app/inventory-export?page=${pageInfo?.previousPage}`)}
                                    icon={ChevronLeftIcon}
                                />

                                <Button
                                    disabled={pageInfo?.isLastPage}
                                    onClick={() => navigate(`/app/inventory-export?page=${pageInfo?.nextPage}`)}
                                    icon={ChevronRightIcon}
                                />
                            </div>
                        )
                    }
                </Card>
            </Page>
        </>
    )
}
