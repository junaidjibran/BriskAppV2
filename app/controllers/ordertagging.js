import prisma from "~/db.server";

export async function createOrderTagLog({ order_id, order_number, message }) {
    return await prisma.order_tag_logs.create({
        data: {
          // @ts-ignore
          order_id: order_id,
          order_number: order_number,
          message: message
        }
    });
  }