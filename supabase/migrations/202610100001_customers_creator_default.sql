-- The customers_guard trigger already forces created_by_employee_id = auth.uid() on insert.
-- Declaring the same value as the column default states that in the schema, so generated types
-- mark the column optional on insert instead of asking clients for a value the trigger overwrites.
alter table public.customers alter column created_by_employee_id set default auth.uid();
