import type { Order } from './order-types';

export function printOrder(order: Order) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<html><body style="font-family:monospace;font-size:12px">
    <h3>Pedido #${order.orderNumber}</h3>
    <p>${order.customerName} - ${order.deliveryType}</p>
    ${order.items.map((i) => `<div>${i.quantity}x ${i.productNameSnapshot} R$ ${i.itemTotal.toFixed(2)}</div>`).join('')}
    <hr/><strong>Total: R$ ${order.total.toFixed(2)}</strong>
  </body></html>`);
  win.print();
  win.close();
}
