# External Integrations — Zenspace Internal Onboarding

> Last updated: 2026-06-17

---

## Overview

This project connects to five categories of external services: a backend database (Supabase), file storage (Google Drive via Apps Script), workflow automation (Make.com), project management (Asana), and client-side PDF libraries.

---

## 1. Supabase — Primary Database & Backend

**Config file:** `js/supabaseClient.js`  
**Project URL:** `https://dzctvxbqixqipuymgidr.supabase.co`

Supabase is the core backend. All form data is read from and written to Supabase tables via the JavaScript client.

### Tables Used

| Table | Purpose |
|---|---|
| `events` | Core event details (name, dates, address) |
| `pods_booked` | Pod/space booking records |
| `event_contacts` | Contact information per event |
| `booking_app_addons` | Addon product configuration |
| `branding_items` | Branding configurations |
| `ov_monitor_usage` | Monitor usage tracking |
| `invoice_details` | Invoice records |
| `additional_items` | Additional item listings |
| `internal_preplanning` | Pre-planning form section data |
| `internal_artwork` | Artwork & branding data |
| `internal_printing` | Printing data |
| `internal_printing_quotes` | Multiple printing quote entries |
| `internal_trucking` | Trucking/logistics entries |
| `internal_trucking_meta` | Trucking metadata including file URLs |
| `internal_installation` | Installation section data |
| `internal_installation_dates` | Installation date records |
| `internal_postevent` | Post-event data with image URLs |
| `internal_travel` | Travel arrangement entries |
| `internal_travel_meta` | Travel metadata with invoice URLs |
| `internal_coi` | Certificate of Insurance documents |
| `internal_booking_software` | Booking software configuration |

### Operations

- Full CRUD (Create, Read, Update, Delete) on all tables above
- Upsert patterns for single-record sections
- Delete + re-insert for multi-entry sections (e.g. trucking, printing quotes, travel)
- File URLs returned from Google Drive are stored back into Supabase

### Key Files

- `js/supabaseClient.js` — client initialization
- `js/app.js` — main CRUD operations
- `js/fetchCustomerOnboardingData.js` — data fetch on page load

---

## 2. Google Drive — File Storage (via Google Apps Script)

Two separate Google Apps Script web app endpoints handle file operations and folder structure queries.

### A. File Upload / Delete Service

**Endpoint location:** `js/fileUpload.js` line 12  
**Script URL:** `https://script.google.com/macros/s/AKfycbze8yd27lK9WxJHKgdkrBYXuuK4ndBdcsjZ_j8qsQI_cXgGd_rScvwCy-6I0M-bYxUYow/exec`

**What it does:**
- Accepts files encoded as Base64 strings
- Uploads them to the event's Google Drive folder
- Returns a shareable file URL, which is then saved to Supabase
- Supports deleting files from Drive by file URL

**Used for uploading:**
- Trucking invoices
- Damage images
- Event images (post-event)
- Travel invoices
- Certificate of Insurance (COI) documents

**Constraints:**
- Max file size: 10 MB per file
- Supports multiple file uploads
- Preserves original filenames

### B. Folder Structure Fetch Service

**Endpoint location:** `js/fetchCustomerOnboardingData.js` line 626  
**Script URL:** `https://script.google.com/macros/s/AKfycby3cy0xKc_kft-dGPfQWFCTWbhze-9GG6-NzWdy5V4TlerPwq_a6vBfx1lVRHJk5UQb/exec`

**What it does:**
- Queries the event's Google Drive folder tree by event name/ID
- Returns subfolder links for each section of the onboarding form
- Auto-populates folder link fields in the form UI

**Subfolders referenced:**
- Booking Software Client Documents
- Booking Software Generated Proofs
- Client Provided Files
- Generated Proofs
- BOL (Bill of Lading) folder

### Key Files

- `js/fileUpload.js` — upload/delete logic
- `js/fetchCustomerOnboardingData.js` — folder link fetch on load

---

## 3. Make.com (formerly Integromat) — Workflow Automation

Make.com acts as the middleware between this app and Asana. Two webhook endpoints are used.

### Webhook A — Create Asana Project

