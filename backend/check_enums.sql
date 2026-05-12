SELECT typname, enumlabel FROM pg_type JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid WHERE typname IN ('TabPaymentMethod', 'TabPaymentStatus') ORDER BY typname, enumsortorder;
