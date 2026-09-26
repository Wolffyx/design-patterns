// Golden fixture: every line flagged here is intentional.
export class Config {
  private static instance: Config;
  private constructor() {}
  static getInstance(): Config { return Config.instance; }
}

export class EventHub {
  on(e: string) {}
  emit(e: string) {}
  subscribe(e: string) {}
}

export class Editor {
  execute() {}
  undo() {}
}

export abstract class Report {
  abstract header(): string;
  abstract body(): string;
  render(): string { return this.header() + this.body(); }
}

export class Order {
  constructor(id: string, customer: string, total: number, currency: string, notes: string) {}
}

export function area(s: any): number {
  switch (s.kind) {
    case 'circle': return 1;
    case 'square': return 2;
    case 'triangle': return 3;
    case 'hexagon': return 4;
  }
  return 0;
}

export function describe(x: unknown): string {
  if (x instanceof Date) {
    return 'date';
  } else if (x instanceof Map) {
    return 'map';
  } else if (x instanceof Set) {
    return 'set';
  }
  return '?';
}

export function ship(order: any) {
  if (order) {
    if (order.paid) {
      for (const item of order.items) {
        log(item);
      }
    }
  }
  if (!order) {
    return null;
  } else {
    return order;
  }
}

export function fee(order: any): number {
  if (order.status === 'new') {
    return 1;
  } else if (order.status === 'paid') {
    return 2;
  } else if (order.status === 'shipped') {
    return 3;
  }
  return 0;
}

export function render(items: string[], compact: boolean): string { return ''; }

export function build(a: number, b: number, c: number, d: number, e: number) { return a; }

export async function loadAll(orders: any[], ids: string[]) {
  for (const order of orders) {
    const customer = await db.customer.findUnique({ where: { id: order.customerId } });
    const settings = await this.settingsRepo.getSettings();
    await repo.save(order);
  }
  for (const id of ids) {
    await notify(id);
  }
  fetch('/x').catch(() => {});
  try { risky(); } catch (e) {}
}

export function canCancel(order: any) {
  if (order.status === 'new') return true;
  return false;
}

export function canRefund(order: any) {
  if (order.status === 'paid') return true;
  return false;
}

declare function log(x: unknown): void;
declare function notify(x: unknown): Promise<void>;
declare function risky(): void;
declare const db: any;
declare const repo: any;
