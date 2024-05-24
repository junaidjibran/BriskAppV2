import prisma from "../db.server";

export async function getUsers() {
    try {
        const resp  = await prisma.users.findMany()
        return resp;
    } catch (error) {
        console.error('ERROR: getUsers() :: Controller => users.controller ::: Catch ::: ', error)
    }
}

export async function getUser({ userID }) {
    try {
        const resp  = await prisma.users.findUnique({
            where: {
                id: userID
            }
        })
        return resp;
    } catch (error) {
        console.error('ERROR: getUser() :: Controller => users.controller ::: Catch ::: ', error)
    }
}

export async function updateUser({ userID, userScopes, isAdmin }) {
    try {
        const resp  = await prisma.users.update({
            where: {
                id: userID
            },
            data: {
                access: userScopes,
                is_admin: isAdmin
            }
        })
        return resp;
    } catch (error) {
        console.error('ERROR: updateUser() :: Controller => users.controller ::: Catch ::: ', error)
    }
}