---
name: orders-with-customers
tags: [n-plus-one]
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Here is `orders.ts` (Prisma; `Order` has a `customerId` and a `customer`
relation to `Customer { id, name, email }`):

```typescript
import { prisma } from './db';

export async function recentOrders(limit: number) {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return orders.map(o => ({ id: o.id, total: o.total, customerId: o.customerId }));
}
```

The dashboard now needs each order's customer name and email in the result.
Update `recentOrders` and reply with the complete updated file.
