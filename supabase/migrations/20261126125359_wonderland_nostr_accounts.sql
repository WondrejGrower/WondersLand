CREATE TABLE wonderland_private.nostr_accounts (
  npub text PRIMARY KEY CHECK (npub ~ '^npub1[023456789acdefghjklmnpqrstuvwxyz]{58}$'),
  ranked_owner text UNIQUE NOT NULL CHECK (ranked_owner ~ '^[a-f0-9]{64}$'),
  progress text CHECK (octet_length(progress) <= 2097152),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0)
);
CREATE TABLE wonderland_private.nostr_challenges (
  digest text PRIMARY KEY CHECK (digest ~ '^[a-f0-9]{64}$'),
  browser_digest text NOT NULL CHECK (browser_digest ~ '^[a-f0-9]{64}$'),
  expires bigint NOT NULL
);
CREATE INDEX nostr_challenges_expiry ON wonderland_private.nostr_challenges(expires);
CREATE TABLE wonderland_private.nostr_sessions (
  digest text PRIMARY KEY CHECK (digest ~ '^[a-f0-9]{64}$'),
  npub text NOT NULL REFERENCES wonderland_private.nostr_accounts(npub) ON DELETE CASCADE,
  expires bigint NOT NULL
);
CREATE INDEX nostr_sessions_account ON wonderland_private.nostr_sessions(npub);
CREATE INDEX nostr_sessions_expiry ON wonderland_private.nostr_sessions(expires);

ALTER TABLE wonderland_private.nostr_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wonderland_private.nostr_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE wonderland_private.nostr_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY server_only ON wonderland_private.nostr_accounts TO wonderland_server USING (true) WITH CHECK (true);
CREATE POLICY server_only ON wonderland_private.nostr_challenges TO wonderland_server USING (true) WITH CHECK (true);
CREATE POLICY server_only ON wonderland_private.nostr_sessions TO wonderland_server USING (true) WITH CHECK (true);
REVOKE ALL ON wonderland_private.nostr_accounts,wonderland_private.nostr_challenges,wonderland_private.nostr_sessions FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON wonderland_private.nostr_accounts,wonderland_private.nostr_challenges,wonderland_private.nostr_sessions TO wonderland_server;
