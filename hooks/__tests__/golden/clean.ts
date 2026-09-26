// Golden fixture: well-shaped code — must produce no findings.
type Shape = { kind: 'circle'; r: number } | { kind: 'square'; s: number };

const assertNever = (x: never): never => { throw new Error(String(x)); };

export function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return 3.14 * s.r * s.r;
    case 'square': return s.s * s.s;
    default: return assertNever(s);
  }
}

const FEES: Record<string, number> = { new: 1, paid: 2, shipped: 3 };

export function fee(status: string): number {
  return FEES[status] ?? 0;
}

export function ship(order: { paid: boolean; items: string[] } | null) {
  if (!order?.paid) return null;
  for (const item of order.items) {
    if (!item) continue;
    console.log(item);
  }
  return order;
}

export async function loadAll(orders: { customerId: string }[], db: any) {
  const ids = orders.map(o => o.customerId);
  const customers = await db.customer.findMany({ where: { id: { in: ids } } });
  const byId = new Map(customers.map((c: { id: string }) => [c.id, c]));
  return orders.map(o => ({ ...o, customer: byId.get(o.customerId) }));
}

export async function paginate(api: any) {
  let cursor: string | null = '';
  while (cursor !== null) {
    const page = await api.list(cursor);
    cursor = page.next;
  }
}

export function setVisible(visible: boolean) { return visible; }

export function risky() {
  try {
    JSON.parse('{}');
  } catch {
    // malformed input is expected here; the caller falls back to defaults
  }
}
