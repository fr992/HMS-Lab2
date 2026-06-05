# HMS API Documentation

**Version:** v1  
**Specification:** OAS 3.0  
**Base URL:** `https://localhost:7297`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Admin — Audit Logs](#admin--audit-logs)
3. [Admin — Departments](#admin--departments)
4. [Admin — Permissions](#admin--permissions)
5. [Admin — Role Permissions](#admin--role-permissions)
6. [Admin — Roles](#admin--roles)
7. [Admin — Settings](#admin--settings)
8. [Admin — Settings Logo](#admin--settings-logo)
9. [Admin — Staff](#admin--staff)
10. [Admin — Users](#admin--users)
11. [Admin — Lab Tests](#admin--lab-tests)
12. [Admin — Medications](#admin--medications)
13. [Appointment Requests](#appointment-requests)
14. [Appointments (Receptionist)](#appointments-receptionist)
15. [Bed Assignment Requests](#bed-assignment-requests)
16. [Beds](#beds)
17. [Dashboard](#dashboard)
18. [Data Transfer](#data-transfer)
19. [Departments](#departments)
20. [Diagnoses](#diagnoses)
21. [Doctor — Appointments](#doctor--appointments)
22. [Doctor — Dashboard](#doctor--dashboard)
23. [Doctor — Patients](#doctor--patients)
24. [Doctors](#doctors)
25. [Encounter — Bed Assignment Requests](#encounter--bed-assignment-requests)
26. [Encounter — Lab Requests](#encounter--lab-requests)
27. [Encounters](#encounters)
28. [Lab Requests Workflow](#lab-requests-workflow)
29. [Lab Results Workflow](#lab-results-workflow)
30. [Nurses](#nurses)
31. [Nurse Tasks](#nurse-tasks)
32. [Patient Contacts](#patient-contacts)
33. [Patients](#patients)
34. [Payments](#payments)
35. [Prescriptions](#prescriptions)
36. [Invoices (Reception)](#invoices-reception)
37. [Lab Results (Reception)](#lab-results-reception)
38. [My — Appointments](#my--appointments)
39. [My — Invoices](#my--invoices)
40. [My — Lab Results](#my--lab-results)
41. [My — Medical History](#my--medical-history)
42. [My — Notifications](#my--notifications)
43. [My — Payments](#my--payments)
44. [Public Endpoints](#public-endpoints)
45. [Stripe](#stripe)
46. [User Profile](#user-profile)

---

## Authentication

Base path: `/api/Auth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/Auth/login` | Authenticate a user and retrieve access and refresh tokens |
| `POST` | `/api/Auth/refresh` | Refresh an expired access token using a valid refresh token |

---

## Admin — Audit Logs

Base path: `/api/admin/audit-logs`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/audit-logs` | Retrieve all user audit log entries |
| `GET` | `/api/admin/audit-logs/system` | Retrieve system-level audit log entries |

---

## Admin — Departments

Base path: `/api/admin/departments`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/departments` | List all departments |
| `POST` | `/api/admin/departments` | Create a new department |
| `GET` | `/api/admin/departments/{id}` | Retrieve a department by ID |
| `PUT` | `/api/admin/departments/{id}` | Update a department by ID |
| `DELETE` | `/api/admin/departments/{id}` | Delete a department by ID |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string/int | Department identifier |

---

## Admin — Permissions

Base path: `/api/admin/permissions`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/permissions` | Retrieve all available system permissions |

---

## Admin — Role Permissions

Base path: `/api/admin/role-permissions`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/role-permissions/{roleId}` | Get permissions assigned to a specific role |
| `PUT` | `/api/admin/role-permissions/{roleId}` | Update permissions for a specific role |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `roleId` | string/int | Role identifier |

---

## Admin — Roles

Base path: `/api/admin/roles`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/roles` | List all roles |
| `POST` | `/api/admin/roles` | Create a new role |
| `PUT` | `/api/admin/roles/{id}` | Update a role by ID |
| `DELETE` | `/api/admin/roles/{id}` | Delete a role by ID |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string/int | Role identifier |

---

## Admin — Settings

Base path: `/api/admin/settings`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/settings` | Retrieve all system settings |
| `POST` | `/api/admin/settings` | Create a new setting entry |
| `GET` | `/api/admin/settings/{id}` | Retrieve a setting by ID |
| `PUT` | `/api/admin/settings/{id}` | Update a setting by ID |
| `DELETE` | `/api/admin/settings/{id}` | Delete a setting by ID |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string/int | Setting identifier |

---

## Admin — Settings Logo

Base path: `/api/admin/settings/logo`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/settings/logo` | Upload or replace the organization logo |

---

## Admin — Staff

Base path: `/api/admin/staff`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/staff/doctors` | Register a new doctor staff member |
| `POST` | `/api/admin/staff/nurses` | Register a new nurse staff member |
| `POST` | `/api/admin/staff/general` | Register a new general staff member |

---

## Admin — Users

Base path: `/api/admin/users`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/users` | Create a new user |
| `GET` | `/api/admin/users` | List all users |
| `GET` | `/api/admin/users/{id}` | Retrieve a user by ID |
| `PUT` | `/api/admin/users/{id}` | Update a user by ID |
| `PATCH` | `/api/admin/users/{id}/active` | Toggle the active status of a user |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string/int | User identifier |

---

## Admin — Lab Tests

Base path: `/api/admin/lab-tests`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/lab-tests` | List all lab tests |
| `POST` | `/api/admin/lab-tests` | Create a new lab test |
| `GET` | `/api/admin/lab-tests/{id}` | Retrieve a lab test by ID |
| `PUT` | `/api/admin/lab-tests/{id}` | Update a lab test by ID |
| `DELETE` | `/api/admin/lab-tests/{id}` | Delete a lab test by ID |
| `GET` | `/api/admin/lab-tests/export/{format}` | Export lab tests in the specified format |
| `POST` | `/api/admin/lab-tests/import/{format}` | Import lab tests from a file in the specified format |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string/int | Lab test identifier |
| `format` | string | File format (e.g., `csv`, `xlsx`) |

---

## Admin — Medications

Base path: `/api/admin/medications`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/medications` | Create a new medication |
| `GET` | `/api/admin/medications` | List all medications |
| `GET` | `/api/admin/medications/{id}` | Retrieve a medication by ID |
| `PUT` | `/api/admin/medications/{id}` | Update a medication by ID |
| `DELETE` | `/api/admin/medications/{id}` | Delete a medication by ID |
| `GET` | `/api/admin/medications/export/{format}` | Export medications in the specified format |
| `POST` | `/api/admin/medications/import/{format}` | Import medications from a file in the specified format |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string/int | Medication identifier |
| `format` | string | File format (e.g., `csv`, `xlsx`) |

---

## Appointment Requests

Base path: `/api/appointment-requests`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/appointment-requests` | List all appointment requests |
| `POST` | `/api/appointment-requests` | Submit a new appointment request |
| `GET` | `/api/appointment-requests/{id}` | Retrieve an appointment request by ID |
| `PATCH` | `/api/appointment-requests/{id}/status` | Update the status of an appointment request |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string/int | Appointment request identifier |

---

## Appointments (Receptionist)

Base path: `/api/receptionist/appointments`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/receptionist/appointments` | List all appointments |
| `POST` | `/api/receptionist/appointments` | Create a new appointment |
| `GET` | `/api/receptionist/appointments/{id}` | Retrieve an appointment by ID |
| `PUT` | `/api/receptionist/appointments/{id}` | Update an appointment by ID |
| `PATCH` | `/api/receptionist/appointments/{id}/status` | Update the status of an appointment |
| `GET` | `/api/receptionist/appointments/export/{format}` | Export appointments in the specified format |
| `POST` | `/api/receptionist/appointments/import/{format}` | Import appointments from a file in the specified format |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string/int | Appointment identifier |
| `format` | string | File format (e.g., `csv`, `xlsx`) |

---

## Bed Assignment Requests

Base path: `/api/bed-assignment-requests`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/bed-assignment-requests` | List all pending bed assignment requests |
| `POST` | `/api/bed-assignment-requests/{requestId}/assign` | Approve and assign a bed for the given request |
| `POST` | `/api/bed-assignment-requests/{requestId}/reject` | Reject a bed assignment request |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `requestId` | string/int | Bed assignment request identifier |

---

## Beds

Base path: `/api/beds`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/beds` | List all beds |
| `POST` | `/api/beds` | Create a new bed |
| `GET` | `/api/beds/department` | List beds filtered by department |
| `GET` | `/api/beds/{id}` | Retrieve a bed by ID |
| `PUT` | `/api/beds/{id}` | Update a bed by ID |
| `GET` | `/api/beds/export/{format}` | Export beds data in the specified format |
| `POST` | `/api/beds/import/{format}` | Import beds data from a file in the specified format |
| `POST` | `/api/beds/{bedId}/assign` | Assign a patient to a specific bed |
| `POST` | `/api/beds/{bedId}/release` | Release a patient from a specific bed |
| `POST` | `/api/beds/assignments/{assignmentId}/release` | Release a bed using the assignment ID |
| `GET` | `/api/beds/assignments/active` | List all currently active bed assignments |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string/int | Bed identifier |
| `bedId` | string/int | Bed identifier (for assignment actions) |
| `assignmentId` | string/int | Bed assignment identifier |
| `format` | string | File format (e.g., `csv`, `xlsx`) |

---

## Dashboard

Base path: `/api/dashboard`

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/stats/patients` | Total patient count |
| `GET` | `/api/dashboard/stats/appointments/today` | Number of appointments scheduled for today |
| `GET` | `/api/dashboard/stats/doctors/active` | Count of currently active doctors |
| `GET` | `/api/dashboard/stats/lab/pending` | Number of pending lab requests |
| `GET` | `/api/dashboard/stats/revenue/mtd` | Month-to-date revenue figure |
| `GET` | `/api/dashboard/stats/nurse-tasks/open` | Count of open nurse tasks |

### Charts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/charts/patient-trends` | Patient trend data for charting |
| `GET` | `/api/dashboard/charts/revenue` | Revenue trend data for charting |
| `GET` | `/api/dashboard/charts/departments` | Department activity data for charting |

### Overview Panels

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/beds/occupancy` | Current bed occupancy overview |
| `GET` | `/api/dashboard/patients/recent` | Recently registered or seen patients |
| `GET` | `/api/dashboard/appointments/upcoming` | Upcoming appointments |
| `GET` | `/api/dashboard/alerts` | Active system alerts |

---

## Data Transfer

Base path: `/api/data-transfer`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/data-transfer/{module}/export/{format}` | Export data for the specified module in the given format |
| `POST` | `/api/data-transfer/{module}/import/{format}` | Import data into the specified module from a file |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `module` | string | Module name (e.g., `patients`, `appointments`) |
| `format` | string | File format (e.g., `csv`, `xlsx`) |

---

## Departments

Base path: `/api/departments`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/departments` | List all departments (general access) |

---

## Diagnoses

Base path: `/api/encounters/{encounterId}/diagnoses`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/encounters/{encounterId}/diagnoses` | List diagnoses for a specific encounter |
| `POST` | `/api/encounters/{encounterId}/diagnoses` | Add a diagnosis to a specific encounter |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `encounterId` | string/int | Encounter identifier |

---

## Doctor — Appointments

Base path: `/api/clinical/doctor/appointments`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/clinical/doctor/appointments` | List appointments for the authenticated doctor |
| `PATCH` | `/api/clinical/doctor/appointments/{id}/status` | Update the status of a doctor's appointment |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string/int | Appointment identifier |

---

## Doctor — Dashboard

Base path: `/api/clinical/doctor/dashboard`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/clinical/doctor/dashboard` | Retrieve the authenticated doctor's dashboard summary |

---

## Doctor — Patients

Base path: `/api/clinical/doctor/patients`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/clinical/doctor/patients` | List patients associated with the authenticated doctor |
| `GET` | `/api/clinical/doctor/patients/grouped` | List patients grouped by a relevant category |

---

## Doctors

Base path: `/api/doctors`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/doctors` | List all doctors |

---

## Encounter — Bed Assignment Requests

Base path: `/api/encounters/{encounterId}/bed-assignment-requests`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/encounters/{encounterId}/bed-assignment-requests` | Create a bed assignment request for an encounter |
| `GET` | `/api/encounters/{encounterId}/bed-assignment-requests` | List bed assignment requests for an encounter |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `encounterId` | string/int | Encounter identifier |

---

## Encounter — Lab Requests

Base path: `/api/encounters/{encounterId}/lab-requests`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/encounters/{encounterId}/lab-requests` | List lab requests for an encounter |
| `POST` | `/api/encounters/{encounterId}/lab-requests` | Create a new lab request for an encounter |
| `GET` | `/api/encounters/{encounterId}/lab-requests/{labRequestId}` | Retrieve a specific lab request for an encounter |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `encounterId` | string/int | Encounter identifier |
| `labRequestId` | string/int | Lab request identifier |

---

## Encounters

Base path: `/api/encounters`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/encounters` | Create a new encounter |
| `GET` | `/api/encounters` | List all encounters |
| `GET` | `/api/encounters/{id}` | Retrieve an encounter by ID |
| `PUT` | `/api/encounters/{id}` | Update an encounter by ID |
| `PATCH` | `/api/encounters/{id}/status` | Update the status of an encounter |
| `POST` | `/api/encounters/{id}/close` | Close an encounter |
| `GET` | `/api/encounters/{id}/panel` | Retrieve the clinical panel for an encounter |
| `GET` | `/api/encounters/{id}/patient-panel` | Retrieve the patient panel view for an encounter |
| `GET` | `/api/encounters/patient` | List encounters for a specific patient |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string/int | Encounter identifier |

---

## Lab Requests Workflow

Base path: `/api/lab/requests`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/lab/requests` | List all lab requests in the workflow queue |
| `PATCH` | `/api/lab/requests/{id}/status` | Update the status of a lab request |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string/int | Lab request identifier |

---

## Lab Results Workflow

Base path: `/api/lab/results`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/lab/results` | Submit a new lab result |
| `PUT` | `/api/lab/results/{id}` | Update an existing lab result |
| `POST` | `/api/lab/results/{id}/publish` | Publish a lab result to make it visible to relevant parties |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string/int | Lab result identifier |

---

## Nurses

Base path: `/api/nurses`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/nurses` | List all nurses |

---

## Nurse Tasks

Base path: `/api/nurse-tasks`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/nurse-tasks` | Create a new nurse task |
| `GET` | `/api/nurse-tasks/encounter/{encounterId}` | List nurse tasks associated with an encounter |
| `GET` | `/api/nurse-tasks/my` | List tasks assigned to the authenticated nurse |
| `PUT` | `/api/nurse-tasks/{id}` | Update a nurse task by ID |
| `POST` | `/api/nurse-tasks/{id}/complete` | Mark a nurse task as completed |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `encounterId` | string/int | Encounter identifier |
| `id` | string/int | Nurse task identifier |

---

## Patient Contacts

Base path: `/api/patients/{patientId}/contacts`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patients/{patientId}/contacts` | Retrieve contact information for a patient |
| `PUT` | `/api/patients/{patientId}/contacts` | Update contact information for a patient |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `patientId` | string/int | Patient identifier |

---

## Patients

Base path: `/api/patients`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/patients/register` | Register a new patient |
| `POST` | `/api/patients/{id}/portal` | Enable or configure portal access for a patient |
| `GET` | `/api/patients/{id}` | Retrieve a patient by ID |
| `PUT` | `/api/patients/{id}` | Update a patient by ID |
| `DELETE` | `/api/patients/{id}` | Delete a patient by ID |
| `GET` | `/api/patients` | List all patients |
| `GET` | `/api/patients/export/{format}` | Export patient data in the specified format |
| `POST` | `/api/patients/import/{format}` | Import patients from a file in the specified format |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string/int | Patient identifier |
| `format` | string | File format (e.g., `csv`, `xlsx`) |

---

## Payments

Base path: `/api/payments`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/payments/{id}` | Retrieve a payment by ID |
| `GET` | `/api/payments` | List all payments |
| `POST` | `/api/payments` | Create a new payment record |
| `PATCH` | `/api/payments/{id}/status` | Update the status of a payment |
| `POST` | `/api/payments/{id}/confirm-cash` | Confirm a cash payment |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string/int | Payment identifier |

---

## Prescriptions

Base path: `/api/encounters/{encounterId}/prescriptions`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/encounters/{encounterId}/prescriptions` | Create a prescription for an encounter |
| `GET` | `/api/encounters/{encounterId}/prescriptions` | List prescriptions for an encounter |
| `GET` | `/api/encounters/{encounterId}/prescriptions/{prescriptionId}` | Retrieve a specific prescription |
| `PATCH` | `/api/encounters/{encounterId}/prescriptions/{prescriptionId}/status` | Update the status of a prescription |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `encounterId` | string/int | Encounter identifier |
| `prescriptionId` | string/int | Prescription identifier |

---

## Invoices (Reception)

Base path: `/api/invoices`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/invoices/{id}` | Retrieve an invoice by ID |
| `GET` | `/api/invoices` | List all invoices |
| `POST` | `/api/invoices` | Create a new invoice |
| `PUT` | `/api/invoices/{id}/status` | Update the status of an invoice |
| `POST` | `/api/invoices/{id}/cancel` | Cancel an invoice |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string/int | Invoice identifier |

---

## Lab Results (Reception)

Base path: `/api/lab-results`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/lab-results/{id}` | Retrieve a lab result by ID |
| `GET` | `/api/lab-results` | List all lab results |
| `GET` | `/api/lab-results/{id}/download` | Download a lab result file by ID |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string/int | Lab result identifier |

---

## My — Appointments

Base path: `/api/patients/me/appointments`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patients/me/appointments` | List appointments for the authenticated patient |

---

## My — Invoices

Base path: `/api/me/invoices`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/me/invoices` | List invoices for the authenticated user |

---

## My — Lab Results

Base path: `/api/me/lab-results`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/me/lab-results` | List lab results for the authenticated user |
| `GET` | `/api/me/lab-results/{id}/download` | Download a specific lab result file |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string/int | Lab result identifier |

---

## My — Medical History

Base path: `/api/me/medical-history`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/me/medical-history` | Retrieve the medical history of the authenticated user |

---

## My — Notifications

Base path: `/api/notifications/me`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notifications/me` | List all notifications for the authenticated user |
| `GET` | `/api/notifications/me/unread-count` | Get the count of unread notifications |
| `POST` | `/api/notifications/{id}/read` | Mark a specific notification as read |
| `POST` | `/api/notifications/me/read-all` | Mark all notifications as read |
| `POST` | `/api/notifications/{id}/clear` | Clear (dismiss) a specific notification |
| `POST` | `/api/notifications/me/clear` | Clear all notifications for the authenticated user |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string/int | Notification identifier |

---

## My — Payments

Base path: `/api/me/payments`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/me/payments/pay-online` | Initiate an online payment for the authenticated user |

---

## Public Endpoints

These endpoints are accessible without authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/public/landing-stats` | Retrieve statistics displayed on the public landing page |
| `GET` | `/api/public/departments` | List departments visible to the public |
| `GET` | `/api/public/doctors` | List doctors visible to the public |
| `GET` | `/api/public/settings` | Retrieve public-facing system settings |
| `GET` | `/api/public/settings/logo/{storedFileName}` | Retrieve the organization logo by filename |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `storedFileName` | string | The stored filename of the logo image |

---

## Stripe

Base path: `/api/stripe`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/stripe/checkout/{paymentId}` | Initiate a Stripe checkout session for a payment |
| `POST` | `/api/stripe/checkout/confirm` | Confirm a completed Stripe checkout session |
| `POST` | `/api/stripe/webhook` | Handle incoming Stripe webhook events |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `paymentId` | string/int | Payment identifier |

---

## User Profile

Base path: `/api/user-profile`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/user-profile` | Retrieve the authenticated user's profile |
| `PUT` | `/api/user-profile` | Update the authenticated user's profile |

---