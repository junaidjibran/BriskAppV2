import { authenticate } from "../shopify.server";
import {
    IndexTable,
    Text,
    Card,
    Page,
    Button,
    Filters,
    Badge,
} from "@shopify/polaris";
import prisma from "../db.server";
import { json } from "@remix-run/node";
// import { useState, useCallback, useEffect } from "react";
import { useLoaderData, useNavigate, useNavigation } from "@remix-run/react";
import { dataTimeFormat } from "../helpers/dataFormat";
import Loader from '../components/loader';
import { STATUS_CODES } from "../helpers/response";
import CustomBadge from "../components/badge";
// import { jsonLogs } from "../helpers/logs";
// import { hasNextPage, hasPreviousPage } from "../controllers/paginationController";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@shopify/polaris-icons";
import NotLoggedInScreen from "../components/notLoggedInScreen";
import { loggedInCheck } from "../controllers/users.controller";
import AccessScreen from "../components/accessScreen";

export const loader = async ({ request, params }) => {
    try {
        const { admin, session, sessionToken } = await authenticate.admin(request);
        // if user is not logedIn it redirects to login page
        const shop = session?.shop

        const isLoggedIn = await loggedInCheck({ sessionToken })
        if (!isLoggedIn) {
            return json({ status: "NOT_LOGGED_IN", message: "You are not loggedIn." })
        }

        const url = new URL(request.url);
        const page = url.searchParams.get("page");
        const searchQuery = url.searchParams.get("searchQuery");

        let query = {
            orderBy: {
                created_at: 'desc',
            },
            where: {
                shop: shop
            },
        };

        if (searchQuery && searchQuery?.length) {
            query['where'] = {
                order_name: {
                    contains: searchQuery
                }
            }
        }

        let pageInfo = {
            limit: 30,
        }
        if (page) pageInfo['page'] = parseInt(page)


        // const getOrderCall = await prisma.shopify_orders.findMany(query)
        const [getOrderCall, pagination] = await prisma.shopify_orders.paginate(query).withPages(pageInfo)

        if (!getOrderCall.length) {
            return json(
                { 
                    message: "DB: Orders not found", 
                    data: { 
                        orders: getOrderCall,
                        scopes: isLoggedIn?.access, 
                        isAdmin: isLoggedIn?.is_admin
                    } 
                }, 
                { status: STATUS_CODES.NOT_FOUND })
        }


        const getFactories = getOrderCall.length ? await prisma.factories.findMany() : [];
        const getManufactureStatus = getOrderCall.length ? await prisma.manufacturing_status.findMany() : [];

        const ids = getOrderCall.map(id => "gid://shopify/Order/" + id.shopify_order_id);
        // console.log("ids------------", ids)
        const shopifyOrdersResp = await admin.graphql(`#graphql
            query MyQuery($ids: [ID!]!) {
                nodes(ids: $ids) {
                    ... on Order {
                        id
                        name
                        displayFinancialStatus
                        displayFulfillmentStatus
                        customer {
                            email
                            lastName
                            displayName
                            firstName
                        }
                    }
                }
            }`,
            {
                variables: {
                    "ids": ids
                }
            }
        )
        const shopifyOrdersData = await shopifyOrdersResp.json()
        // }
        // jsonLogs(shopifyOrdersData, "Shopify order slist--------------")

        // console.log("shopifyOrdersData------------------", JSON.stringify(shopifyOrdersData, null, 4))
        let updatedOrders = getOrderCall.map(item => {
            let matchFactory = getFactories.find(factoryID => factoryID.id === item.factory);
            let matchingItem = shopifyOrdersData?.data?.nodes?.find(order => order?.id?.split('/').pop() === item.shopify_order_id);
        
            if (!matchingItem) return item;
        
            const getSavedItemStatus = item?.line_items.filter(status => status?.manufacturingStatus);
            // console.log("getSavedItemStatus--------------------------------", JSON.stringify(getSavedItemStatus, null, 4));
        
            const mapStatusId = getSavedItemStatus.map(statusID => {
                const matchedStatus = getManufactureStatus.find(status => status.id === statusID?.manufacturingStatus);
                return matchedStatus;
            });
        
            const totalStatus = mapStatusId.reduce((acc, obj) => {
                const existingIndex = acc.findIndex(item => item?.id === obj?.id);
                if (existingIndex !== -1) {
                    acc[existingIndex].count++;
                } else {
                    acc.push({ ...obj, count: 1 });
                }
                return acc;
            }, []);
        
            // console.log("mapStatusId-------------", mapStatusId);
            // console.log("totalStatus-------------", totalStatus);
            return {
                ...item,
                displayFulfillmentStatus: matchingItem.displayFulfillmentStatus,
                displayFinancialStatus: matchingItem.displayFinancialStatus,
                gid: matchingItem.id,
                customer: matchingItem?.customer ?? null,
                factoryDetails: matchFactory ?? null,
                totalStatus
            };
        });
        
        return json(
            { 
                data: { 
                    orders: updatedOrders, 
                    pageInfo: pagination, 
                    scopes: isLoggedIn?.access, 
                    isAdmin: isLoggedIn?.is_admin
                } 
            },
            { status: STATUS_CODES.OK })
    } catch (error) {
        console.error("Loader Error:", error);
        return json({ error: JSON.stringify(error) }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
};

export default function Orders({ params }) {
    const navigate = useNavigate();
    const nav = useNavigation();
    const loadedData = useLoaderData();
    console.log('-------loader data', loadedData)

    // console.log("nav-----------------", nav)

    const [pageInfo, setPageInfo] = useState(null);
    const [queryValue, setQueryValue] = useState('');
    const [isSearching, setIsSearching] = useState(false)

    const orders = loadedData?.data?.orders || [];


    // const handleQueryValueRemove = useCallback(() => setQueryValue(''), []);
    const handleFiltersQueryChange = useCallback((value) => {
        setQueryValue(value);
        setIsSearching(true);
    }, [],);

    useEffect(() => {
        if (loadedData && loadedData?.data?.pageInfo) {
            setPageInfo(loadedData?.data?.pageInfo)
        }
    }, [loadedData])

    // Debounce functionality...
    useEffect(() => {
        if (!queryValue && !isSearching) return
    
        const timeoutId = setTimeout(() => {
          console.log("queryValue is ----------", queryValue)
            navigate(`/app?searchQuery=${queryValue}`)
        }, 500);
    
        return () => {
          clearTimeout(timeoutId);
        };
      }, [queryValue]);


    const resourceName = {
        singular: "order",
        plural: "orders",
    };


    const rowMarkup = orders.map(
        ({ shopify_order_id, order_name, created_at, customer, displayFulfillmentStatus, displayFinancialStatus, lineitemStatusCount, factoryDetails, totalStatus, isUrgent }, index) => {
            return (
                <IndexTable.Row
                    id={shopify_order_id}
                    key={shopify_order_id}
                    position={index}
                    onClick={() => {
                        navigate(`/app/orders/${shopify_order_id}`);
                    }}
                >
                    <IndexTable.Cell>
                        <Text variant="bodyMd" fontWeight="bold" as="span">
                            {order_name.replace(/#/g, '')}
                        </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>{created_at ? dataTimeFormat(created_at) : '-'}</IndexTable.Cell>
                    <IndexTable.Cell>{customer?.displayName ?? '-'}</IndexTable.Cell>
                    <IndexTable.Cell>{displayFinancialStatus ?? "-"}</IndexTable.Cell>
                    <IndexTable.Cell>{displayFulfillmentStatus ?? "-"}</IndexTable.Cell>
                    <IndexTable.Cell>{isUrgent ? <Badge tone="critical">Urgent</Badge> : "-"}</IndexTable.Cell>
                    <IndexTable.Cell>
                        <div style={{ display: "flex", gap: "3px" }}>
                            {totalStatus && totalStatus.length ? totalStatus?.map((statusInfo, statusIndex) => (
                                <CustomBadge fontSize="10px" key={ statusInfo?.id } title={ `${ statusInfo?.count  } ${ statusInfo?.title }`  } color={ statusInfo?.color_code } />
                            )) : '-'}
                        </div>
                    </IndexTable.Cell>
                    <IndexTable.Cell>{factoryDetails?.title ?? '-'}</IndexTable.Cell>

                </IndexTable.Row>
            )
        }
    );

    if (loadedData?.status === "NOT_LOGGED_IN") {
        return (
            <>
                <Page title="Orders">
                    { nav.state === 'loading' ? <Loader /> : null }
                    <NotLoggedInScreen />
                </Page>
            </>
        )
    }

    if (!loadedData?.data?.isAdmin && !loadedData?.data?.scopes?.includes('view_orders')) {
        return (
            <>
                <Page title="Orders">
                    { nav.state === 'loading' ? <Loader /> : null }
                    <AccessScreen />
                </Page>
            </>
        )
    }
    


    // const isloading = nav.state === "loading";
    return (
        <>
            {nav.state === 'loading' ? <Loader /> : null}
            {/* <pre>
                { JSON.stringify(pageinfo, null, 4) }
            </pre> */}
            <Page title="Orders" fullWidth
            >
                <Card>
                    <Filters
                        queryValue={ queryValue }
                        queryPlaceholder="Search order number..."
                        filters={ [] }
                        onQueryChange={ handleFiltersQueryChange }
                        onQueryClear={ () => { console.log("onQueryClear") } }
                        onClearAll={ () => { console.log("onClearAll") } }
                        // loading={ nav.state === 'loading' && isSearching }
                     />
                    {/* <TextField
                        label="Search"
                        value={value}
                        onChange={handleChange}
                        autoComplete="off"
                        clearButton
                        onClearButtonClick={handleClearButtonClick}
                        loading
                    /> */}
                    <IndexTable
                        // @ts-ignore
                        // pagination={{
                        //     hasNext: false,
                        //     onNext: () => {},
                        //     hasPrevious: false,
                        //     onPrevious: () => {}
                        // }}
                        hasZebraStriping
                        hasMoreItems
                        resourceName={resourceName}
                        itemCount={orders?.length}
                        headings={[
                            { title: "Order ID" },
                            { title: "Created At" },
                            { title: "Customer" },
                            { title: "Financial Status" },
                            { title: "Fulfillment Status" },
                            { title: "Urgency Status"},
                            { title: "Manufacturing Status" },
                            { title: "Factory" }
                        ]}
                    >
                        {rowMarkup}
                    </IndexTable>

                    {
                        orders.length && (
                            <div style={{ display: "flex", justifyContent: "center", gap: "5px", paddingTop: "15px" }}>
                                <Button 
                                    disabled={ pageInfo?.isFirstPage } 
                                    onClick={ () => navigate(`/app?page=${ pageInfo?.previousPage }`) }
                                    icon={ ChevronLeftIcon }
                                    />
                                
                                <Button 
                                    disabled={ pageInfo?.isLastPage } 
                                    onClick={ () => navigate(`/app?page=${ pageInfo?.nextPage }`) }
                                    icon={ ChevronRightIcon } 
                                    />
                            </div>
                        )
                    }

                    {/* {
                            <div style={{ display: "flex", justifyContent: "center", gap: "5px", paddingTop: "15px" }}>
                                <Button 
                                    disabled={ !pageinfo?.hasPrev } 
                                    onClick={ () => navigate(`/app?cursor=${pageinfo?.startCursor}&page-action=prev`) }
                                    icon={ ChevronLeftIcon }
                                    />
                                
                                <Button 
                                    disabled={ !pageinfo?.hasNext } 
                                    onClick={ () => navigate(`/app?cursor=${pageinfo?.endCursor}&page-action=next`) }
                                    icon={ ChevronRightIcon } 
                                    />
                            </div>
                      } */}
                    {/* <div style={{ paddingTop: '15px', display: 'flex', justifyContent: 'center' }}>
                        <Pagination
                            hasNext={loadedData.pageInfo?.hasNextPage}
                            onNext={() => {
                                const nextPage = loadedData.pageInfo?.endCursor;
                                navigate(`/app/orders?page=next&cursor=${nextPage}`);
                            }}
                            hasPrevious={loadedData.pageInfo?.hasPreviousPage}
                            onPrevious={() => {
                                const previousPage = loadedData.pageInfo?.startCursor;
                                navigate(`/app/orders?page=previous&cursor=${previousPage}`);
                            }}
                        ></Pagination>
                    </div> */}
                </Card>
            </Page>
        </>

    );
}