# Test environment

Create a fully isolated Azure environment before testing integrations or opening the portal to other people. Do not reuse the production database, Key Vault, app registrations, mail sender, SharePoint library, or JWT secret.

## Target topology

| Resource | Test value | Purpose |
| --- | --- | --- |
| Resource group | `rg-acdc-portal-test` | Single lifecycle boundary |
| Static Web App | `acdc-portal-test` | Portal and managed Functions |
| Azure SQL database | `acdc-portal-test-db` | Test-only data |
| Key Vault | `acdc-portal-test-kv` | Test secrets |
| Entra app registration | `ACDC Portal Test` | Graph mail and SharePoint access |
| SharePoint site/library | Test site, e.g. `/sites/ACDCPortalTest` | Test uploads only |
| Sender mailbox | Dedicated test mailbox | Prevents mail reaching participants |

## Required settings

Configure these as test application settings or load them from the test Key Vault:

`ACDC_ENV=test`, `SQL_SERVER`, `SQL_DATABASE`, `KEY_VAULT_URL`, `JWT_SECRET`, `RECAPTCHA_SECRET_KEY`, `MAIL_CLIENT_ID`, `MAIL_CLIENT_SECRET`, `MAIL_TENANT_ID`, `MAIL_SENDER`, `SHAREPOINT_SITE_URL`, `SHAREPOINT_DOC_LIBRARY`, `PORTAL_URL`, and `SCHEDULER_SECRET`.

The test SQL database must be reachable using the identity that runs the Functions API. Apply the schema with `SQL_SERVER` and `SQL_DATABASE` set to the test values, then run `npm run db:init` from an authenticated Azure developer session.

## Deployment flow

1. Create the test resources and configure the settings above.
2. Deploy a dedicated `test` branch to the test Static Web App. Keep `main` mapped only to production.
3. Run schema creation against the empty test database.
4. Create a test portal admin directly in the test database or through a controlled bootstrap script.
5. Smoke-test registration, OTP delivery, invitation acceptance, team management, scheduler authorization, file upload, and role removal.
6. Only promote a tested commit to `main` after the automated checks and test-environment smoke test pass.

## Guardrails

- Use a separate Key Vault and separate Entra client secret.
- Restrict Graph permissions to the test sender and test SharePoint site where possible.
- Set a low-cost SQL SKU and a budget alert on the test resource group.
- Do not copy production participant data. Use synthetic data only.
- Rotate the test secrets after initial setup because they are used across developer machines and CI.
