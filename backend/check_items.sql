SELECT oi.id as item_id, oi."orderId", o."tabId", oi."productId", oi.quantity, oi."itemTotal" FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" WHERE o."tabId" = 31 ORDER BY oi.id;
