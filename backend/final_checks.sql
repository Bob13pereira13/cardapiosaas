-- CHECK 1: No PaymentStatus enum in DB
SELECT 'CHECK1_PaymentStatus_enum' as check_name,
  CASE WHEN COUNT(*) = 0 THEN 'PASS - enum removed' ELSE 'FAIL - enum still exists' END as result
FROM pg_type WHERE typname = 'PaymentStatus';

-- CHECK 2: Order table has no inline payment columns
SELECT 'CHECK2_Order_no_paymentMethod' as check_name,
  CASE WHEN COUNT(*) = 0 THEN 'PASS - column removed' ELSE 'FAIL - column exists' END as result
FROM information_schema.columns 
WHERE table_name = 'Order' AND column_name IN ('paymentMethod','paymentStatus','pixQrCode','pixCopyPaste','paidAt','externalPaymentId');

-- CHECK 3: No Comanda/ComandaItem tables
SELECT 'CHECK3_no_Comanda_tables' as check_name,
  CASE WHEN COUNT(*) = 0 THEN 'PASS - tables removed' ELSE 'FAIL - tables exist' END as result
FROM information_schema.tables 
WHERE table_name IN ('Comanda', 'ComandaItem');

-- CHECK 4: Payment table exists with correct structure
SELECT 'CHECK4_Payment_table' as check_name,
  CASE WHEN COUNT(*) >= 10 THEN 'PASS - ' || COUNT(*) || ' cols' ELSE 'FAIL - only ' || COUNT(*) || ' cols' END as result
FROM information_schema.columns WHERE table_name = 'Payment';
