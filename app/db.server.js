import { PrismaClient } from "@prisma/client";
import { paginate } from "prisma-extension-pagination";

const prismaExtentClient = new PrismaClient().$extends({
	model: {
		inventory: {
			paginate,
		},
		meters_per_size: {
			paginate
		},
		vectors: {
			paginate
		},
		shop_shirt: {
			paginate
		},
		shopify_orders: {
			paginate
		}
	},
});

const prisma = global.prisma || prismaExtentClient

if (process.env.NODE_ENV !== "production") {
	if (!global.prisma) {
		global.prisma = prismaExtentClient
	}
}

export default prisma;