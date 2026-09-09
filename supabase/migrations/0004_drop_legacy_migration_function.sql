-- The one-time legacy data migration (admin-only, email-prefix gated) is no
-- longer needed now that legacy rows have been manually reassigned and the
-- app-level admin migration feature has been removed.

DROP FUNCTION IF EXISTS public.migrate_legacy_data_to_user(UUID);
