# Local development

The local stack uses a disposable SQL Server container and Azurite. It never needs production SQL, Key Vault, Graph, or SharePoint credentials. Email is written to the Functions console only.

## Prerequisites

- Node 20 (`.nvmrc`)
- Docker Desktop
- npm

The supplied commands download Azure Functions Core Tools and the Static Web Apps CLI on first use; a global installation is not required.

## First-time setup

1. Install API dependencies:

   ```bash
   npm --prefix api ci
   ```

2. Create local settings:

   ```bash
   cp api/local.settings.example.json api/local.settings.json
   ```

   Change the example SQL password and keep the same value in `compose.yaml` and `api/local.settings.json`.

3. Validate the settings and start local infrastructure:

   ```bash
   npm run dev:check
   docker compose up -d
   ```

4. Wait until SQL Server is ready, then create the schema:

   ```bash
   npm run db:init
   ```

## Run the portal

Use two terminals:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

Open `http://localhost:4280`. The API runs on port `7071`.

OTP emails are not sent. The code is printed only in the local Functions terminal, prefixed with `[local-mail]`.

## Reset local data

`npm run db:reset` clears registrations, participations, invitations, deliveries, and queues while retaining configuration records. It loads `api/local.settings.json`; it does not connect to Azure when `SQL_CONNECTION_STRING` is present.

## Limitations

- File endpoints return `503` unless you deliberately configure a non-production SharePoint test site.
- Local email does not validate Graph permissions or deliverability.
- Use the test environment for Graph, SharePoint, Key Vault, scheduler, and deployment validation.
