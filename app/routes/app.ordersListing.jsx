  import { authenticate } from "../shopify.server";
  import {
    IndexTable,
    useIndexResourceState,
    Text,
    Card,
    Page,
    Pagination,
    Frame,
    Loading,
    Select
  } from "@shopify/polaris";
  import prisma from "../db.server";
  import { json } from "@remix-run/node";
  import { useLoaderData, useNavigate, useNavigation } from "@remix-run/react";
  import { dataTimeFormat } from "../helpers/dataFormat";
  import Loader from '../components/loader';
  
  export const loader = async ({ request }) => {
    try {

      const url = new URL(request.url);
      const cursor = url.searchParams.get("cursor");
      const page = url.searchParams.get("page");
      const itemsPerPage = url.searchParams.get("items") || 25;

      const { session, admin } = await authenticate.admin(request);
      const manufactureStatusInfo = await prisma.manufacturing_status.findMany();
      const getFactory = await prisma.factories.findMany();
      const statusInfo = {};
      manufactureStatusInfo.forEach((status) => {
        statusInfo[status.id] = {
          title: status.title,
          colorCode: status.color_code,
          manufactureId: status.id,
        };
      });
    
      let graphqlVariables = {}
      let query = nextPageQuery

      if(page == 'next'){
        graphqlVariables.first = itemsPerPage
        graphqlVariables.after = cursor
      }
      else if(page == 'previous'){
        graphqlVariables.before = cursor
        graphqlVariables.last = itemsPerPage
        query = prevPageQuery
      }
      else {
        graphqlVariables.first = itemsPerPage
      }
      const response = await admin.graphql(
        query
       ,
      {
        variables: graphqlVariables,
      }
      );
      const responseJson = await response.json();

      if (responseJson.errors) {
        console.error("GraphQL Errors:", responseJson.errors);
      }
      const ordersData = responseJson?.data?.orders.edges.map((edge) => edge.node) || [];
     
    const prismaLineItems = await Promise.all(
      ordersData.map(async (order) => {
        const orderId = order.id.split('/').pop();
        const orderFromDb = await prisma.shopify_orders.findUnique({
          where: {
            shopify_order_id: orderId,
            shop: session?.shop
          },
        });

        let lineitemStatusCount = [];
    
        if (orderFromDb?.line_items?.length) {
          for (let x = 0; x < orderFromDb?.line_items?.length; x++) {
            const dbLintItem = orderFromDb.line_items[x];
            const status = statusInfo[dbLintItem?.status];
            const existingStatusIndex = lineitemStatusCount.findIndex((item) => item.status == status);

            if (existingStatusIndex !== -1) {
              lineitemStatusCount[existingStatusIndex].count += 1;
            } else {
              
              lineitemStatusCount.push({ status, count: 1 });
            }
          }
        }

        if (orderFromDb) {
          order.factory = getFactory.find(item => item.id === orderFromDb?.factory)
        } else {
          order.factory = null
        }
        order.lineitemStatusCount = lineitemStatusCount;
        return { order, orderFromDb, getFactory};
      })
    );
    
    

// ... Existing code ...

      
      // console.log('----prismaLineItems', prismaLineItems)
   
      return json({
        shop: session.shop.replace(".myshopify.com", ""),
        ordersData: ordersData,
        prismaLineItems,
        manufactureStatusInfo,
        statusInfo,
        pageInfo: responseJson?.data?.orders.pageInfo,
        //asd: session.onlineAccessInfo
        onlineAccessInfo: responseJson?.data?.onlineAccessInfo 
    
      });
    } catch (error) {
      console.error("Loader Error:", error);
      return json({
        shop: "",
        ordersData: [],
      });
    }
  };

  export default function Orders({params}) {
    const navigate = useNavigate();
    const loadedData = useLoaderData();
    console.log('-------loader data', loadedData )
    const ordersData = loadedData.ordersData || [];
    // const [selected, setSelected] = useState('today');
    // const [searchParams, setSearchParams] = useSearchParams();

  // Get a specific query parameter
    // const page = searchParams.get('page');
    
    // const itemsPerPage = 2;
    // const [currentPage, setCurrentPage] = useState(1);

    // const startIndex = (currentPage - 1) * itemsPerPage;
    // const endIndex = startIndex + itemsPerPage;

    const orders = ordersData
    const resourceName = {
      singular: "order",
      plural: "orders",
    };

    const { selectedResources, allResourcesSelected, handleSelectionChange } =
      useIndexResourceState(orders);

    const rowMarkup = orders.map(
      ({ id, name, createdAt, customer, totalPriceSet, displayFulfillmentStatus, displayFinancialStatus,lineitemStatusCount, factory }, index) => {
        // concsole.log('loadedDatalineitemStatusCount', lineitemStatusCount)
        return(
        <IndexTable.Row
          id={id}
          key={id}
          position={index}
          onClick={() => {
            console.log("okok");
            const extractedOrderID = id.split('/').pop();
            navigate(`/app/orders/${extractedOrderID}`);
          // navigate(`/app/orders/${id}`);
          }}
        >
          <IndexTable.Cell>
            <Text variant="bodyMd" fontWeight="bold" as="span">
            {name}
            </Text>
          </IndexTable.Cell>
          <IndexTable.Cell>{ dataTimeFormat(createdAt) }</IndexTable.Cell>
          <IndexTable.Cell>{customer?.displayName || 'No customer name'}</IndexTable.Cell>
          {/* <IndexTable.Cell>{totalPriceSet?.shopMoney?.amount} {totalPriceSet?.shopMoney?.currencyCode}</IndexTable.Cell> */}
          <IndexTable.Cell>{displayFinancialStatus}</IndexTable.Cell>
          <IndexTable.Cell>{displayFulfillmentStatus}</IndexTable.Cell>
          <IndexTable.Cell>
          <div>
            { lineitemStatusCount.length ? lineitemStatusCount?.map((statusInfo, statusIndex) => (
              <span key={statusIndex} 
                    style={{
                    borderRadius: '8px',
                    padding: '2px 10px',
                    textAlign: 'center',
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: '#FFF',
                    fontWeight: 500,
                    fontSize: '12px',
                    backgroundColor: statusInfo?.status?.colorCode,
                    marginRight: '5px'
                    }}>
                {statusInfo?.count}{"   "}{statusInfo?.status?.title} 
              </span>
            )) : '-'}
          </div>
        </IndexTable.Cell>
        <IndexTable.Cell>{ factory?.title ?? '-' }</IndexTable.Cell>
                
                </IndexTable.Row>
              )
                }
            );
              
    const nav = useNavigation();
    // const isloading = nav.state === "loading";

    // const options = [
    //   {label: '5', value: '5'},
    //   {label: '10', value: '10'},
    //   {label: '20', value: '20'},
    //   {label: '50', value: '50'},
    // ];

    // const handleSelectChange = useCallback(
    //   (value) => setSelected(value),
    //   [],
    // );

    // useEffect(() => {
    //   const nextPage = loadedData.pageInfo?.endCursor;
    //   navigate(`/app/orders?page=${page}&cursor=${nextPage}&items=${selected}`)
    // }, [selected])

    // if (isloading) {
    //   return (
    //     <Frame>
    //       <Loader/>
    //       <Loading></Loading>
    //     </Frame>
    //   );
    // } else {
      return (
        <>
          {nav.state === 'loading' ? <Loader /> : null}
          <Page title="Orders" fullWidth 
        // secondaryActions={<Select
        //   label="Orders per page"
        //   labelInline
        //   options={options}
        //   onChange={handleSelectChange}
        //   value={selected}
        // />}
        >
          
          <Card>
            <IndexTable
              hasZebraStriping
              hasMoreItems
              resourceName={resourceName}
              itemCount={ordersData.length}
              selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: "Order ID" },
                { title: "Created At" },
                { title: "Customer" },
                // { title: "Total Price" },
                { title: "Financial Status" },
                { title: "Fulfillment Status" },
                { title:  "Manufacturing Status"},
                { title: "Factory" }
              ]}
            >
              {rowMarkup}
            </IndexTable>
            <div style={{ paddingTop: '15px', display: 'flex', justifyContent: 'center' }}>
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
            </div>
          </Card>
        </Page>
        </>
        
      );
    // }
  }

  // export async function action({ request }) {
  //   console.log("app index screen");
  //   return json({ actionData: "" });
  // }

  const nextPageQuery = `#graphql
  query($first: Int, $after: String) {
  orders(first: $first, after: $after, query: "tag:BriskP", reverse: true) {
  #  orders(first: $first, after: $after, reverse: true) {
      pageInfo {
        hasNextPage
        hasPreviousPage 
        endCursor
        startCursor
      }
      edges {
        cursor
        node {
          id
          name
          createdAt
          customer {
            displayName
          }
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          displayFulfillmentStatus
          displayFinancialStatus
        }
      }
    }
  }
`

const prevPageQuery = `#graphql
  query($last: Int, $before: String) {
  orders(last: $last, before: $before, query: "tag:BriskP", reverse: true) {
    # orders(last: $last, before: $before,reverse: true) {
      pageInfo {
        hasNextPage
        hasPreviousPage 
        endCursor
        startCursor
      }
      edges {
        cursor
        node {
          id
          name
          createdAt
          customer {
            displayName
          }
          totalPriceSet {
            shopMoney {
              amount
            }
          }
          displayFulfillmentStatus
          displayFinancialStatus
        }
      }
    }
  }
`