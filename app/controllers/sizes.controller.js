import prisma from "../db.server";

export async function getSizes() {
  try {
      const resp  = await prisma.metersPerSize.findMany()
      return resp;
  } catch (error) {
      console.error('ERROR: getSizes() :: Controller => sizes.controller ::: Catch ::: ', error)
  }
}

export async function getSize({ sizeId }) {
  try {
      const resp  = await prisma.metersPerSize.findUnique({
          where: {
              id: sizeId
          }
      })
      return resp;
  } catch (error) {
      console.error('ERROR: getSize() :: Controller => sizes.controller ::: Catch ::: ', error)
  }
}

export async function createSize({ size, meters }) {
  try {
      const resp  = await prisma.metersPerSize.create({
          data: {
              size_title: size,
              cloth_meters: parseInt(meters)
          }
      })
      return resp;
  } catch (error) {
      console.error('ERROR: createSize() :: Controller => sizes.controller ::: Catch ::: ', error)
  }
}


export async function updateSize({ sizeId, size , meters }) {
  try {
      const resp  = await prisma.metersPerSize.update({
          where: {
              id: sizeId
          },
          data: {
            size_title: size,
            cloth_meters: parseInt(meters)
          }
      })
      return resp;
  } catch (error) {
      console.error('ERROR: updateSize() :: Controller => sizes.controller ::: Catch ::: ', error)
  }
}


export async function deleteSize({ id }) {
  try {
      const resp  = await prisma.metersPerSize.delete({
          where: {
              id: id
          }
      })
      return resp;
  } catch (error) {
      console.error('ERROR: deleteSize() :: Controller => sizes.controller ::: Catch ::: ', error)
  }
}