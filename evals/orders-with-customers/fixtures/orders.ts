import { prisma } from './db';

export async function recentOrders(limit: number) {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return orders.map(o => ({ id: o.id, total: o.total, customerId: o.customerId }));
}
