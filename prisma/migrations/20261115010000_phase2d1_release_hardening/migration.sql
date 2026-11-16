-- Phase 2D.1: reports aggregate one authoritative currency until a conversion policy exists.
CREATE FUNCTION enforce_journal_base_currency() RETURNS trigger AS $$
DECLARE
  base_currency VARCHAR(3);
BEGIN
  IF TG_OP = 'INSERT' AND NEW."status" = 'POSTED' THEN
    RAISE EXCEPTION 'Direct insertion of posted journal entries is forbidden';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW."status" = 'POSTED' AND OLD."status" <> 'POSTED' THEN
    SELECT "baseCurrency" INTO base_currency
      FROM "CompanyAccountingSettings"
      WHERE "organizationId" = NEW."organizationId";
    IF base_currency IS NULL OR NEW."currency" <> base_currency THEN
      RAISE EXCEPTION 'Journal currency must match company base currency';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "JournalEntry_base_currency_guard"
  BEFORE INSERT OR UPDATE OF "status" ON "JournalEntry"
  FOR EACH ROW EXECUTE FUNCTION enforce_journal_base_currency();
