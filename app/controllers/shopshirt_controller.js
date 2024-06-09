import prisma from "../db.server";

export async function prismaGetShopShirt(params) {
    try {
        const { page, limit, shop, searchIds } = params
        let query = {
            orderBy: {
                created_at: 'desc',
            },
            where: {
                shop: shop
            }
        };

        if (searchIds?.length) {
            query['where'] = {
                product_id: {
                    in: searchIds
                }
            }
        }

        // if (searchQuery && searchQuery?.length) {
        //     query['where'] = {
        //         title_english: {
        //             contains: searchQuery
        //         }
        //     }
        // }

        let pageInfo = {
            limit: limit ?? 10,
        }
        if (page) pageInfo['page'] = parseInt(page)

        const resp = prisma.shop_shirt.paginate(query).withPages(pageInfo)

        return resp

        // return await prisma.shop_shirt.findMany();
    } catch (error) {
        console.error('ERROR: prismaGetShopShirt() :: Controller => shopShirt.controller ::: Catch ::: ', error)
    }
};

export async function prismaDeleteShopShirt({ id }) {
    return await prisma.shop_shirt.delete({ where: { "id": id } });
};

export async function prismaUpdateShopShirt({ vectorsIDs, productID, id }) {
    return await prisma.shop_shirt.update({
        where: {
            "id": id
        },
        data: {
            "product_id": productID,
            "vectors_ids": vectorsIDs
        }
    });
};

export async function prismaCreateShopShirt({ productID, vectorsIDs }) {
    return await prisma.shop_shirt.create({
        data: {
            "product_id": productID,
            "vectors_ids": vectorsIDs
        }
    });
};

// export async function getPaginatedData(cursor, take, shop) {
//     const data = await prisma.shop_shirt.findMany({
//         where: {
//             shop
//         },
//         cursor,
//         take,
//         skip: 1,

//         orderBy: {
//             created_at: 'desc',
//         },
//     });
//     return data;
// }

// export async function hasPreviousPage(cursor, take, shop) {
//     if (!cursor) {
//         return false; // If no cursor provided, there's no previous page
//     }
//     const previousData = await getPaginatedData(cursor, take, shop);
//     return previousData.length ? true : false;
// }

// export async function hasNextPage(cursor, take, shop) {
//     if (!cursor) {
//         return false; // If no cursor provided, there's no previous page
//     }
//     const nextData = await getPaginatedData(cursor, take + 1, shop);
//     return nextData.length ? true : false;
// }

