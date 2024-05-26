import prisma from "../db.server";

export async function getInventories() {
  try {
      const resp  = await prisma.inventory.findMany()
      return resp;
  } catch (error) {
      console.error('ERROR: getInventories() :: Controller => inventory.controller ::: Catch ::: ', error)
  }
}

export async function getInventory({ inventoryId }) {
  try {
      const resp  = await prisma.inventory.findUnique({
          where: {
              id: inventoryId
          }
      })
      return resp;
  } catch (error) {
      console.error('ERROR: getInventory() :: Controller => inventory.controller ::: Catch ::: ', error)
  }
}

export async function createInventory({ sku, inventory }) {
  try {
      const resp  = await prisma.inventory.create({
          data: {
            sku: sku,
            inventory: parseInt(inventory)
          }
      })
      return resp;
  } catch (error) {
      console.error('ERROR: createInventory() :: Controller => inventory.controller ::: Catch ::: ', error)
  }
}


export async function updateInventory({ inventoryId, sku , inventory }) {
  try {
      const resp  = await prisma.inventory.update({
          where: {
              id: inventoryId
          },
          data: {
            sku: sku,
            inventory: parseInt(inventory)
          }
      })
      return resp;
  } catch (error) {
      console.error('ERROR: updateInventory() :: Controller => inventory.controller ::: Catch ::: ', error)
  }
}


export async function deleteInventory({ id }) {
  try {
      const resp  = await prisma.inventory.delete({
          where: {
              id: id
          }
      })
      return resp;
  } catch (error) {
      console.error('ERROR: deleteInventory() :: Controller => inventory.controller ::: Catch ::: ', error)
  }
}