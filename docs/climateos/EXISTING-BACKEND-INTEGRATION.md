# Existing PostgreSQL and identity integration gate

Decision: reuse the user's existing managed PostgreSQL and identity provider.
This document is a deployment contract, not a configured integration.

## Information needed from the operator

- PostgreSQL provider and existing schema/migration location; PostGIS availability,
  hosting region, backup/restore ownership, pooled connection method and a
  non-production database for synthetic tests.
- Identity provider and protocol (for example OIDC); documented issuer/audience,
  public signing-key discovery, token lifetimes, logout/revocation behavior,
  supported web/Android redirect URLs and organization membership model.
- Existing secret variable names and who will configure them in Vercel; do not
  paste database passwords, service keys or client secrets into chat or Git.
- JOITA/Radhaa organizational boundaries, approved roles and processing purposes,
  contact-data permissions, withdrawal/retention policy and attachment storage.

## Security acceptance before enabling account-based records

1. Validate tokens server-side using the provider's supported SDK or standards
   library: issuer, audience, signature, expiry and revocation/session policy.
   Never trust a decoded but unverified JWT or browser-provided role.
2. Prefer secure HttpOnly, Secure, SameSite cookies for web sessions with CSRF
   protection; use provider-supported authorization-code/PKCE on Android. Do
   not store service credentials in localStorage or the app bundle.
3. Map identity subjects to internal users and active memberships. Scope every
   query/mutation/export to an authorized organization. No email-domain-based
   tenant assignment. JOITA and Radhaa are separate organizations.
4. Test database-enforced RLS with a non-owner/non-bypass application role,
   compound tenant foreign keys and transaction-local tenant identity. Connection
   pools must not carry one request's tenant context into another request.
5. Require active purpose/version consent before enrollment and sync. Withdrawal
   immediately blocks disallowed further processing; retention/legal deletion
   exceptions need an approved policy, not an invented promise.
6. Require idempotency keys and expected record revisions. Use 409 conflicts,
   explicit device/server states, retries with backoff and attachment checksums.
   Network availability is not proof of successful synchronization.
7. Private attachment buckets, checked MIME/size, authorized signed URLs and
   minimized logs. No public personal-data QR codes.
8. Demonstrate with synthetic users that tenant A cannot list, fetch, mutate,
   sync or export tenant B data, including guessed UUIDs and manipulated filters.
   Test expired tokens, removed membership, revoked consent and duplicate retry.

## Rollout and rollback

Add reviewed versioned SQL migrations to the existing migration system after
schema discovery; do not run speculative DDL against production. Provision a
staging identity client and private object storage. Deploy additive authenticated
routes beside existing public advisory APIs. Enable a small consented pilot
only after auth, RLS, sync and restore tests pass. Keep existing device stores
and exports until reconciliation succeeds. Feature-disable new cloud access on
failure without disabling public advisory or deleting offline records.

Cloud authentication, RLS, consent withdrawal and synchronization tests cannot
be claimed passed until this provider-backed environment is available.

## Technical references

- PostgreSQL row security and role-bypass behavior:
  https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- OpenID Connect Core, provider/token validation requirements:
  https://openid.net/specs/openid-connect-core-1_0.html
- IndexedDB transactions and their durability limits:
  https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction
