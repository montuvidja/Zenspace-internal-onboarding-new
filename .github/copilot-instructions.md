# ZenSpace Operations Hub - AI Coding Agent Guide

## Project Overview
ZenSpace Operations Hub is a vanilla HTML/CSS/JavaScript web application for managing event onboarding workflows. It integrates with Supabase for data persistence and generates documents (Warehouse Work Orders, Bills of Lading) by passing data between pages via `localStorage`.

**Key URL**: Hardcoded event ID `4718866000034408037` in [fetchCustomerOnboardingData.js](js/fetchCustomerOnboardingData.js#L48)

## Architecture & Data Flow

### Three-Page Document Generation Pattern
The app uses a **multi-page localStorage bridge** for document generation:

1. **[index.html](index.html)** - Main onboarding form
   - Loads event context and form fields from Supabase via [fetchCustomerOnboardingData.js](js/fetchCustomerOnboardingData.js)
   - User completes multi-section form (Pre-planning, Logistics, Finance, etc.)
   - Click "Generate" button → builds payload → stores in localStorage with unique key (e.g., `"wo_" + Date.now()`)
   - Opens new window: `warehouse_work_order.html?woKey=...` or `bol_form.html?bolKey=...`

2. **[warehouse_work_order.html](warehouse_work_order.html) & [bol_form.html](bol_form.html)**
   - Read the localStorage key from URL query param
   - Retrieve and render the structured payload for display/printing
   - Data retrieval pattern: `localStorage.getItem('wo_' + timestamp)` → parse → populate HTML

### Supabase Integration ([supabaseClient.js](js/supabaseClient.js))
- **Global initialization**: Loads Supabase JS from CDN; exposes `window.sb`, `window.supabase`
- **Helper methods**: `window.sbUpsert()`, `window.sbInsertMany()`, `window.sbDeleteWhere()`
- **Auth**: Disabled (`persistSession: false`) - this is a stateless utility app
- **Ready state**: Waits for `window.__supabaseReady` Promise before queries

### Supabase Tables Queried
- `events` - Event details (dates, addresses, contact info)
- `branding_items` - Product branding (files, drive links)
- `booking_app_addons` - Bookable products
- `ov_monitor_usage` - Monitor product usage types
- `pods_booked` - Pod inventory (types, quantities, warehouse locations)
- `invoice_details` - Invoice breakdowns
- `additional_items` - Custom line items for orders

## Conventions & Patterns

### Form Data Handling
**Checkbox & Radio State Management** ([app.js](js/app.js#L150-L200)):
- Custom click handlers prevent default HTML behavior (double-toggle)
- State reflected in `.classList` (`.checked`, `.selected`) for styling
- Multi-select checkboxes stored as arrays; radio buttons as strings
- "Other" input fields conditionally enabled/disabled based on checkbox state

**Data Collection**:
- `getAllFormData()` - Gathers header inputs + form data into single object
- `getSectionData(element)` - Extracts data from a specific `.section-card`
- `saveSectionData(sectionId, data)` - Persists to `localStorage['zenspace_sections']`

### Payload Builders ([fetchCustomerOnboardingData.js](js/fetchCustomerOnboardingData.js#L280-L350))
- `buildWarehouseWorkOrderPayload(data)` - Transforms form/DB data into warehouse-ready structure
- `buildBolPayload(data)` - Constructs Bill of Lading object
- Pattern: Merge Supabase base data + current form values → map to output schema → localStorage → open new window

### Address Handling
- Radio group for warehouse address selection with label cards (`.address-option`)
- Special "other" value triggers custom textarea input (`warehouse_address_other`)
- `getSelectedWarehouseAddress()` - Extracts selected address with title + details

### UI Toast Notifications ([app.js](js/app.js#L10-L28))
```javascript
showToast(message, type = 'info') // types: 'success', 'error', 'info'
```

## Key Files Reference

| File | Purpose |
|------|---------|
| [index.html](index.html) | Main form UI (1,096 lines, 8 sections) |
| [app.js](app.js) | Form logic, accordion, checkbox handling (794 lines) |
| [fetchCustomerOnboardingData.js](fetchCustomerOnboardingData.js) | Supabase queries, payload builders (401 lines) |
| [supabaseClient.js](supabaseClient.js) | DB client init & helper methods (70 lines) |
| [utility.js](utility.js) | Date formatting helpers |
| [styles.css](css/styles.css) | Component-based design system |

## Development Notes

- **No build step** - Vanilla JS, direct file loading
- **Browser localStorage** - Session/draft persistence (no server)
- **Query param passing**: `?woKey=...`, `?bolKey=...` for cross-page data
- **XAMPP serving**: Files run from `f:\xampp\htdocs\Zenspace-interna-onboarding-new\`
- **Event context**: Currently hardcoded; refactor `loadEventData()` to read from URL parameter for multi-event support
- **Date format**: `DD-Mon-YYYY HH:mm` (e.g., `25-Dec-2025 14:30`)

## Common Tasks

**Add a new form field**: 
1. Insert `<input>` in [index.html](index.html) with unique `name` attribute
2. Form data auto-captured by `getAllFormData()` - no JS needed
3. To pre-fill from Supabase: Add mapping in `loadEventData()` → `data` object → `populateHeaderData()`

**Generate a new document type**:
1. Create HTML template (e.g., `invoice_form.html`)
2. Add generator button & handler in [fetchCustomerOnboardingData.js](js/fetchCustomerOnboardingData.js) (clone warehouse WO pattern)
3. Define payload builder: `buildInvoicePayload(data)` 
4. New page reads localStorage key from query param & renders

**Query additional Supabase data**:
- Follow pattern in `loadEventData()`: await Supabase client → `.from(table).select(...).eq("event_id", eventId)`
- Add result to `data` object; auto-available to form via `jsonData` global
