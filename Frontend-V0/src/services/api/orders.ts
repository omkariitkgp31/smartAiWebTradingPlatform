import * as dummy from '../dummyData';

export async function getOrders(page: number = 1, limit: number = 50): Promise<any> {
  const allOrders = dummy.getOrders();
  const start = (page - 1) * limit;
  const paginated = allOrders.slice(start, start + limit);
  return { data: paginated, total: allOrders.length, page, limit };
}

export async function getOrderById(orderId: string): Promise<any> {
  return dummy.getOrderById(orderId);
}

export async function submitOrder(order: any): Promise<any> {
  const result = dummy.submitOrder(order);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('order:placed'));
  }
  return result;
}

export async function cancelOrder(orderId: string): Promise<any> {
  return dummy.cancelOrder(orderId);
}

export async function amendOrder(_orderId: string, _updates: any): Promise<any> {
  return { status: 'amended' };
}
