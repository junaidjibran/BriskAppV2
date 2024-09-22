import prisma from "../db.server";
// import { getSizes } from "./sizes.controller";
const sizeKeys = ["Measurements (Inches) (Neck)", "Collar Size", "What's your collar size? (Collar/Neck size)"]

export async function getInventories(params) {
    try {
        const { page, searchQuery, limit } = params
        let query = {
            orderBy: {
                created_at: 'desc',
            },
        };

        if (searchQuery && searchQuery?.length) {
            query['where'] = {
                sku: {
                    contains: searchQuery
                }
            }
        }

        let pageInfo = {
            limit: limit,
        }
        if (page) pageInfo['page'] = parseInt(page)
            
        const resp = await prisma.inventory.paginate(query).withPages(pageInfo)

        return resp;
    } catch (error) {
        console.error('ERROR: getInventories() :: Controller => inventory.controller ::: Catch ::: ', error)
    }
}

export async function getInventory({ inventoryId }) {
    try {
        const resp = await prisma.inventory.findUnique({
            where: {
                id: inventoryId
            }
        })
        return resp;
    } catch (error) {
        console.error('ERROR: getInventory() :: Controller => inventory.controller ::: Catch ::: ', error)
    }
}
export async function getInventoryBySKU({ sku }) {
    try {
        const resp = await prisma.inventory.findUnique({
            where: {
                sku: sku
            }
        })
        return resp;
    } catch (error) {
        console.error('ERROR: getInventoryBySKU() :: Controller => inventory.controller ::: Catch ::: ', error)
    }
}

export async function createInventory({ sku, inventory }) {
    try {
        const resp = await prisma.inventory.create({
            data: {
                sku: sku,
                inventory: inventory
            }
        })
        return resp;
    } catch (error) {
        console.error('ERROR: createInventory() :: Controller => inventory.controller ::: Catch ::: ', error)
    }
}


export async function updateInventory({ inventoryId, sku, inventory }) {
    try {
        const resp = await prisma.inventory.update({
            where: {
                id: inventoryId
            },
            data: {
                sku: sku,
                inventory: inventory
            }
        })
        return resp;
    } catch (error) {
        console.error('ERROR: updateInventory() :: Controller => inventory.controller ::: Catch ::: ', error)
    }
}


export async function deleteInventory({ id }) {
    try {
        const resp = await prisma.inventory.delete({
            where: {
                id: id
            }
        })
        return resp;
    } catch (error) {
        console.error('ERROR: deleteInventory() :: Controller => inventory.controller ::: Catch ::: ', error)
    }
}

export async function inventoryTransactionsLogCreate({ sku, type, inventory, new_inventory, current_inventory }) {
    try {
        const updateInventory = await prisma.inventory_transactions.create({
            data: {
                sku: sku,
                type: type,
                inventory: inventory?.toString(),
                current_inventory: current_inventory.toString(),
                new_inventory: new_inventory.toString()
            }
        })
        return updateInventory;
    } catch (error) {
        console.error('ERROR: inventoryTransactionsLogCreate() :: Controller => inventory.controller ::: Catch ::: ', error)
    }
}

export async function inventoryTransactionsLogs(params) {
    try {
        const { page, searchQuery, limit } = params
        let query = {
            orderBy: {
                createdAt: 'desc',
            },
        };

        if (searchQuery && searchQuery?.length) {
            query['where'] = {
                sku: {
                    contains: searchQuery
                }
            }
        }

        let pageInfo = {
            limit: limit ?? 10,
        }
        if (page) pageInfo['page'] = parseInt(page);

        const data = await prisma.inventory_transactions.paginate(query).withPages(pageInfo)

        // console.log("inventoryTransactionsLogs================", JSON.stringify(data, null, 4));

        return data;
    } catch (error) {
        console.error('ERROR: inventoryTransactionsLogs() :: Controller => inventory.controller ::: Catch ::: ', error)
    }
}

export async function inventoryTransactions({ lineItems, type, orderName }) {
    try {
        console.log("inventoryTransactions ----- lineItems-----", lineItems)
        console.log("inventoryTransactions ----- type-----", type);
        const getSizesDB = await prisma.meters_per_size.findMany();

        if (!lineItems?.length) {
            return {
                message: "There is no lineitem found in order."
            }
        }

        for (let index = 0; index < lineItems.length; index++) {
            const lineitem = lineItems[index];

            let getTargetSize = null;

            // find target size in variant options
            const isVariantOptionSize = getSizesDB?.find(item => {
                const split = lineitem?.variantTitle?.split(" / ")
                return split?.includes(item?.size_title)
            })

            // find target size in lineitem properties
            const isLineItemProperties = getSizesDB?.find(size => {
                const findProp = lineitem?.properties?.find(prop => sizeKeys?.includes(prop?.name));
                return size?.size_title === findProp?.value;
            });


            if (isVariantOptionSize) {
                getTargetSize = isVariantOptionSize
            } else if (isLineItemProperties) {
                // console.log("")
                getTargetSize = isLineItemProperties
            }

            if (getTargetSize) {
                const getTotalInventoryOfSKU = await prisma.inventory.findUnique({
                    where: {
                        sku: lineitem?.sku
                    }
                })

                console.log("getTotalInventoryOfSKU", getTotalInventoryOfSKU)

                if (getTotalInventoryOfSKU) {
                    const balanceInventory = getTotalInventoryOfSKU?.inventory
                    console.log("balanceInventory", balanceInventory, typeof balanceInventory)
                    const subtractInventory = parseFloat(getTargetSize?.cloth_meters) * lineitem?.quantity
                    console.log("subtractInventory", subtractInventory, typeof subtractInventory)
                    const remainingInventory = parseFloat(balanceInventory) - parseFloat(subtractInventory)
                    console.log("remainingInventory", remainingInventory, typeof remainingInventory)

                    const getCurrentInventory = await prisma.inventory.findUnique({
                        where: {
                            sku: lineitem?.sku
                        }
                    })

                    const updateRemainingInventory = await prisma.inventory.update({
                        where: {
                            sku: lineitem?.sku
                        },
                        data: {
                            inventory: remainingInventory?.toString()
                        }
                    })

                    console.log("updateRemainingInventory", updateRemainingInventory)
                    const setInventoryTransactionLog = await prisma.inventory_transactions.create({
                        data: {
                            sku: lineitem?.sku,
                            type: type,
                            inventory: subtractInventory?.toString(),
                            current_inventory: getCurrentInventory?.inventory,
                            new_inventory: updateRemainingInventory?.inventory
                        }
                    })
                    console.log("setInventoryTransactionLog", setInventoryTransactionLog)
                }
            }
        }
    } catch (error) {
        console.error('ERROR: inventoryTransactions() :: Controller => inventory.controller ::: Catch ::: ', error)
    }
}