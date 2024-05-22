import prisma from "../db.server";

export async function orderCreation({ orderID, orderName, lineItems, shop, createdAt  }) {
    try {
        const resp  = await prisma.shopify_orders.create({
            data: {
                shopify_order_id: orderID.toString(),
                order_name: orderName,
                line_items: lineItems,
                shop: shop,
                created_at: createdAt
            }
        })
        return resp;
    } catch (error) {
        console.error('ERROR: orderCreation() :: Controller => ordersController ::: Catch ::: ', error)
    }
}