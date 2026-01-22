import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function checkInvoices() {
    console.log('Checking invoices...\n');

    const totalInvoices = await prisma.invoice.count();
    console.log(`Total invoices: ${totalInvoices}`);

    const paidInvoices = await prisma.invoice.count({
        where: {
            amountPaid: {
                gt: 0
            }
        }
    });
    console.log(`Invoices with amountPaid > 0: ${paidInvoices}`);

    const allInvoices = await prisma.invoice.findMany({
        take: 5,
        orderBy: {
            createdAt: 'desc'
        }
    });

    console.log('\nSample invoices:');
    console.log(JSON.stringify(allInvoices, null, 2));

    await prisma.$disconnect();
}

checkInvoices().catch(console.error);
