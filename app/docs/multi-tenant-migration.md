# Multi-tenant migration plan

Summary: migrate from single-user to organization-based multi-tenant system with minimal downtime.

1) Schema changes (already applied in schema.prisma)
   - Add `Organization` and `Membership` models
   - Add `OrganizationPerilImpact` and `OrganizationPerilLikelihood`
   - Add optional `organizationId` on `Report` and `ThoughtLeadership` for scoping

2) Create migration
   - Run `npx prisma migrate dev --name add-multi-tenant` to generate migration SQL

3) Backfill strategy
   - For existing single-tenant data, create a default Organization to represent the "global" or existing owner:

     - Create an Organization row with `id = "org:legacy"` or a real Clerk org id if known.
     - For each existing User (or owner), create a Membership to that org.

   - Reports & ThoughtLeadership:
     - Update existing `Report` and `ThoughtLeadership` rows to set `organizationId = 'org:legacy'`

4) Application changes
   - Implement lazy sync on requests: upsert user/org/membership from Clerk data.
   - Enforce org scoping in all queries (use `organizationId` filters).
   - Use provided query helpers to resolve per-org overrides.

5) Tests & Validation
   - Run integration tests, sample requests for users in multiple orgs.
   - Verify overrides do not affect other orgs.

6) Optional: Webhook-based sync
   - Add Clerk webhooks to upsert users/orgs/memberships on create/update/delete.

Notes
   - We intentionally avoid duplicating `Peril` rows per organization; overrides are stored in overlay tables.
   - Rollback: revert migration using Prisma if needed; keep backups of DB before applying.
