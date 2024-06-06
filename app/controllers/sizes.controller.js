import prisma from "../db.server";

export async function getSizes(params) {
    try {
        const { page, searchQuery, limit } = params
        let query = {
            orderBy: {
                created_at: 'desc',
            },
        };

        if (searchQuery && searchQuery?.length) {
            query['where'] = {
                size_title: {
                    contains: searchQuery
                }
            }
        }

        let pageInfo = {
            limit: limit ?? 10,
        }
        if (page) pageInfo['page'] = parseInt(page)

        const resp = await prisma.meters_per_size.paginate(query).withPages(pageInfo)

        return resp;
    } catch (error) {
        console.error('ERROR: getSizes() :: Controller => sizes.controller ::: Catch ::: ', error)
    }
}

export async function getSize({ sizeId }) {
    try {
        const resp = await prisma.meters_per_size.findUnique({
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
        const resp = await prisma.meters_per_size.create({
            data: {
                size_title: size,
                cloth_meters: meters
            }
        })
        return resp;
    } catch (error) {
        console.error('ERROR: createSize() :: Controller => sizes.controller ::: Catch ::: ', error)
    }
}


export async function updateSize({ sizeId, size, meters }) {
    try {
        const resp = await prisma.meters_per_size.update({
            where: {
                id: sizeId
            },
            data: {
                size_title: size,
                cloth_meters: meters
            }
        })
        return resp;
    } catch (error) {
        console.error('ERROR: updateSize() :: Controller => sizes.controller ::: Catch ::: ', error)
    }
}


export async function deleteSize({ id }) {
    try {
        const resp = await prisma.meters_per_size.delete({
            where: {
                id: id
            }
        })
        return resp;
    } catch (error) {
        console.error('ERROR: deleteSize() :: Controller => sizes.controller ::: Catch ::: ', error)
    }
}