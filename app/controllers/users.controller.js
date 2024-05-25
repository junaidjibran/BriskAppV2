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

export async function loggedInCheck({ sessionToken }) {
    try {
        const resp  = await prisma.users.findMany({
            where: {
                session_token: sessionToken?.sid
            },
            
            // select: {
            //     id: true,
            //     session_token: true,
            //     access: true,
            // }
        })

        // console.log("resp :: loggedInCheck() :: users.controller.js", resp?.find(user => user?.session_token === sessionToken))

        if (!resp?.length) {
            return false
        }

        console.log(resp?.find(user => user?.session_token === sessionToken?.sid))

        return resp?.find(user => user?.session_token === sessionToken?.sid) ?? false;
    } catch (error) {
        console.error('ERROR: loggedInCheck() :: Controller => users.controller ::: Catch ::: ', error)
    }
}

export async function userLogout({ sessionToken }) {
    try {
        const findResp  = await prisma.users.findMany({
            where: {
                session_token: sessionToken?.sid
            },
        })

        if (!findResp?.length) {
            return false
        }

        const targetUser = findResp?.find(user => user?.session_token === sessionToken?.sid)
        const resp  = await prisma.users.update({
            where: {
                id: targetUser?.id
            },
            data: {
                session_token: ""
            }
        })

        if (!resp) {
            return false
        }

        return resp;
    } catch (error) {
        console.error('ERROR: userLogout() :: Controller => users.controller ::: Catch ::: ', error)
    }
}