# Nexora Hospital Management System (HMS)

## Overview

Nexora Hospital Management System (HMS) is a full-stack healthcare platform developed to support hospital operations, clinical workflows, patient management, and administrative processes within a centralized environment.

The system enables healthcare professionals to manage patients, appointments, encounters, laboratory services, bed assignments, billing, notifications, and hospital resources while ensuring security through role-based access control and authentication mechanisms.

---

## Technology Stack

### Backend

* ASP.NET Core 8 Web API
* Entity Framework Core
* SQL Server
* MongoDB
* SignalR
* Stripe Checkout
* Serilog

### Frontend

* React 19
* Vite
* React Router
* TanStack Query
* Axios
* Zustand
* Tailwind CSS
* Radix UI

### Testing

* xUnit
* Moq
* EF Core InMemory
* Coverlet

---

## System Architecture

The application follows a layered modular architecture consisting of:

* API Layer
* Application Layer
* Contracts Layer
* Persistence Layer
* Identity Layer
* Frontend Presentation Layer

This architecture promotes maintainability, scalability, and separation of concerns.

---

## Core Features

### Public Website

* Public hospital landing page
* Hospital branding and settings
* Department listings
* Doctor directory
* Landing page statistics
* Online appointment request form
* Bilingual content support

### Authentication & Authorization

* JWT Authentication
* Refresh Token support
* Role-Based Access Control (RBAC)
* Permission-Based Authorization
* Protected frontend routes
* User profile management

### Patient Management

* Patient registration and profile management
* Patient contact management
* Medical history tracking
* Patient portal access
* Search and filtering functionality

### Appointment Management

* Appointment scheduling and tracking
* Online appointment request review
* Appointment status management
* Calendar-based appointment views

### Clinical Encounters

* Encounter creation and management
* Diagnoses and prescriptions
* Medical notes and status updates
* Laboratory requests
* Nurse task assignment
* Bed assignment requests
* Printable encounter reports

### Laboratory Management

* Laboratory test catalog
* Laboratory request workflow
* Result publishing and management
* File attachment and download support
* Patient access to laboratory results

### Nursing & Bed Management

* Nurse task management
* Bed allocation and assignments
* Bed transfer requests
* Occupancy monitoring
* Bed request approval workflow

### Billing & Payments

* Invoice management
* Payment processing
* Cash payment confirmation
* Stripe online payments
* Patient online invoice payments

### Notifications

* Real-time notifications
* Notification management
* Unread notification tracking
* SignalR-powered updates

### Administration

* User management
* Staff management
* Role and permission management
* Department management
* System settings
* Logo management
* Audit logs

### Reporting & Data Management

* Dashboard analytics and statistics
* CSV export
* Excel export
* JSON export
* Data import functionality

---

## User Roles

The system supports the following user roles:

* Super Administrator
* Administrator
* Doctor
* Nurse
* Receptionist
* Laboratory Technician
* Patient

Each role is assigned specific permissions through a role-based access control system.

---

## Security Features

* JWT Authentication
* Refresh Token Rotation
* Role-Based Access Control (RBAC)
* Permission-Based Authorization
* Password Hashing
* Input Validation
* Audit Logging
* Secure SignalR Authentication
* Database Constraints and Validation Rules

---

## Integrations

The system integrates with several external technologies:

* SQL Server for relational data storage
* MongoDB for notification management
* SignalR for real-time communication
* Stripe Checkout for online payments
* Seq and Serilog for monitoring and logging

---

## Getting Started

### Backend

```bash
cd HMS/backend
dotnet restore
dotnet ef database update --project HMS.Persistence --startup-project HMS.Api
dotnet run --project HMS.Api
```

### Frontend

```bash
cd HMS/hms-frontend
npm install
npm run dev
```

---

## Testing

```bash
cd HMS/backend
dotnet test
```

The project includes backend unit tests, controller tests, authorization tests, and validation tests to ensure system reliability and maintainability.
