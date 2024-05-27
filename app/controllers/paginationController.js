import prisma from "../db.server";

export async function getPaginatedData({ cursor, take, shop, collection }) {
    try {
        const query = {
            cursor,
            take,
            skip: 1,

            orderBy: {
                created_at: 'desc',
            },
        }

        if (shop) {
            query["where"] = {
                shop: shop
            }
        }
        const data = await prisma[collection].findMany(query);
        return data;
    } catch (error) {
        console.error('ERROR: getPaginatedData() :: Controller => paginationController ::: Catch ::: ', error)
    }
}

export async function hasPreviousPage({ cursor, take, shop, collection }) {
    try {
        if (!cursor) {
            return false; // If no cursor provided, there's no previous page
        }
        const previousData = await getPaginatedData({ cursor, take, shop, collection });
        return previousData.length ? true : false;
    } catch (error) {
        console.error('ERROR: hasPreviousPage() :: Controller => paginationController ::: Catch ::: ', error)
    }
}

export async function hasNextPage({ cursor, take, shop, collection }) {
    try {
        if (!cursor) {
            return false; // If no cursor provided, there's no previous page
        }
        const nextData = await getPaginatedData({ cursor, take: take + 1, shop, collection });
        return nextData.length ? true : false;
    } catch (error) {
        console.error('ERROR: hasNextPage() :: Controller => paginationController ::: Catch ::: ', error)
    }
}