-- User-confirmed reset. Deploy the epoch-2 Edge Function before applying.
DO $$
BEGIN
  PERFORM pg_advisory_xact_lock(1464619859, 1);
  IF NOT EXISTS (SELECT 1 FROM wonderland_private.security_migrations WHERE id='player-reset-v2') THEN
    TRUNCATE TABLE
      wonderland_private.nostr_sessions,
      wonderland_private.nostr_challenges,
      wonderland_private.nostr_accounts,
      wonderland_private.verified_runs,
      wonderland_private.verified_players,
      wonderland_private.verified_registrations,
      wonderland_private.verified_scores,
      wonderland_private.verified_months,
      wonderland_private.tickets,
      wonderland_private.scores,
      wonderland_private.score_months;
    UPDATE wonderland_private.migration_state SET counts='{}'::jsonb WHERE id=1;
    INSERT INTO wonderland_private.security_migrations(id) VALUES ('player-reset-v2');
  END IF;
END
$$;
