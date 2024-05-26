import prisma from "../db.server";

export async function getUsers() {
    try {
        const resp  = await prisma.users.findMany()
        return resp;
    } catch (error) {
        console.error('ERROR: getUsers() :: Controller => users.controller ::: Catch ::: ', error)
    }
}

export async function getUser(params) {
    try {
        const { userID, email } = params;
        const where = {};
        
        if (userID !== undefined) where.id = userID;
        if (email !== undefined) where.email = email;
        const resp  = await prisma.users.findUnique({
            where
        })
        return resp;
    } catch (error) {
        console.error('ERROR: getUser() :: Controller => users.controller ::: Catch ::: ', error)
    }
}

export async function updateUser(params) {
    try {
        const { userID, userScopes, isAdmin, ...otherFields } = params;
        const data = {};
        
        if (userScopes !== undefined) data.access = userScopes;
        if (isAdmin !== undefined) data.is_admin = isAdmin;
        
        // Add any other fields dynamically
        Object.assign(data, otherFields);
        const resp  = await prisma.users.update({
            where: {
                id: userID
            },
            data
        })
        return resp;
    } catch (error) {
        console.error('ERROR: updateUser() :: Controller => users.controller ::: Catch ::: ', error)
    }
}

export async function createUser(params) {
    try {
        const { email, password, username, ...otherFields } = params;
        const data = {};
        
        if (email !== undefined) data.email = email;
        if (password !== undefined) data.password = password;
        if (username !== undefined) data.username = username;
        
        // Add any other fields dynamically
        Object.assign(data, otherFields);
        const resp  = await prisma.users.create({
            data
        })
        return resp;
    } catch (error) {
        console.error('ERROR: createUser() :: Controller => users.controller ::: Catch ::: ', error)
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

        return true

        // console.log("resp :: loggedInCheck() :: users.controller.js", resp?.find(user => user?.session_token === sessionToken))

        if (!resp?.length) {
            return false
        }

        // console.log(resp?.find(user => user?.session_token === sessionToken?.sid))

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