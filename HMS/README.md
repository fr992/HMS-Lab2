# HMS — Hospital Management System

A full-stack Hospital Management System built with **.NET 8** (Clean Architecture + Modular Monolith) and **React 19.2**.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Environment Setup](#environment-setup)
5. [Database Setup](#database-setup)
6. [Backend Setup](#backend-setup)
7. [Frontend Setup](#frontend-setup)
8. [Running the Project](#running-the-project)
9. [Default Credentials](#default-credentials)
10. [Migrations](#migrations)
11. [Testing](#testing)
12. [Stripe Configuration](#stripe-configuration)
13. [Useful Commands](#useful-commands)

---

## Prerequisites

Make sure the following are installed before proceeding:

| Tool | Version | Download |
|------|---------|----------|
| .NET SDK | 8.x | https://dotnet.microsoft.com/download |
| Node.js | 18+ | https://nodejs.org |
| SQL Server | 2019+ / LocalDB | https://www.microsoft.com/en-us/sql-server/sql-server-downloads |
| MongoDB | Latest | https://www.mongodb.com/try/download/community |
| EF Core CLI | Latest | `dotnet tool install --global dotnet-ef` |

Verify your installations:

```bash
dotnet --version
node --version
npm --version
mongod --version
dotnet ef --version
```

---

## Tech Stack

### Backend
- **Runtime:** .NET 8
- **Architecture:** Clean Architecture + Modular Monolith
- **ORM:** Entity Framework Core
- **Primary Database:** Microsoft SQL Server (MSSQL)
- **Secondary Database:** MongoDB (default port `27017`)
- **Payments:** Stripe
- **Testing:** xUnit + Moq

### Frontend
- **Framework:** React 19.2 (stable)
- **Structure:** Feature-based modular layout
- **Package Manager:** npm

---

## Project Structure

```
HMS/
├── backend/
│   ├── HMS.Api              # Entry point, controllers, middleware
│   ├── HMS.Application      # Use cases, DTOs, interfaces, validators
│   ├── HMS.Domain           # Entities, domain events, enums
│   ├── HMS.Infrastructure   # External services, Stripe, MongoDB, email
│   ├── HMS.Persistence      # EF Core DbContext, migrations, repositories
│   └── HMS.Tests            # Unit and integration tests
├── frontend/
│   ├── src/
│   │   ├── features/        # Feature-based modules (appointments, patients, etc.)
│   │   ├── shared/          # Shared components, hooks, utilities
│   │   └── app/             # App entry, routing, global config
│   └── package.json
├── apidocumentation.md
└── README.md
```

---

## Environment Setup

### Backend — `appsettings.json`

Located at `backend/HMS.Api/appsettings.json`. Configure the following:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_HOST;Database=HMS;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "MongoDbSettings": {
    "ConnectionString": "mongodb://localhost:27017",
    "DatabaseName": "HMS"
  },
  "JwtSettings": {
    "SecretKey": "your-secret-key-here",
    "Issuer": "HMS",
    "Audience": "HMS",
    "ExpiryMinutes": 60
  },
  "StripeSettings": {
    "SecretKey": "sk_test_...",
    "PublishableKey": "pk_test_...",
    "WebhookSecret": "whsec_..."
  }
}
```

> For production, use `appsettings.Development.json` or environment variables. Never commit secrets to source control.

### Frontend — `.env`

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_BASE_URL=https://localhost:7297
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Database Setup

### MSSQL

Ensure SQL Server is running. Update the `DefaultConnection` string in `appsettings.json` to match your server instance, then apply migrations (see [Migrations](#migrations)).

### MongoDB

MongoDB runs on the default port `27017`. Ensure the MongoDB service is running before starting the backend:

```bash
# Windows (if installed as a service)
net start MongoDB

# macOS/Linux
sudo systemctl start mongod

# Verify it's running
mongosh --eval "db.runCommand({ connectionStatus: 1 })"
```

No manual schema setup is required — collections are created automatically by the application on first run.

---

## Backend Setup

Navigate to the backend directory:

```bash
cd HMS/backend
```

### Restore NuGet Packages

```bash
dotnet restore
```

### Build the Solution

```bash
dotnet build HMS.Api
```

Build in Release mode:

```bash
dotnet build HMS.Api --configuration Release
```

### Apply Database Migrations

```bash
dotnet ef database update --project HMS.Persistence --startup-project HMS.Api
```

### Run the API

```bash
dotnet run --project HMS.Api
```

The API will be available at:
- **HTTPS:** `https://localhost:7297`
- **HTTP:** `http://localhost:5000`
- **Swagger UI:** `https://localhost:7297/swagger`

---

## Frontend Setup

Navigate to the frontend directory:

```bash
cd HMS/hms-frontend
```

### Install Dependencies

```bash
npm install
```

### Start the Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` by default.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

---

## Running the Project

To run the full stack locally, open two terminals:

**Terminal 1 — Backend:**
```bash
cd HMS/backend
dotnet run --project HMS.Api
```

**Terminal 2 — Frontend:**
```bash
cd HMS/hms-frontend
npm run dev
```

---

## Default Credentials

A **SuperAdmin** user is seeded automatically on first run.

| Field | Value |
|-------|-------|
| Username | `admin` |
| Email | `admin@hms.local` |
| Password | `ChangeMe123!` |
| Role | `SuperAdmin` and `Admin` |

> **Important:** Change the default password immediately after first login.

---

## Migrations

All migration commands are run from the `backend/` directory.

### List Existing Migrations

```bash
dotnet ef migrations list --project HMS.Persistence --startup-project HMS.Api
```

### Add a New Migration

```bash
dotnet ef migrations add <MigrationName> --project HMS.Persistence --startup-project HMS.Api
```

Example:

```bash
dotnet ef migrations add AddPatientPhoneField --project HMS.Persistence --startup-project HMS.Api
```

### Apply Migrations to Database

```bash
dotnet ef database update --project HMS.Persistence --startup-project HMS.Api
```

### Apply a Specific Migration

```bash
dotnet ef database update <MigrationName> --project HMS.Persistence --startup-project HMS.Api
```

### Roll Back to a Previous Migration

```bash
dotnet ef database update <PreviousMigrationName> --project HMS.Persistence --startup-project HMS.Api
```

### Remove the Last Migration (if not applied)

```bash
dotnet ef migrations remove --project HMS.Persistence --startup-project HMS.Api
```

### Drop the Database

```bash
dotnet ef database drop --project HMS.Persistence --startup-project HMS.Api
```

### Generate a SQL Script (for production deployments), if we want to review the code before we push it.

```bash
dotnet ef script --project HMS.Persistence --startup-project HMS.Api --output migration.sql
```

---

## Testing

Tests are located in `backend/HMS.Tests`.

### Run All Tests

```bash
dotnet test
```

### Run with Detailed Output

```bash
dotnet test --verbosity normal
```

### Run a Specific Test Project

```bash
dotnet test HMS.Tests
```

### Run Tests with Coverage, shows what is covered

```bash
dotnet test --collect:"XPlat Code Coverage"
```

### Filter by Test Name

```bash
dotnet test --filter "FullyQualifiedName~PatientServiceTests"
```

The test suite uses **xUnit** as the test framework and **Moq** for mocking dependencies.

---

## Stripe Configuration

### Local Webhook Testing

Install the Stripe CLI:

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (via Scoop)
scoop install stripe
```

Login and forward webhooks to your local API:

```bash
stripe login
stripe listen --forward-to https://localhost:7297/api/stripe/webhook
```

Copy the webhook signing secret output by the CLI and set it as `StripeSettings:WebhookSecret` in `appsettings.json`.

### Required Webhook Events

Register the following events in your Stripe dashboard (or CLI):

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `checkout.session.completed`

---

## Useful Commands

### .NET

```bash
# Restore all packages
dotnet restore

# Build the API project
dotnet build HMS.Api

# Build in Release mode
dotnet build HMS.Api --configuration Release

# Run the API
dotnet run --project HMS.Api

# Run with a specific environment
dotnet run --project HMS.Api --environment Development

# Watch mode (auto-restart on file changes)
dotnet watch run --project HMS.Api

# Publish for deployment
dotnet publish HMS.Api --configuration Release --output ./publish

# Clean build artifacts
dotnet clean

# List installed tools
dotnet tool list --global

# Update EF Core CLI tool
dotnet tool update --global dotnet-ef
```

### npm

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint the codebase
npm run lint

# Run frontend tests (if configured)
npm test
```

---

*For API endpoint reference, see [apidocumentation.md](./apidocumentation.md).*
