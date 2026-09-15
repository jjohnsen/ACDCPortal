# Azure deployment

This repository has two supported environments:

| Environment | Branch | Data and integrations |
| --- | --- | --- |
| Production | `main` | Production-only Azure resources |
| Test | `test` | Isolated test Azure resources and synthetic data |

Local development is documented in [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md). Test environment provisioning and validation are documented in [docs/TEST_ENVIRONMENT.md](docs/TEST_ENVIRONMENT.md).

## Deployment prerequisites

- Azure Static Web App per environment
- Azure SQL database per environment
- Key Vault per environment
- Separate Entra application credentials, sender mailbox, and SharePoint site/library for test and production
- GitHub Actions deployment token stored as an environment-specific GitHub secret

## Application configuration

The API supports two database modes:

- `SQL_CONNECTION_STRING`: local SQL Server only.
- `SQL_SERVER` and `SQL_DATABASE`: Azure SQL using `DefaultAzureCredential`.

Never put a connection string or another secret in the repository, frontend files, or GitHub workflow. Configure secrets in the environment Key Vault/app settings.

## Required release checks

Before a production deployment:

1. Run `npm test`.
2. Run `npm --prefix api ci` and `npm audit --omit=dev`.
3. Deploy and smoke-test the same commit in the test environment.
4. Confirm the test environment uses only test resources.

The GitHub Actions workflow should run steps 1–2 before its Static Web Apps deployment action, and `main` should require those checks.