**Location:** `js/asanaproject.js` line 295  
**Function:** `createAsanaProjectFromForm()`  
**Endpoint:** `https://hook.eu2.make.com/65ekfm999df11s29ypulbd3rf28lhh3n`

**Triggered when:** A new event is onboarded for the first time.  
**Payload includes:** Event name, dates, address, contact info, and links to the internal/external onboarding forms.

### Webhook B — Update Asana Task Descriptions

**Location:** `js/asanaproject.js` line 1656  
**Function:** `updateProjectTask(data)`  
**Endpoint:** `https://hook.eu2.make.com/tfl2towp9ly3bxrce6qupd35ng4cg464`

**Triggered when:** Any form section is saved.  
**Tasks updated via this webhook:**

| Task Name | Form Section |
|---|---|
| Pre-event planning | `internal_preplanning` |
| Artwork & branding | `internal_artwork` |
| Printing | `internal_printing` / `internal_printing_quotes` |
| Trucking source | `internal_trucking` / `internal_trucking_meta` |
| Installation | `internal_installation` |
| Post-event | `internal_postevent` |
| Booking software | `internal_booking_software` |
| Travel & lodging | `internal_travel` / `internal_travel_meta` |
| COI | `internal_coi` |

### Key Files

- `js/asanaproject.js` — all Make.com webhook calls and payload construction

---

## 4. Asana — Project & Task Management

Asana is not called directly from this app. All communication goes through Make.com webhooks (see above).

**What gets created/updated in Asana:**
- One Asana project per event, created at onboarding
- Individual task descriptions updated with structured form data as each section is saved
- Task descriptions include formatted summaries of logistics, contacts, dates, files, and notes

---

## 5. PDF Generation Libraries (CDN)

Client-side PDF generation — no server or account required.

| Library | CDN Source | Used In | Purpose |
|---|---|---|---|
| jsPDF 2.5.1 | cdnjs.cloudflare.com | `bol_form.html` | Generate Bill of Lading PDFs |
| jsPDF AutoTable 3.5.31 | cdnjs.cloudflare.com | `bol_form.html` | Table formatting in BOL PDFs |
| html2pdf.js 0.10.1 | cdnjs.cloudflare.com | `warehouse_work_order.html` | Generate warehouse work order PDFs |

---

## Data Flow

```
User fills onboarding form
        |
        v
[Supabase] ← save all form section data
        |
        +--→ [Google Drive / Apps Script] ← file uploads (invoices, images, COI)
        |           |
        |           +→ file URL returned → saved back to Supabase
        |
        +--→ [Make.com Webhook] ← triggered on save
                    |
                    +→ [Asana] ← project created / task descriptions updated

On page load:
[Supabase] → fetch event + section data → populate form fields
[Google Apps Script] → fetch Drive folder links → auto-fill folder URL fields
```

---

## Security Notes

| Concern | Location | Risk Level |
|---|---|---|
| Supabase anon key hardcoded in client JS | `js/supabaseClient.js:3` | Medium — anon keys are public-facing by design but must be protected by Row Level Security (RLS) policies |
| Make.com webhook URLs exposed in client JS | `js/asanaproject.js:295,1656` | High — anyone with these URLs can trigger Asana project creation or task updates |
| Google Apps Script endpoints unauthenticated | `js/fileUpload.js:12`, `js/fetchCustomerOnboardingData.js:626` | Medium — no auth token required to call these endpoints |

**Recommendations:**
- Verify Supabase RLS policies are enforced on all tables
- Consider moving Make.com webhook calls to a server-side proxy to hide the URLs
- Add a shared secret or token check to the Google Apps Script endpoints

---

## Files Quick Reference

| File | Services Used |
|---|---|
| `js/supabaseClient.js` | Supabase — client init |
| `js/app.js` | Supabase — all CRUD |
| `js/fetchCustomerOnboardingData.js` | Supabase (read), Google Apps Script (folder fetch) |
| `js/asanaproject.js` | Make.com webhooks → Asana |
| `js/fileUpload.js` | Google Drive via Apps Script |
| `bol_form.html` | jsPDF, jsPDF AutoTable |
| `warehouse_work_order.html` | html2pdf.js |
