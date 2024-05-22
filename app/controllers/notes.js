import prisma from "../db.server";

export async function prismaCreateNote({ orderID, lineItemID, note, shop }) {
    return await prisma.notes.create({
        data:  {
            order_id: orderID,
            line_item_id: lineItemID,
            note: note,
            shop: shop
        }
    });
}

export async function prismaUpdateNote({ note, noteID }) {
    return await prisma.notes.update({
        where: {
            id: noteID
        },
        data: {
            note: note
        }
    });
}

export async function prismaGetNote({ lineItemID, shop }) {
    return await prisma.notes.findMany({
        where: {
            line_item_id: lineItemID  ,
            shop: shop
        }
    });
}

export async function prismaDeleteNote({ noteID }) {
    return await prisma.notes.delete({ 
        where: {
            id: noteID
        }
    })
}
