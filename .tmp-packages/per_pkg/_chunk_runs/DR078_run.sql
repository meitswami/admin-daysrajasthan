DO $do$
DECLARE q text;
BEGIN
  SELECT convert_from(decode(string_agg(chunk_b64, '' ORDER BY chunk_ord), 'base64'), 'UTF8') INTO q
  FROM _sql_import_chunks WHERE batch_key = 'pkg_DR078' AND stmt_idx = 1;
  IF q IS NULL OR length(q) < 10 THEN RAISE EXCEPTION 'empty sql for %', 'pkg_DR078'; END IF;
  EXECUTE q;
  DELETE FROM _sql_import_chunks WHERE batch_key = 'pkg_DR078';
END $do$;