import { json } from "@remix-run/react";
import { STATUS_CODES } from "../helpers/response";
import { getInventories } from "../controllers/inventory.controller";
import prisma from "../db.server";

function getFormattedDates(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const dates = [];

    while (startDate <= endDate) {
        const day = startDate.getDate();
        const month = startDate.toLocaleString('default', { month: 'long' });
        const year = startDate.getFullYear();
        dates.push(`${day}-${month}-${year}`);
        startDate.setDate(startDate.getDate() + 1);
    }

    return dates ?? [];
}

function getDateOnly(getDate) {
    const startDate = new Date(getDate);
    const day = startDate.getDate();
    const month = startDate.toLocaleString('default', { month: 'long' });
    const year = startDate.getFullYear();

    return `${day}-${month}-${year}` ?? null
}

export const action = async ({ request }) => {
    try {
        const { startDate, endDate } = await request.json();
        if (!startDate || !endDate) {
            return json({ status: "error", message: "Starting or Ending is missing" }, { status: STATUS_CODES.BAD_REQUEST });
        }

        console.log("startDate", new Date(startDate), "endDate", new Date(endDate))

        const [getAllSKUs] = await getInventories({ page: null, limit: null, searchQuery: null })
        const [getLogs] = await prisma.inventory_transactions.paginate({
            orderBy: {
                createdAt: 'asc',
            },
            where: {
                createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            }
        }).withPages({
            limit: null
        })
        let finalArray = [];

        let tableHeaders = ["Description", "SKU", "Opening Balance", "New Purchase", "Date of Purchase", "Price / Yard", "Total Fabric In Hand"]
        const getDateRange = getFormattedDates(startDate, endDate)
        tableHeaders.push(...getDateRange)
        tableHeaders.push(...["Fabric yards used", "Fabric Yards in Hand", "Fabric Amount in Hand"])
        finalArray.push(tableHeaders);

        const FilterInventoryRemove = getLogs?.filter(item => item?.type === 'REMOVE');
        const FilterInventoryAdd = getLogs?.filter(item => item?.type === 'ADD');
        const FilterInventoryUpdate = getLogs?.filter(item => item?.type === 'UPDATE');

        console.log("FilterInventoryRemove", FilterInventoryRemove)
        console.log("FilterInventoryAdd", FilterInventoryAdd)
        console.log("FilterInventoryUpdate", FilterInventoryUpdate)


        getAllSKUs.forEach(item => {
            const tempRow = []
            const getSKU = item?.sku;
            const filterBySKU = FilterInventoryRemove.filter(fItem => fItem?.sku === item?.sku);
            let totalFabricBefore = 0
            let dateOfPurchase = "-"

            tempRow.push("") // Description
            tempRow.push(getSKU); // SKU

            const filterBySKUUpdate = FilterInventoryUpdate.filter(fItem => fItem?.sku === item?.sku);
            const filterBySKUAdd = FilterInventoryAdd.filter(fItem => fItem?.sku === item?.sku);
            console.log("filterBySKUUpdate", filterBySKUUpdate)
            if (filterBySKUUpdate?.length) {
                tempRow.push(parseFloat(filterBySKUUpdate[0]?.new_inventory) ?? 0)    // Opening Balance
                tempRow.push(0)    // New Purchase
                totalFabricBefore = filterBySKUUpdate[0]?.new_inventory
                dateOfPurchase = getDateOnly(filterBySKUUpdate[0]?.createdAt)
            } else if (filterBySKUAdd?.length) {
                tempRow.push(0)    // New Purchase
                tempRow.push(parseFloat(filterBySKUAdd[0]?.new_inventory) ?? 0)    // Opening Balance
                totalFabricBefore = filterBySKUAdd[0]?.new_inventory
                dateOfPurchase = getDateOnly(filterBySKUAdd[0]?.createdAt)
            } else {
                tempRow.push(0)    // Opening Balance
                tempRow.push(0) // // New Purchase
            }
            // console.log("filterBySKUUpdate[0]", filterBySKUUpdate[0])

            // tempRow.push("")    // Opening Balance
            // tempRow.push("")    // New Purchase
            tempRow.push(dateOfPurchase || "")    // Date of Purchase
            tempRow.push("")    // Price / Yar 
            tempRow.push(parseFloat(totalFabricBefore) || 0);   // Total Fabric In Hand


            // console.log("filterBySKU", filterBySKU);

            let fabricUsed = 0;

            getDateRange.forEach(date => {
                const filterItemsByCurrentData = []

                filterBySKU.forEach(currentSKU => {
                    if (getDateOnly(currentSKU?.createdAt) === date) {
                        filterItemsByCurrentData.push(currentSKU)
                    }
                })

                if (filterItemsByCurrentData?.length) {
                    const totalRemovedInventory = filterItemsByCurrentData.reduce((total, transaction) => {
                        return total + parseFloat(transaction.inventory);
                    }, 0);

                    tempRow.push(totalRemovedInventory || 0);
                    fabricUsed += totalRemovedInventory
                } else {
                    tempRow.push(0)
                }
            })
            tempRow.push(parseFloat(fabricUsed) || 0); // Fabric used
            tempRow.push(parseFloat(totalFabricBefore) - parseFloat(fabricUsed) || 0); // Total Fabric remaining

            // push currrent row into main array
            finalArray.push(tempRow);
        })

        let sums = Array(finalArray[0].length).fill(0).map((value, index) => {
            if (index === 0) {
                return "Total"
            } else if (index === 1 || index === 4) {
                return "";
            }
            return value;
        }); // Initialize an array to store the sums, filled with zeros


        // Calculate the sums for each column, skipping Description, SKU, and Date of Purchase
        for (let i = 1; i < finalArray.length; i++) {
            for (let j = 2; j < finalArray[i].length; j++) {
                if (j !== 0 && j !== 1 && j !== 4 && !isNaN(finalArray[i][j])) {
                    sums[j] += parseFloat(finalArray[i][j]);
                }
            }
        }

        // Add the sums as a new row at the end of the array
        finalArray.push([...sums]);
        
        return json({ data: { finalArray }, status: 'success', message: "Export sheet successfully." }, { status: STATUS_CODES.OK })
    } catch (error) {
        return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
}