import { PrismaClient } from "@prisma/client";

// const prisma = global.prisma || new PrismaClient();
const prisma = new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
}

export default prisma;

// import { PrismaClient } from "@prisma/client";

// let prisma;

// if (process.env.NODE_ENV === "production") {
//   prisma = new PrismaClient();
//   prisma.$connect().catch((error) => {
//     console.error("Failed to connect to the database in production:", error);
//     process.exit(1); // Exit the process with a failure code
//   });
// } else {
//   if (!global.prisma) {
//     global.prisma = new PrismaClient();
//     global.prisma.$connect().catch((error) => {
//       console.error("Failed to connect to the database in development:", error);
//     });
//   }
//   prisma = global.prisma;
// }

// export default prisma;
