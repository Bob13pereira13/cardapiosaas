SELECT 'Tab' as entity, id::text, status::text, '' as other FROM "Tab" WHERE id = 31
UNION ALL
SELECT 'Order', id::text, "orderStatus"::text, '' FROM "Order" WHERE "tabId" = 31
UNION ALL
SELECT 'Payment', id::text, status::text, valor::text FROM "Payment" WHERE "tabId" = 31
ORDER BY entity, id;
