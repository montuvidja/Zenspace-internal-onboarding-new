/* ============================================
   ZenSpace Operations - Main JavaScript V3
   With Supabase Integration for Section Saving
   Updated: Trucking invoices moved to section level
   ============================================ */

// ============================================
// Global Variables
// ============================================
let currentEventId = null;
let quoteCount = 1;
let truckingCount = 1;
let travelCount = 1;

// ============================================
// Utility Functions
// ============================================

// Show toast notification
function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const iconSVG = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${iconSVG[type] || iconSVG.info}</span>
    <span class="toast-message">${message}</span>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Get event_id from URL parameters
function getEventIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('event_id');
}

// Convert datetime-local value to ISO string for Supabase
function toISODateTime(value) {
  if (!value) return null;
  try {
    return new Date(value).toISOString();
  } catch (e) {
    return null;
  }
}

// Convert ISO string to datetime-local format for form input
function fromISODateTime(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toISOString().slice(0, 16);
  } catch (e) {
    return '';
  }
}

// Convert time string (HH:MM:SS) to input time format (HH:MM)
function fromTimeString(timeString) {
  if (!timeString) return '';
  return timeString.slice(0, 5);
}

// Get array of checked checkbox values
function getCheckedValues(name, container = document) {
  const checkboxes = container.querySelectorAll(`input[name="${name}"]:checked`);
  return Array.from(checkboxes).map(cb => cb.value);
}

// Get radio value
function getRadioValue(name, container = document) {
  const radio = container.querySelector(`input[name="${name}"]:checked`);
  return radio ? radio.value : null;
}

// Get input value
function getInputValue(name, container = document) {
  const input = container.querySelector(`[name="${name}"]`);
  return input ? input.value : null;
}

// Helper: Find container for input (with :has() fallback)
function findContainerForInput(section, inputName) {
  let container = section.querySelector(`.form-group:has(input[name="${inputName}"])`);
  if (!container) {
    const input = section.querySelector(`input[name="${inputName}"]`);
    if (input) {
      container = input.closest('.form-group');
    }
  }
  return container;
}

// ============================================
// Section Data Collection Functions
// ============================================

// Section 1: Pre-planning
function getPreplanningData() {
  const section = document.querySelector('[data-section="preplanning"]');
  return {
    event_id: currentEventId,
    onboarding_complete: section.querySelector('[name="onboarding_complete"]')?.checked || false,
    onboarding_filled_by: getRadioValue('onboarding_filled_by', section),
    onboarding_filled_by_other: getInputValue('onboarding_filled_by_other', section),
    preplanning_installer: getCheckedValues('preplanning_installer', section),
    preplanning_installer_other: getInputValue('preplanning_installer_other', section),
    preplanning_installer_other_email: getInputValue('preplanning_installer_other_email', section),
    warehouse_address: getRadioValue('warehouse_address', section),
    warehouse_address_other: getInputValue('warehouse_address_other', section),
    packing_deadline: toISODateTime(getInputValue('packing_deadline', section)),
    special_instructions: getInputValue('special_instructions_preplanning', section)
  };
}

// Section 2: Artwork & Branding
function getArtworkData() {
  const section = document.querySelector('[data-section="artwork"]');
  return {
    event_id: currentEventId,
    proofs_responsible: getRadioValue('proofs_responsible', section),
    proofs_responsible_other: getInputValue('proofs_responsible_other', section),
    proofs_responsible_other_email: getInputValue('proofs_responsible_other_email', section),
    graphics_upload_link: getInputValue('graphics_upload_link', section),
    proofs_folder_link: getInputValue('proofs_folder_link', section),
    proofs_due_date: getInputValue('proofs_due_date', section) || null,
    special_instructions: getInputValue('special_instructions_artwork', section)
  };
}

// Section 3: Printing (main data)
function getPrintingData() {
  const section = document.querySelector('[data-section="printing"]');
  return {
    event_id: currentEventId,
    assigned_printer: getRadioValue('assigned_printer', section),
    assigned_printer_other: getInputValue('assigned_printer_other', section),
    assigned_printer_other_email: getInputValue('assigned_printer_other_email', section),
    installation_quote: getInputValue('installation_quote', section),
    assigned_graphic_installer: getRadioValue('assigned_graphic_installer', section),
    assigned_graphic_installer_other: getInputValue('assigned_graphic_installer_other', section),
    assigned_graphic_installer_other_email: getInputValue('assigned_graphic_installer_other_email', section),
    printing_start_date: getInputValue('printing_start_date', section) || null,
    installation_date: getInputValue('installation_date', section) || null,
    installation_location: getInputValue('installation_location', section),
    special_instructions: getInputValue('special_instructions_printing', section)
  };
}

// Section 3: Printing Quotes (multiple)
function getPrintingQuotesData() {
  const quotes = [];
  const quoteEntries = document.querySelectorAll('.quote-entry');
  
  quoteEntries.forEach((entry, idx) => {
    const index = parseInt(entry.dataset.index) || (idx + 1);
    quotes.push({
      event_id: currentEventId,
      quote_index: index,
      quote_source: getRadioValue(`quote_source_${index}`, entry),
      quote_source_other: getInputValue(`quote_source_other_${index}`, entry),
      quote_source_other_email: getInputValue(`quote_source_other_${index}_email`, entry),
      quote_price: getInputValue(`quote_price_${index}`, entry)
    });
  });
  
  return quotes;
}

// Section 4: Trucking (multiple entries) - NO invoice fields (moved to meta)
function getTruckingData() {
  const entries = [];
  const truckingEntries = document.querySelectorAll('.trucking-entry');
  
  truckingEntries.forEach((entry, idx) => {
    const index = parseInt(entry.dataset.index) || (idx + 1);
    
    entries.push({
      event_id: currentEventId,
      entry_index: index,
      truck_source: getCheckedValues(`truck_source_${index}`, entry),
      truck_source_other: getInputValue(`truck_source_${index}_other`, entry),
      truck_source_other_email: getInputValue(`truck_source_${index}_other_email`, entry),
      truck_type: getRadioValue(`truck_type_${index}`, entry),
      sub_truck_type: getRadioValue(`sub_truck_type_${index}`, entry),
      truck_size: getInputValue(`truck_size_${index}`, entry),
      truck_quote_enterprise: getInputValue(`truck_quote_enterprise_${index}`, entry),
      truck_quote_axle: getInputValue(`truck_quote_axle_${index}`, entry),
      pickup_datetime: toISODateTime(getInputValue(`pickup_datetime_${index}`, entry)),
      pickup_warehouse: getRadioValue(`pickup_warehouse_${index}`, entry),
      pickup_warehouse_other: getInputValue(`pickup_warehouse_other_${index}`, entry),
      delivery_address: getInputValue(`delivery_address_${index}`, entry),
      delivery_instructions: getInputValue(`delivery_instructions_${index}`, entry),
      driver_name: getInputValue(`driver_name_${index}`, entry),
      driver_mobile: getInputValue(`driver_mobile_${index}`, entry),
      driver_email: getInputValue(`driver_email_${index}`, entry),
      truck_payment_status: getRadioValue(`truck_payment_status_${index}`, entry)
    });
  });
  
  return entries;
}

// Section 4: Trucking Meta (section-level) - WITH FILE URLs
function getTruckingMetaData() {
  const section = document.querySelector('[data-section="trucking"]');
  
  // Get uploaded file data
  const truckingInvoicesData = typeof getUploadedFileData === 'function' 
    ? getUploadedFileData('trucking_invoices') 
    : { urls: [], files: [], folderUrl: '' };
  
  // Extract names from files array
  const fileNames = truckingInvoicesData.files ? truckingInvoicesData.files.map(f => f.name) : [];
  
  return {
    event_id: currentEventId,
    special_instructions: getInputValue('special_instructions_trucking', section),
    // File URLs and Names
    trucking_invoices_urls: truckingInvoicesData.urls && truckingInvoicesData.urls.length > 0 ? truckingInvoicesData.urls : null,
    trucking_invoices_names: fileNames.length > 0 ? fileNames : null,
    trucking_invoices_folder_url: truckingInvoicesData.folderUrl || null
  };
}

// Section 5: Installation & Dismantle
function getInstallationData() {
  const section = document.querySelector('[data-section="installation"]');
  return {
    event_id: currentEventId,
    install_installer: getCheckedValues('install_installer', section),
    install_installer_other: getInputValue('install_installer_other', section),
    install_installer_other_email: getInputValue('install_installer_other_email', section),
    install_location: getInputValue('install_location', section),
    install_special_instructions: getInputValue('installation_special_instructions', section),
    dismantle_installer: getCheckedValues('dismantle_installer', section),
    dismantle_installer_other: getInputValue('dismantle_installer_other', section),
    dismantle_installer_other_email: getInputValue('dismantle_installer_other_email', section),
    dismantle_location: getInputValue('dismantle_location', section),
    dismantle_special_instructions: getInputValue('dismantle_special_instructions', section)
  };
}

// Section 5: Installation Dates (multiple)
function getInstallationDatesData() {
  const dates = [];
  
  // Installation dates
  const installEntries = document.querySelectorAll('.installation-date-entry');
  installEntries.forEach((entry, idx) => {
    const index = parseInt(entry.dataset.index) || (idx + 1);
    dates.push({
      event_id: currentEventId,
      date_type: 'install',
      date_index: index,
      date_value: getInputValue(`install_date_${index}`, entry) || null,
      from_time: getInputValue(`install_from_time_${index}`, entry) || null,
      to_time: getInputValue(`install_to_time_${index}`, entry) || null
    });
  });
  
  // Dismantle dates
  const dismantleEntries = document.querySelectorAll('.dismantle-date-entry');
  dismantleEntries.forEach((entry, idx) => {
    const index = parseInt(entry.dataset.index) || (idx + 1);
    dates.push({
      event_id: currentEventId,
      date_type: 'dismantle',
      date_index: index,
      date_value: getInputValue(`dismantle_date_${index}`, entry) || null,
      from_time: getInputValue(`dismantle_from_time_${index}`, entry) || null,
      to_time: getInputValue(`dismantle_to_time_${index}`, entry) || null
    });
  });
  
  return dates;
}

// Section 6: Post-Event - WITH FILE URLs and Names
function getPosteventData() {
  const section = document.querySelector('[data-section="postevent"]');
  
  // Get uploaded file data
  const damageData = typeof getUploadedFileData === 'function' 
    ? getUploadedFileData('damage_images') 
    : { urls: [], files: [], folderUrl: '' };
  
  const eventImagesData = typeof getUploadedFileData === 'function' 
    ? getUploadedFileData('event_images') 
    : { urls: [], files: [], folderUrl: '' };
  
  // Extract names from files arrays
  const damageNames = damageData.files ? damageData.files.map(f => f.name) : [];
  const eventNames = eventImagesData.files ? eventImagesData.files.map(f => f.name) : [];
  
  return {
    event_id: currentEventId,
    warehouse_receiving: getCheckedValues('warehouse_receiving', section),
    warehouse_receiving_other: getInputValue('warehouse_receiving_other', section),
    warehouse_receiving_other_email: getInputValue('warehouse_receiving_other_email', section),
    return_datetime: toISODateTime(getInputValue('return_datetime', section)),
    return_address: getRadioValue('return_address', section),
    return_address_other: getInputValue('return_address_other_1', section),
    items_damage: getRadioValue('items_damage', section),
    debrief_note: getInputValue('debrief_note', section),
    special_instructions: getInputValue('special_instructions_postevent', section),
    // File URLs and Names
    damage_images_urls: damageData.urls && damageData.urls.length > 0 ? damageData.urls : null,
    damage_images_names: damageNames.length > 0 ? damageNames : null,
    damage_images_folder_url: damageData.folderUrl || null,
    event_images_urls: eventImagesData.urls && eventImagesData.urls.length > 0 ? eventImagesData.urls : null,
    event_images_names: eventNames.length > 0 ? eventNames : null,
    event_images_folder_url: eventImagesData.folderUrl || null
  };
}

// Section 7: Travel (multiple entries)
function getTravelData() {
  const entries = [];
  const travelEntries = document.querySelectorAll('.travel-entry');
  
  travelEntries.forEach((entry, idx) => {
    const index = parseInt(entry.dataset.index) || (idx + 1);
    entries.push({
      event_id: currentEventId,
      traveler_index: index,
      traveler_name: getRadioValue(`traveler_name_${index}`, entry),
      traveler_name_other: getInputValue(`traveler_name_other_${index}`, entry),
      traveler_name_other_email: getInputValue(`traveler_name_other_${index}_email`, entry),
      travel_from: getInputValue(`travel_from_${index}`, entry),
      travel_to: getInputValue(`travel_to_${index}`, entry),
      traveler_from_datetime: toISODateTime(getInputValue(`traveler_from_datetime_${index}`, entry)),
      traveler_to_datetime: toISODateTime(getInputValue(`traveler_to_datetime_${index}`, entry)),
      travel_type: getRadioValue(`travel_type_${index}`, entry),
      // Flight details
      flight_name: getInputValue(`flight_name_${index}`, entry),
      flight_number: getInputValue(`flight_number_${index}`, entry),
      flight_departure: toISODateTime(getInputValue(`flight_departure_${index}`, entry)),
      flight_arrival: toISODateTime(getInputValue(`flight_arrival_${index}`, entry)),
      flight_quote: getInputValue(`flight_quote_${index}`, entry),
      // Car details
      car_company: getInputValue(`car_company_${index}`, entry),
      car_number: getInputValue(`car_number_${index}`, entry),
      car_pickup: toISODateTime(getInputValue(`car_pickup_${index}`, entry)),
      car_dropoff: toISODateTime(getInputValue(`car_dropoff_${index}`, entry)),
      car_pickup_address: getInputValue(`car_pickup_address_${index}`, entry),
      car_dropoff_address: getInputValue(`car_dropoff_address_${index}`, entry),
      car_quote: getInputValue(`car_quote_${index}`, entry),
      // Truck details
      truck_company: getInputValue(`truck_company_${index}`, entry),
      truck_number: getInputValue(`truck_number_${index}`, entry),
      truck_pickup: toISODateTime(getInputValue(`truck_pickup_${index}`, entry)),
      truck_dropoff: toISODateTime(getInputValue(`truck_dropoff_${index}`, entry)),
      truck_pickup_address: getInputValue(`truck_pickup_address_${index}`, entry),
      truck_dropoff_address: getInputValue(`truck_dropoff_address_${index}`, entry),
      truck_quote: getInputValue(`truck_quote_${index}`, entry),
      // Personal
      personal_quote: getInputValue(`personal_quote_${index}`, entry),
      // Hotel details
      hotel_name: getInputValue(`hotel_name_${index}`, entry),
      hotel_location: getInputValue(`hotel_location_${index}`, entry),
      check_in: toISODateTime(getInputValue(`check_in_${index}`, entry)),
      check_out: toISODateTime(getInputValue(`check_out_${index}`, entry)),
      hotel_quote: getInputValue(`hotel_quote_${index}`, entry),
      // Special instructions per traveler
      special_instructions: getInputValue(`special_instructions_travel_${index}`, entry)
    });
  });
  
  return entries;
}

// Section 7: Travel Meta (section-level) - WITH FILE URLs and Names (no special_instructions - moved to per entry)
function getTravelMetaData() {
  const section = document.querySelector('[data-section="travel"]');
  
  // Get uploaded file data
  const travelInvoicesData = typeof getUploadedFileData === 'function' 
    ? getUploadedFileData('travel_invoices') 
    : { urls: [], files: [], folderUrl: '' };
  
  // Extract names from files array
  const fileNames = travelInvoicesData.files ? travelInvoicesData.files.map(f => f.name) : [];
  
  return {
    event_id: currentEventId,
    // File URLs and Names (special_instructions moved to per-traveler entries)
    travel_invoices_urls: travelInvoicesData.urls && travelInvoicesData.urls.length > 0 ? travelInvoicesData.urls : null,
    travel_invoices_names: fileNames.length > 0 ? fileNames : null,
    travel_invoices_folder_url: travelInvoicesData.folderUrl || null
  };
}

// Section 8: COI - WITH FILE URL and Name
function getCOIData() {
  const section = document.querySelector('[data-section="coi"]');
  
  // Get uploaded file data
  const coiData = typeof getUploadedFileData === 'function' 
    ? getUploadedFileData('coi_documents') 
    : { url: '', file: null, folderUrl: '' };
  
  return {
    event_id: currentEventId,
    coi_required: getRadioValue('coi_required', section),
    // File URL and Name
    coi_file_url: coiData.url || null,
    coi_file_name: coiData.file?.name || null,
    coi_folder_url: coiData.folderUrl || null
  };
}

// ============================================
// Supabase Save Functions
// ============================================

// Generic upsert function for single-record tables
async function upsertSectionData(tableName, data, conflictColumn = 'event_id') {
  try {
    const { data: result, error } = await supabase
      .from(tableName)
      .upsert(data, { onConflict: conflictColumn })
      .select();
    
    if (error) throw error;
    return { success: true, data: result };
  } catch (error) {
    console.error(`Error saving to ${tableName}:`, error);
    return { success: false, error: error.message };
  }
}

// Save multiple entries (delete existing and insert new)
async function saveMultipleEntries(tableName, entries, eventId) {
  try {
    // First, delete existing entries for this event
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq('event_id', eventId);
    
    if (deleteError) throw deleteError;
    
    // Then insert new entries (if any)
    if (entries.length > 0) {
      const { data: result, error: insertError } = await supabase
        .from(tableName)
        .insert(entries)
        .select();
      
      if (insertError) throw insertError;
      return { success: true, data: result };
    }
    
    return { success: true, data: [] };
  } catch (error) {
    console.error(`Error saving to ${tableName}:`, error);
    return { success: false, error: error.message };
  }
}

// Section-specific save functions
async function savePreplanning() {
  if (!currentEventId) {
    showToast('No event selected. Please select an event first.', 'error');
    return false;
  }
  
  const data = getPreplanningData();
  const result = await upsertSectionData('internal_preplanning', data);

  console.log('Preplanning save result:', result);
  
  if (result.success) {
    updateSaveStatus('preplanning', true);
    showToast('Pre-planning saved successfully!', 'success');
  } else {
    showToast(`Error saving: ${result.error}`, 'error');
  }
  
  return result.success;
}

async function saveArtwork() {
  if (!currentEventId) {
    showToast('No event selected. Please select an event first.', 'error');
    return false;
  }
  
  const data = getArtworkData();
  const result = await upsertSectionData('internal_artwork', data);
  console.log('Artwork save result:', result);
  
  if (result.success) {
    updateSaveStatus('artwork', true);
    showToast('Artwork & Branding saved successfully!', 'success');
  } else {
    showToast(`Error saving: ${result.error}`, 'error');
  }
  
  return result.success;
}

async function savePrinting() {
  if (!currentEventId) {
    showToast('No event selected. Please select an event first.', 'error');
    return false;
  }
  
  // Save main printing data
  const mainData = getPrintingData();
  const mainResult = await upsertSectionData('internal_printing', mainData);
  
  if (!mainResult.success) {
    showToast(`Error saving printing: ${mainResult.error}`, 'error');
    return false;
  }
  
  // Save quotes
  const quotesData = getPrintingQuotesData();
  const quotesResult = await saveMultipleEntries('internal_printing_quotes', quotesData, currentEventId);
  
  if (quotesResult.success) {
    updateSaveStatus('printing', true);
    showToast('Printing saved successfully!', 'success');
  } else {
    showToast(`Error saving quotes: ${quotesResult.error}`, 'error');
  }
  
  return quotesResult.success;
}

async function saveTrucking() {
  if (!currentEventId) {
    showToast('No event selected. Please select an event first.', 'error');
    return false;
  }
  
  // Save trucking entries
  const entries = getTruckingData();
  const result = await saveMultipleEntries('internal_trucking', entries, currentEventId);
  
  if (!result.success) {
    showToast(`Error saving trucking: ${result.error}`, 'error');
    return false;
  }
  
  // Save trucking meta (including invoices)
  const metaData = getTruckingMetaData();
  const metaResult = await upsertSectionData('internal_trucking_meta', metaData);
  
  if (metaResult.success) {
    updateSaveStatus('trucking', true);
    showToast('Trucking & Logistics saved successfully!', 'success');
  } else {
    showToast(`Error saving trucking meta: ${metaResult.error}`, 'error');
  }
  
  return metaResult.success;
}

async function saveInstallation() {
  if (!currentEventId) {
    showToast('No event selected. Please select an event first.', 'error');
    return false;
  }
  
  // Save main installation data
  const mainData = getInstallationData();
  const mainResult = await upsertSectionData('internal_installation', mainData);
  
  if (!mainResult.success) {
    showToast(`Error saving installation: ${mainResult.error}`, 'error');
    return false;
  }
  
  // Save installation dates
  const datesData = getInstallationDatesData();
  const datesResult = await saveMultipleEntries('internal_installation_dates', datesData, currentEventId);
  
  if (datesResult.success) {
    updateSaveStatus('installation', true);
    showToast('Installation & Dismantle saved successfully!', 'success');
  } else {
    showToast(`Error saving dates: ${datesResult.error}`, 'error');
  }
  
  return datesResult.success;
}

async function savePostevent() {
  if (!currentEventId) {
    showToast('No event selected. Please select an event first.', 'error');
    return false;
  }
  
  const data = getPosteventData();
  const result = await upsertSectionData('internal_postevent', data);
  
  if (result.success) {
    updateSaveStatus('postevent', true);
    showToast('Post-Event saved successfully!', 'success');
  } else {
    showToast(`Error saving: ${result.error}`, 'error');
  }
  
  return result.success;
}

async function saveTravel() {
  if (!currentEventId) {
    showToast('No event selected. Please select an event first.', 'error');
    return false;
  }
  
  // Save travel entries
  const entries = getTravelData();
  const result = await saveMultipleEntries('internal_travel', entries, currentEventId);
  
  if (!result.success) {
    showToast(`Error saving travel: ${result.error}`, 'error');
    return false;
  }
  
  // Save travel meta
  const metaData = getTravelMetaData();
  const metaResult = await upsertSectionData('internal_travel_meta', metaData);
  
  if (metaResult.success) {
    updateSaveStatus('travel', true);
    showToast('Travel & Lodging saved successfully!', 'success');
  } else {
    showToast(`Error saving travel meta: ${metaResult.error}`, 'error');
  }
  
  return metaResult.success;
}

async function saveCOI() {
  if (!currentEventId) {
    showToast('No event selected. Please select an event first.', 'error');
    return false;
  }
  
  const data = getCOIData();
  const result = await upsertSectionData('internal_coi', data);
  
  if (result.success) {
    updateSaveStatus('coi', true);
    showToast('COI saved successfully!', 'success');
  } else {
    showToast(`Error saving: ${result.error}`, 'error');
  }
  
  return result.success;
}

// Main save section dispatcher
async function saveSection(sectionId) {
  const saveButton = document.querySelector(`.section-save-btn[data-section="${sectionId}"]`);
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.innerHTML = `
      <svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
      </svg>
      <span>Saving...</span>
    `;
  }
  
  let success = false;
  
  switch (sectionId) {
    case 'preplanning':
      success = await savePreplanning();
      break;
    case 'artwork':
      success = await saveArtwork();
      break;
    case 'printing':
      success = await savePrinting();
      break;
    case 'trucking':
      success = await saveTrucking();
      break;
    case 'installation':
      success = await saveInstallation();
      break;
    case 'postevent':
      success = await savePostevent();
      break;
    case 'travel':
      success = await saveTravel();
      break;
    case 'coi':
      success = await saveCOI();
      break;
    default:
      showToast('Unknown section', 'error');
  }
  
  if (saveButton) {
    saveButton.disabled = false;
    saveButton.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
      <span>Save Section</span>
    `;
  }
  
  return success;
}

// Update save status indicator
function updateSaveStatus(sectionId, saved) {
  const section = document.querySelector(`[data-section="${sectionId}"]`);
  const saveStatus = section?.querySelector('.save-status');
  
  if (saveStatus) {
    if (saved) {
      saveStatus.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <span>Saved just now</span>
      `;
      saveStatus.classList.add('saved');
    } else {
      saveStatus.innerHTML = '<span>Not saved</span>';
      saveStatus.classList.remove('saved');
    }
  }
}

// ============================================
// Load Data Functions
// ============================================

// Load all section data for an event
async function loadAllSectionData(eventId) {
  if (!eventId) return;
  
  currentEventId = eventId;
  
  // Clear uploaded file data before loading new event
  if (typeof clearUploadedFileData === 'function') {
    clearUploadedFileData();
  }
  
  try {
    // Load all sections in parallel
    const [
      preplanning,
      artwork,
      printing,
      printingQuotes,
      trucking,
      truckingMeta,
      installation,
      installationDates,
      postevent,
      travel,
      travelMeta,
      coi
    ] = await Promise.all([
      supabase.from('internal_preplanning').select('*').eq('event_id', eventId).single(),
      supabase.from('internal_artwork').select('*').eq('event_id', eventId).single(),
      supabase.from('internal_printing').select('*').eq('event_id', eventId).single(),
      supabase.from('internal_printing_quotes').select('*').eq('event_id', eventId).order('quote_index'),
      supabase.from('internal_trucking').select('*').eq('event_id', eventId).order('entry_index'),
      supabase.from('internal_trucking_meta').select('*').eq('event_id', eventId).single(),
      supabase.from('internal_installation').select('*').eq('event_id', eventId).single(),
      supabase.from('internal_installation_dates').select('*').eq('event_id', eventId).order('date_index'),
      supabase.from('internal_postevent').select('*').eq('event_id', eventId).single(),
      supabase.from('internal_travel').select('*').eq('event_id', eventId).order('traveler_index'),
      supabase.from('internal_travel_meta').select('*').eq('event_id', eventId).single(),
      supabase.from('internal_coi').select('*').eq('event_id', eventId).single()
    ]);
    
    // Populate forms with loaded data
    if (preplanning.data) populatePreplanning(preplanning.data);
    if (artwork.data) populateArtwork(artwork.data);
    if (printing.data) populatePrinting(printing.data);
    if (printingQuotes.data?.length) populatePrintingQuotes(printingQuotes.data);
    if (trucking.data?.length) populateTrucking(trucking.data);
    if (truckingMeta.data) populateTruckingMeta(truckingMeta.data);
    if (installation.data) populateInstallation(installation.data);
    if (installationDates.data?.length) populateInstallationDates(installationDates.data);
    if (postevent.data) populatePostevent(postevent.data);
    if (travel.data?.length) populateTravel(travel.data);
    if (travelMeta.data) populateTravelMeta(travelMeta.data);
    if (coi.data) populateCOI(coi.data);
    
    console.log('All section data loaded successfully');
  } catch (error) {
    console.error('Error loading section data:', error);
  }
}

// Populate form helpers
function setInputValue(name, value, container = document) {
  const input = container.querySelector(`[name="${name}"]`);
  if (input) input.value = value || '';
}

function setRadioValue(name, value, container = document) {
  if (!value) return;
  const radio = container.querySelector(`input[name="${name}"][value="${value}"]`);
  if (radio) {
    radio.checked = true;
    radio.closest('.radio-item')?.classList.add('selected');
    radio.closest('.address-option')?.classList.add('selected');
    
    if (value === 'other' || value === 'third_party') {
      const wrapper = radio.closest('.radio-group, .address-options');
      const otherInputs = wrapper?.querySelectorAll('.other-input');
      if (otherInputs && otherInputs.length) {
        otherInputs.forEach((oi, i) => {
          oi.disabled = false;
          if (i === 0) oi.focus();
        });
      }
      const addressOther = wrapper?.querySelector('.address-other-input');
      if (addressOther) addressOther.style.display = 'block';
    }
  }
}

function setCheckboxValues(name, values, container = document) {
  if (!values || !Array.isArray(values)) return;
  values.forEach(value => {
    const checkbox = container.querySelector(`input[name="${name}"][value="${value}"]`);
    if (checkbox) {
      checkbox.checked = true;
      checkbox.closest('.checkbox-item')?.classList.add('checked');
      
      if (value === 'other') {
        const wrapper = checkbox.closest('.other-input-wrapper');
        const otherInputs = wrapper?.querySelectorAll('.other-input');
        if (otherInputs && otherInputs.length) {
          otherInputs.forEach((oi, i) => {
            oi.disabled = false;
            if (i === 0) oi.focus();
          });
        }
      }
    }
  });
}

// Section population functions
function populatePreplanning(data) {
  const section = document.querySelector('[data-section="preplanning"]');
  if (!section) return;
  
  const checkbox = section.querySelector('[name="onboarding_complete"]');
  if (checkbox) {
    checkbox.checked = data.onboarding_complete;
    checkbox.closest('.single-checkbox')?.classList.toggle('checked', data.onboarding_complete);
  }
  
  setRadioValue('onboarding_filled_by', data.onboarding_filled_by, section);
  setInputValue('onboarding_filled_by_other', data.onboarding_filled_by_other, section);
  setCheckboxValues('preplanning_installer', data.preplanning_installer, section);
  setInputValue('preplanning_installer_other', data.preplanning_installer_other, section);
  setInputValue('preplanning_installer_other_email', data.preplanning_installer_other_email, section);
  setRadioValue('warehouse_address', data.warehouse_address, section);
  setInputValue('warehouse_address_other', data.warehouse_address_other, section);
  setInputValue('packing_deadline', fromISODateTime(data.packing_deadline), section);
  setInputValue('special_instructions_preplanning', data.special_instructions, section);
  
  if (data.warehouse_address === 'other') {
    const otherDiv = section.querySelector('.address-other-input');
    if (otherDiv) otherDiv.style.display = 'block';
  }
  
  updateSaveStatus('preplanning', true);
}

function populateArtwork(data) {
  const section = document.querySelector('[data-section="artwork"]');
  if (!section) return;
  
  setRadioValue('proofs_responsible', data.proofs_responsible, section);
  setInputValue('proofs_responsible_other', data.proofs_responsible_other, section);
  setInputValue('proofs_responsible_other_email', data.proofs_responsible_other_email, section);
  setInputValue('graphics_upload_link', data.graphics_upload_link, section);
  setInputValue('proofs_folder_link', data.proofs_folder_link, section);
  setInputValue('proofs_due_date', data.proofs_due_date, section);
  setInputValue('special_instructions_artwork', data.special_instructions, section);
  
  updateSaveStatus('artwork', true);
}

function populatePrinting(data) {
  const section = document.querySelector('[data-section="printing"]');
  if (!section) return;
  
  setRadioValue('assigned_printer', data.assigned_printer, section);
  setInputValue('assigned_printer_other', data.assigned_printer_other, section);
  setInputValue('assigned_printer_other_email', data.assigned_printer_other_email, section);
  setInputValue('installation_quote', data.installation_quote, section);
  setRadioValue('assigned_graphic_installer', data.assigned_graphic_installer, section);
  setInputValue('assigned_graphic_installer_other', data.assigned_graphic_installer_other, section);
  setInputValue('assigned_graphic_installer_other_email', data.assigned_graphic_installer_other_email, section);
  setInputValue('printing_start_date', data.printing_start_date, section);
  setInputValue('installation_date', data.installation_date, section);
  setInputValue('installation_location', data.installation_location, section);
  setInputValue('special_instructions_printing', data.special_instructions, section);
  
  updateSaveStatus('printing', true);
}

function populatePrintingQuotes(quotes) {
  const container = document.getElementById('printingQuotes');
  if (!container) return;
  
  const existingEntries = container.querySelectorAll('.quote-entry');
  existingEntries.forEach((entry, idx) => {
    if (idx > 0) entry.remove();
  });
  
  quotes.forEach((quote, idx) => {
    if (idx > 0) {
      quoteCount++;
      const entry = createQuoteEntry(quote.quote_index);
      container.appendChild(entry);
      initializeRadios();
    }
    
    const entry = container.querySelector(`.quote-entry[data-index="${quote.quote_index}"]`);
    if (entry) {
      setRadioValue(`quote_source_${quote.quote_index}`, quote.quote_source, entry);
      setInputValue(`quote_source_other_${quote.quote_index}`, quote.quote_source_other, entry);
      setInputValue(`quote_source_other_${quote.quote_index}_email`, quote.quote_source_other_email, entry);
      setInputValue(`quote_price_${quote.quote_index}`, quote.quote_price, entry);
    }
  });
}

// Populate Trucking entries (NO invoice fields)
function populateTrucking(entries) {
  const container = document.getElementById('truckingEntries');
  if (!container) return;
  
  const existingEntries = container.querySelectorAll('.trucking-entry');
  existingEntries.forEach((entry, idx) => {
    if (idx > 0) entry.remove();
  });
  
  entries.forEach((data, idx) => {
    if (idx > 0) {
      truckingCount++;
      const entry = createTruckingEntry(data.entry_index);
      container.appendChild(entry);
      initializeCheckboxes();
      initializeRadios();
    }
    
    const entry = container.querySelector(`.trucking-entry[data-index="${data.entry_index}"]`);
    if (entry) {
      setCheckboxValues(`truck_source_${data.entry_index}`, data.truck_source, entry);
      setInputValue(`truck_source_${data.entry_index}_other`, data.truck_source_other, entry);
      setInputValue(`truck_source_${data.entry_index}_other_email`, data.truck_source_other_email, entry);
      setRadioValue(`truck_type_${data.entry_index}`, data.truck_type, entry);
      setRadioValue(`sub_truck_type_${data.entry_index}`, data.sub_truck_type, entry);
      setInputValue(`truck_size_${data.entry_index}`, data.truck_size, entry);
      setInputValue(`truck_quote_enterprise_${data.entry_index}`, data.truck_quote_enterprise, entry);
      setInputValue(`truck_quote_axle_${data.entry_index}`, data.truck_quote_axle, entry);
      setInputValue(`pickup_datetime_${data.entry_index}`, fromISODateTime(data.pickup_datetime), entry);
      setRadioValue(`pickup_warehouse_${data.entry_index}`, data.pickup_warehouse, entry);
      setInputValue(`pickup_warehouse_other_${data.entry_index}`, data.pickup_warehouse_other, entry);
      setInputValue(`delivery_address_${data.entry_index}`, data.delivery_address, entry);
      setInputValue(`delivery_instructions_${data.entry_index}`, data.delivery_instructions, entry);
      setInputValue(`driver_name_${data.entry_index}`, data.driver_name, entry);
      setInputValue(`driver_mobile_${data.entry_index}`, data.driver_mobile, entry);
      setInputValue(`driver_email_${data.entry_index}`, data.driver_email, entry);
      setRadioValue(`truck_payment_status_${data.entry_index}`, data.truck_payment_status, entry);
      
      if (data.pickup_warehouse === 'other') {
        const otherDiv = entry.querySelector('.address-other-input');
        if (otherDiv) otherDiv.style.display = 'block';
      }
    }
  });
  
  updateSaveStatus('trucking', true);
}

// Populate Trucking Meta - WITH FILE DISPLAY
function populateTruckingMeta(data) {
  const section = document.querySelector('[data-section="trucking"]');
  if (!section) return;
  
  setInputValue('special_instructions_trucking', data.special_instructions, section);
  
  // Display uploaded trucking invoices
  if (data.trucking_invoices_urls || data.trucking_invoices_folder_url) {
    const invoicesInput = section.querySelector('input[name="trucking_invoices"]');
    const invoicesContainer = invoicesInput?.closest('.form-group');
    
    if (invoicesContainer) {
      // Build files array with names
      const urls = data.trucking_invoices_urls || [];
      const names = data.trucking_invoices_names || [];
      const files = urls.map((url, idx) => ({
        url: url,
        name: names[idx] || `File ${idx + 1}`
      }));
      
      // Store in uploadedFileData for saving
      if (typeof setUploadedFileData === 'function') {
        setUploadedFileData('trucking_invoices', {
          urls: urls,
          files: files,
          folderUrl: data.trucking_invoices_folder_url || ''
        });
      }
      
      // Display the files
      if (typeof displayUploadedFiles === 'function') {
        displayUploadedFiles(invoicesContainer, urls, data.trucking_invoices_folder_url, 'trucking_invoices');
      }
    }
  }
}

function populateInstallation(data) {
  const section = document.querySelector('[data-section="installation"]');
  if (!section) return;
  
  setCheckboxValues('install_installer', data.install_installer, section);
  setInputValue('install_installer_other', data.install_installer_other, section);
  setInputValue('install_installer_other_email', data.install_installer_other_email, section);
  setInputValue('install_location', data.install_location, section);
  setInputValue('installation_special_instructions', data.install_special_instructions, section);
  setCheckboxValues('dismantle_installer', data.dismantle_installer, section);
  setInputValue('dismantle_installer_other', data.dismantle_installer_other, section);
  setInputValue('dismantle_installer_other_email', data.dismantle_installer_other_email, section);
  setInputValue('dismantle_location', data.dismantle_location, section);
  setInputValue('dismantle_special_instructions', data.dismantle_special_instructions, section);
  
  updateSaveStatus('installation', true);
}

function populateInstallationDates(datesData) {
  const installDates = datesData.filter(d => d.date_type === 'install');
  const dismantleDates = datesData.filter(d => d.date_type === 'dismantle');
  
  const installContainer = document.getElementById('installationDates');
  if (installContainer && installDates.length > 0) {
    const existingEntries = installContainer.querySelectorAll('.installation-date-entry');
    existingEntries.forEach((entry, idx) => {
      if (idx > 0) entry.remove();
    });
    
    installDates.forEach((data, idx) => {
      if (idx > 0) {
        const entry = document.createElement('div');
        entry.className = 'installation-date-entry';
        entry.dataset.index = data.date_index;
        entry.innerHTML = `
          <div class="entry-header">
            <div class="entry-number">
              <span class="entry-badge">${data.date_index}</span>
              <span class="entry-label">Installation Date #${data.date_index}</span>
            </div>
            <button type="button" class="remove-entry-btn" onclick="removeEntry(this)" aria-label="Remove installation date">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date</label>
              <input type="date" class="form-input" name="install_date_${data.date_index}">
            </div>
            <div class="form-group">
              <label class="form-label">From Time</label>
              <input type="time" class="form-input" name="install_from_time_${data.date_index}">
            </div>
            <div class="form-group">
              <label class="form-label">To Time</label>
              <input type="time" class="form-input" name="install_to_time_${data.date_index}">
            </div>
          </div>
        `;
        installContainer.appendChild(entry);
      }
      
      const entry = installContainer.querySelector(`.installation-date-entry[data-index="${data.date_index}"]`);
      if (entry) {
        setInputValue(`install_date_${data.date_index}`, data.date_value, entry);
        setInputValue(`install_from_time_${data.date_index}`, fromTimeString(data.from_time), entry);
        setInputValue(`install_to_time_${data.date_index}`, fromTimeString(data.to_time), entry);
      }
    });
    
    updateInstallationRemoveButtons();
  }
  
  const dismantleContainer = document.getElementById('dismantleDates');
  if (dismantleContainer && dismantleDates.length > 0) {
    const existingEntries = dismantleContainer.querySelectorAll('.dismantle-date-entry');
    existingEntries.forEach((entry, idx) => {
      if (idx > 0) entry.remove();
    });
    
    dismantleDates.forEach((data, idx) => {
      if (idx > 0) {
        const entry = document.createElement('div');
        entry.className = 'dismantle-date-entry';
        entry.dataset.index = data.date_index;
        entry.innerHTML = `
          <div class="entry-header">
            <div class="entry-number">
              <span class="entry-badge">${data.date_index}</span>
              <span class="entry-label">Dismantle Date #${data.date_index}</span>
            </div>
            <button type="button" class="remove-entry-btn" onclick="removeEntry(this)" aria-label="Remove dismantle date">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date</label>
              <input type="date" class="form-input" name="dismantle_date_${data.date_index}">
            </div>
            <div class="form-group">
              <label class="form-label">From Time</label>
              <input type="time" class="form-input" name="dismantle_from_time_${data.date_index}">
            </div>
            <div class="form-group">
              <label class="form-label">To Time</label>
              <input type="time" class="form-input" name="dismantle_to_time_${data.date_index}">
            </div>
          </div>
        `;
        dismantleContainer.appendChild(entry);
      }
      
      const entry = dismantleContainer.querySelector(`.dismantle-date-entry[data-index="${data.date_index}"]`);
      if (entry) {
        setInputValue(`dismantle_date_${data.date_index}`, data.date_value, entry);
        setInputValue(`dismantle_from_time_${data.date_index}`, fromTimeString(data.from_time), entry);
        setInputValue(`dismantle_to_time_${data.date_index}`, fromTimeString(data.to_time), entry);
      }
    });
    
    updateDismantleRemoveButtons();
  }
}

// Populate Post-Event - WITH FILE DISPLAY and Names
function populatePostevent(data) {
  const section = document.querySelector('[data-section="postevent"]');
  if (!section) return;
  
  setCheckboxValues('warehouse_receiving', data.warehouse_receiving, section);
  setInputValue('warehouse_receiving_other', data.warehouse_receiving_other, section);
  setInputValue('warehouse_receiving_other_email', data.warehouse_receiving_other_email, section);
  setInputValue('return_datetime', fromISODateTime(data.return_datetime), section);
  setRadioValue('return_address', data.return_address, section);
  setInputValue('return_address_other_1', data.return_address_other, section);
  setRadioValue('items_damage', data.items_damage, section);
  setInputValue('debrief_note', data.debrief_note, section);
  setInputValue('special_instructions_postevent', data.special_instructions, section);
  
  if (data.return_address === 'other') {
    const otherDiv = section.querySelector('.address-other-input');
    if (otherDiv) otherDiv.style.display = 'block';
  }
  
  if (data.items_damage === 'yes') {
    const damageImagesContainer = document.getElementById('damageImagesContainer');
    if (damageImagesContainer) damageImagesContainer.style.display = 'block';
  }
  
  // Display uploaded damage images
  if (data.damage_images_urls || data.damage_images_folder_url) {
    const damageInput = section.querySelector('input[name="damage_images"]');
    const damageContainer = damageInput?.closest('.form-group');
    
    if (damageContainer) {
      // Build files array with names
      const urls = data.damage_images_urls || [];
      const names = data.damage_images_names || [];
      const files = urls.map((url, idx) => ({
        url: url,
        name: names[idx] || `File ${idx + 1}`
      }));
      
      if (typeof setUploadedFileData === 'function') {
        setUploadedFileData('damage_images', {
          urls: urls,
          files: files,
          folderUrl: data.damage_images_folder_url || ''
        });
      }
      if (typeof displayUploadedFiles === 'function') {
        displayUploadedFiles(damageContainer, urls, data.damage_images_folder_url, 'damage_images');
      }
    }
  }
  
  // Display uploaded event images
  if (data.event_images_urls || data.event_images_folder_url) {
    const eventInput = section.querySelector('input[name="event_images"]');
    const eventImagesContainer = eventInput?.closest('.form-group');
    
    if (eventImagesContainer) {
      // Build files array with names
      const urls = data.event_images_urls || [];
      const names = data.event_images_names || [];
      const files = urls.map((url, idx) => ({
        url: url,
        name: names[idx] || `File ${idx + 1}`
      }));
      
      if (typeof setUploadedFileData === 'function') {
        setUploadedFileData('event_images', {
          urls: urls,
          files: files,
          folderUrl: data.event_images_folder_url || ''
        });
      }
      if (typeof displayUploadedFiles === 'function') {
        displayUploadedFiles(eventImagesContainer, urls, data.event_images_folder_url, 'event_images');
      }
    }
  }
  
  updateSaveStatus('postevent', true);
}

function populateTravel(entries) {
  const container = document.getElementById('travelEntries');
  if (!container) return;
  
  const existingEntries = container.querySelectorAll('.travel-entry');
  existingEntries.forEach((entry, idx) => {
    if (idx > 0) entry.remove();
  });
  
  entries.forEach((data, idx) => {
    if (idx > 0) {
      travelCount++;
      const entry = createTravelEntry(data.traveler_index);
      container.appendChild(entry);
      initializeRadios();
    }
    
    const entry = container.querySelector(`.travel-entry[data-index="${data.traveler_index}"]`);
    if (entry) {
      setRadioValue(`traveler_name_${data.traveler_index}`, data.traveler_name, entry);
      setInputValue(`traveler_name_other_${data.traveler_index}`, data.traveler_name_other, entry);
      setInputValue(`traveler_name_other_${data.traveler_index}_email`, data.traveler_name_other_email, entry);
      setInputValue(`travel_from_${data.traveler_index}`, data.travel_from, entry);
      setInputValue(`travel_to_${data.traveler_index}`, data.travel_to, entry);
      setInputValue(`traveler_from_datetime_${data.traveler_index}`, fromISODateTime(data.traveler_from_datetime), entry);
      setInputValue(`traveler_to_datetime_${data.traveler_index}`, fromISODateTime(data.traveler_to_datetime), entry);
      setRadioValue(`travel_type_${data.traveler_index}`, data.travel_type, entry);
      
      if (data.travel_type) {
        const subsections = entry.querySelectorAll('.travel-subsection[data-travel-type]');
        subsections.forEach(sub => {
          sub.style.display = sub.dataset.travelType === data.travel_type ? 'block' : 'none';
        });
      }
      
      setInputValue(`flight_name_${data.traveler_index}`, data.flight_name, entry);
      setInputValue(`flight_number_${data.traveler_index}`, data.flight_number, entry);
      setInputValue(`flight_departure_${data.traveler_index}`, fromISODateTime(data.flight_departure), entry);
      setInputValue(`flight_arrival_${data.traveler_index}`, fromISODateTime(data.flight_arrival), entry);
      setInputValue(`flight_quote_${data.traveler_index}`, data.flight_quote, entry);
      setInputValue(`car_company_${data.traveler_index}`, data.car_company, entry);
      setInputValue(`car_number_${data.traveler_index}`, data.car_number, entry);
      setInputValue(`car_pickup_${data.traveler_index}`, fromISODateTime(data.car_pickup), entry);
      setInputValue(`car_dropoff_${data.traveler_index}`, fromISODateTime(data.car_dropoff), entry);
      setInputValue(`car_pickup_address_${data.traveler_index}`, data.car_pickup_address, entry);
      setInputValue(`car_dropoff_address_${data.traveler_index}`, data.car_dropoff_address, entry);
      setInputValue(`car_quote_${data.traveler_index}`, data.car_quote, entry);
      setInputValue(`truck_company_${data.traveler_index}`, data.truck_company, entry);
      setInputValue(`truck_number_${data.traveler_index}`, data.truck_number, entry);
      setInputValue(`truck_pickup_${data.traveler_index}`, fromISODateTime(data.truck_pickup), entry);
      setInputValue(`truck_dropoff_${data.traveler_index}`, fromISODateTime(data.truck_dropoff), entry);
      setInputValue(`truck_pickup_address_${data.traveler_index}`, data.truck_pickup_address, entry);
      setInputValue(`truck_dropoff_address_${data.traveler_index}`, data.truck_dropoff_address, entry);
      setInputValue(`truck_quote_${data.traveler_index}`, data.truck_quote, entry);
      setInputValue(`personal_quote_${data.traveler_index}`, data.personal_quote, entry);
      setInputValue(`hotel_name_${data.traveler_index}`, data.hotel_name, entry);
      setInputValue(`hotel_location_${data.traveler_index}`, data.hotel_location, entry);
      setInputValue(`check_in_${data.traveler_index}`, fromISODateTime(data.check_in), entry);
      setInputValue(`check_out_${data.traveler_index}`, fromISODateTime(data.check_out), entry);
      setInputValue(`hotel_quote_${data.traveler_index}`, data.hotel_quote, entry);
      // Special instructions per traveler
      setInputValue(`special_instructions_travel_${data.traveler_index}`, data.special_instructions, entry);
    }
  });
  
  initializeTravelType();
  updateSaveStatus('travel', true);
}

// Populate Travel Meta - WITH FILE DISPLAY and Names (no special_instructions - moved to per entry)
function populateTravelMeta(data) {
  const section = document.querySelector('[data-section="travel"]');
  if (!section) return;
  
  if (data.travel_invoices_urls || data.travel_invoices_folder_url) {
    const invoicesInput = section.querySelector('input[name="travel_invoices"]');
    const invoicesContainer = invoicesInput?.closest('.form-group');
    
    if (invoicesContainer) {
      // Build files array with names
      const urls = data.travel_invoices_urls || [];
      const names = data.travel_invoices_names || [];
      const files = urls.map((url, idx) => ({
        url: url,
        name: names[idx] || `File ${idx + 1}`
      }));
      
      if (typeof setUploadedFileData === 'function') {
        setUploadedFileData('travel_invoices', {
          urls: urls,
          files: files,
          folderUrl: data.travel_invoices_folder_url || ''
        });
      }
      if (typeof displayUploadedFiles === 'function') {
        displayUploadedFiles(invoicesContainer, urls, data.travel_invoices_folder_url, 'travel_invoices');
      }
    }
  }
}

// Populate COI - WITH FILE DISPLAY and Name
function populateCOI(data) {
  const section = document.querySelector('[data-section="coi"]');
  if (!section) return;
  
  setRadioValue('coi_required', data.coi_required, section);
  
  const wrapper = document.querySelector('.coi-file-wrapper');
  if (wrapper) {
    wrapper.style.display = data.coi_required === 'yes' ? 'block' : 'none';
  }
  
  if (data.coi_file_url || data.coi_folder_url) {
    const coiInput = section.querySelector('input[name="coi_file"]');
    const coiContainer = coiInput?.closest('.form-group') || wrapper;
    
    if (coiContainer) {
      // Build file object with name
      const file = data.coi_file_url ? {
        url: data.coi_file_url,
        name: data.coi_file_name || 'COI Document'
      } : null;
      
      if (typeof setUploadedFileData === 'function') {
        setUploadedFileData('coi_documents', {
          url: data.coi_file_url || '',
          file: file,
          folderUrl: data.coi_folder_url || ''
        });
      }
      if (typeof displaySingleUploadedFile === 'function') {
        displaySingleUploadedFile(coiContainer, data.coi_file_url, data.coi_folder_url, 'coi_documents');
      }
    }
  }
  
  updateSaveStatus('coi', true);
}

// ============================================
// UI Initialization Functions
// ============================================

function initializeAccordions() {
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const section = header.closest('.section-card');
      const isExpanded = section.classList.contains('expanded');
      section.classList.toggle('expanded');
      section.classList.toggle('active', !isExpanded);
    });
  });
}

function initializeCheckboxes() {
  document.querySelectorAll('.checkbox-item').forEach(item => {
    if (item.dataset.initialized) return;
    item.dataset.initialized = 'true';
    
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const checkbox = item.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        item.classList.toggle('checked', checkbox.checked);
        
        const wrapper = item.closest('.other-input-wrapper');
        if (wrapper) {
          const otherInputs = wrapper.querySelectorAll('.other-input');
          otherInputs.forEach(oi => {
            oi.disabled = !checkbox.checked;
            if (checkbox.checked) oi.focus();
          });
        }
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
  
  document.querySelectorAll('.single-checkbox').forEach(item => {
    if (item.dataset.initialized) return;
    item.dataset.initialized = 'true';
    
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const checkbox = item.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        item.classList.toggle('checked', checkbox.checked);
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
}

function initializeRadios() {
  document.querySelectorAll('.radio-item').forEach(item => {
    if (item.dataset.initialized) return;
    item.dataset.initialized = 'true';
    
    item.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const radio = item.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        const group = item.closest('.radio-group');
        if (group) {
          group.querySelectorAll('.radio-item').forEach(r => r.classList.remove('selected'));
        }
        item.classList.add('selected');
        
        const groupWrapper = item.closest('.radio-group');
        if (groupWrapper) {
          const otherInputs = groupWrapper.querySelectorAll('.other-input');
          if (otherInputs && otherInputs.length) {
            const isOther = radio.value === 'other' || radio.value === 'third_party';
            otherInputs.forEach((oi, i) => {
              oi.disabled = !isOther;
              if (isOther && i === 0) oi.focus();
            });
          }
        }
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
  
  document.querySelectorAll('.address-option').forEach(option => {
    if (option.dataset.initialized) return;
    option.dataset.initialized = 'true';
    
    option.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const radio = option.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        const container = option.closest('.address-options');
        if (container) {
          container.querySelectorAll('.address-option').forEach(opt => opt.classList.remove('selected'));
          option.classList.add('selected');
          const otherInput = container.querySelector('.address-other-input');
          if (otherInput) {
            otherInput.style.display = radio.value === 'other' ? 'block' : 'none';
          }
        }
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
}

function initializeCOI() {
  const wrapper = document.querySelector('.coi-file-wrapper');
  const radios = document.querySelectorAll('input[name="coi_required"]');
  if (!radios || radios.length === 0) return;

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (!wrapper) return;
      if (radio.checked && radio.value === 'yes') {
        wrapper.style.display = 'block';
      } else if (radio.checked && radio.value === 'no') {
        wrapper.style.display = 'none';
        const fileInput = wrapper.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';
      }
    });
  });

  const selected = document.querySelector('input[name="coi_required"]:checked');
  if (selected && wrapper) {
    wrapper.style.display = selected.value === 'yes' ? 'block' : 'none';
  }
}

function initializeTravelType() {
  document.querySelectorAll('.travel-entry').forEach(entry => {
    const index = entry.dataset.index || '1';
    const radios = entry.querySelectorAll(`input[name="travel_type_${index}"]`);
    if (!radios || radios.length === 0) return;

    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        const subsections = entry.querySelectorAll('.travel-subsection[data-travel-type]');
        subsections.forEach(subsection => {
          subsection.style.display = 'none';
        });
        const selectedType = radio.value;
        const targetSubsection = entry.querySelector(`.travel-subsection[data-travel-type="${selectedType}"]`);
        if (targetSubsection) {
          targetSubsection.style.display = 'block';
        }
      });
    });

    const selected = entry.querySelector(`input[name="travel_type_${index}"]:checked`);
    if (!selected) {
      const subsections = entry.querySelectorAll('.travel-subsection[data-travel-type]');
      subsections.forEach(subsection => {
        subsection.style.display = 'none';
      });
    } else {
      selected.dispatchEvent(new Event('change'));
    }
  });
}

function initializeTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const container = btn.closest('.section-content');
      const tabId = btn.dataset.tab;
      container.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`[data-content="${tabId}"]`)?.classList.add('active');
    });
  });
}

// ============================================
// Dynamic Entry Templates
// ============================================

function createQuoteEntry(index) {
  const entry = document.createElement('div');
  entry.className = 'quote-entry';
  entry.dataset.index = index;
  
  entry.innerHTML = `
    <div class="entry-header">
      <div class="entry-number">
        <span class="entry-badge">${index}</span>
        <span class="entry-label">Quote #${index}</span>
      </div>
      <button type="button" class="remove-entry-btn" onclick="removeEntry(this)" aria-label="Remove quote">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="form-group">
      <label class="form-label">Get Quote From</label>
      <div class="radio-group">
        <label class="radio-item">
          <input type="radio" name="quote_source_${index}" value="alan">
          <span class="radio-custom"></span>
          <span class="radio-label">Alan</span>
        </label>
        <div class="other-input-wrapper">
          <label class="radio-item">
            <input type="radio" name="quote_source_${index}" value="third_party">
            <span class="radio-custom"></span>
            <span class="radio-label">3rd Party</span>
          </label>
          <input type="text" class="other-input" name="quote_source_other_${index}" placeholder="Enter vendor name..." disabled>
          <input type="email" class="other-input" name="quote_source_other_${index}_email" placeholder="Enter email..." disabled>
        </div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Quote Price</label>
      <input type="text" class="form-input" name="quote_price_${index}" placeholder="$0.00">
    </div>
  `;
  
  return entry;
}

// Trucking Entry - NO "Attach Invoice" field (moved to section level)
function createTruckingEntry(index) {
  const entry = document.createElement('div');
  entry.className = 'trucking-entry';
  entry.dataset.index = index;
  
  entry.innerHTML = `
    <div class="entry-header">
      <div class="entry-number">
        <span class="entry-badge">${index}</span>
        <span class="entry-label">Trucking Route #${index}</span>
      </div>
      <button type="button" class="remove-entry-btn" onclick="removeEntry(this)" aria-label="Remove trucking route">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    
    <div class="form-group">
      <label class="form-label">Truck Source</label>
      <div class="checkbox-group">
        <label class="checkbox-item">
          <input type="checkbox" name="truck_source_${index}" value="zenspace">
          <span class="checkbox-custom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
          <span class="checkbox-label">Enterprise</span>
        </label>
        <label class="checkbox-item">
          <input type="checkbox" name="truck_source_${index}" value="alex_logistics">
          <span class="checkbox-custom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
          <span class="checkbox-label">Alex Logistics</span>
        </label>
        <label class="checkbox-item">
          <input type="checkbox" name="truck_source_${index}" value="edward">
          <span class="checkbox-custom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
          <span class="checkbox-label">Edward</span>
        </label>
        <div class="other-input-wrapper">
          <label class="checkbox-item">
            <input type="checkbox" name="truck_source_${index}" value="other">
            <span class="checkbox-custom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
            <span class="checkbox-label">Other</span>
          </label>
          <input type="text" class="other-input" name="truck_source_${index}_other" placeholder="Enter name..." disabled>
          <input type="email" class="other-input" name="truck_source_${index}_other_email" placeholder="Enter email..." disabled>
        </div>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Truck Type</label>
      <div class="radio-group">
        <label class="radio-item"><input type="radio" name="truck_type_${index}" value="FTL"><span class="radio-custom"></span><span class="radio-label">FTL</span></label>
        <label class="radio-item"><input type="radio" name="truck_type_${index}" value="PTL"><span class="radio-custom"></span><span class="radio-label">PTL</span></label>
        <label class="radio-item"><input type="radio" name="truck_type_${index}" value="LTL"><span class="radio-custom"></span><span class="radio-label">LTL</span></label>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Sub Truck Type</label>
      <div class="radio-group">
        <label class="radio-item"><input type="radio" name="sub_truck_type_${index}" value="small_pickup"><span class="radio-custom"></span><span class="radio-label">Small Pickup</span></label>
        <label class="radio-item"><input type="radio" name="sub_truck_type_${index}" value="full_size_pickup"><span class="radio-custom"></span><span class="radio-label">Full Size Pickup</span></label>
        <label class="radio-item"><input type="radio" name="sub_truck_type_${index}" value="box_truck"><span class="radio-custom"></span><span class="radio-label">Box Truck</span></label>
        <label class="radio-item"><input type="radio" name="sub_truck_type_${index}" value="stakebed_flatbed"><span class="radio-custom"></span><span class="radio-label">Stakebed & Flatbed Truck</span></label>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Truck Size</label>
      <input type="text" class="form-input" name="truck_size_${index}" placeholder="Enter truck size...">
    </div>
    
    <div class="form-group">
      <label class="form-label">Quote Price from Enterprise (if rented)</label>
      <input type="text" class="form-input" name="truck_quote_enterprise_${index}" placeholder="$0.00">
    </div>
    
    <div class="form-group">
      <label class="form-label">Quote Price from Axle Logistics (if Axle is providing)</label>
      <input type="text" class="form-input" name="truck_quote_axle_${index}" placeholder="$0.00">
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Pickup Date & Time</label>
        <input type="datetime-local" class="form-input" name="pickup_datetime_${index}">
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label">Pickup Warehouse Address</label>
      <div class="address-options">
        <label class="address-option">
          <input type="radio" name="pickup_warehouse_${index}" value="nyc">
          <span class="radio-custom"></span>
          <div class="address-content">
            <div class="address-title">NYC Warehouse <span class="tag">East Coast</span></div>
            <div class="address-details">123 Industrial Blvd, Brooklyn, NY 11201</div>
          </div>
        </label>
        <label class="address-option">
          <input type="radio" name="pickup_warehouse_${index}" value="hayward">
          <span class="radio-custom"></span>
          <div class="address-content">
            <div class="address-title">Hayward Warehouse <span class="tag">West Coast</span></div>
            <div class="address-details">456 Commerce Way, Hayward, CA 94545</div>
          </div>
        </label>
        <label class="address-option">
          <input type="radio" name="pickup_warehouse_${index}" value="other">
          <span class="radio-custom"></span>
          <div class="address-content">
            <div class="address-title">Other Location</div>
            <div class="address-details">Enter a custom address</div>
          </div>
        </label>
        <div class="address-other-input" style="display: none;">
          <textarea class="form-textarea" name="pickup_warehouse_other_${index}" placeholder="Enter full address..." rows="2"></textarea>
        </div>
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label">Delivery Address</label>
      <input type="text" class="form-input" name="delivery_address_${index}" placeholder="Enter delivery address">
    </div>

    <div class="form-group">
      <label class="form-label">Driver Details</label>
      <div style="display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; gap:8px;">
          <div style="flex:1;"><label class="form-label">Name</label></div>
          <div style="flex:1;"><label class="form-label">Mobile Number</label></div>
          <div style="flex:1;"><label class="form-label">Email</label></div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="text" class="form-input" name="driver_name_${index}" placeholder="Driver Name" style="flex:1; min-width:0;">
          <input type="text" class="form-input" name="driver_mobile_${index}" placeholder="Driver Mobile" style="flex:1; min-width:0;">
          <input type="email" class="form-input" name="driver_email_${index}" placeholder="Driver Email" style="flex:1; min-width:0;">
        </div>
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label">Special Delivery Instructions</label>
      <textarea class="form-textarea" name="delivery_instructions_${index}" placeholder="Enter any special instructions..." rows="3"></textarea>
    </div>
    
    <div class="form-group">
      <label class="form-label">Truck Payment Status</label>
      <div class="radio-group">
        <label class="radio-item"><input type="radio" name="truck_payment_status_${index}" value="paid"><span class="radio-custom"></span><span class="radio-label">Paid</span></label>
        <label class="radio-item"><input type="radio" name="truck_payment_status_${index}" value="partially_paid"><span class="radio-custom"></span><span class="radio-label">Partially Paid</span></label>
        <label class="radio-item"><input type="radio" name="truck_payment_status_${index}" value="unpaid"><span class="radio-custom"></span><span class="radio-label">Unpaid</span></label>
      </div>
    </div>
  `;
  
  return entry;
}

function createTravelEntry(index) {
  const entry = document.createElement('div');
  entry.className = 'travel-entry';
  entry.dataset.index = index;
  
  entry.innerHTML = `
    <div class="entry-header">
      <div class="entry-number">
        <span class="entry-badge">${index}</span>
        <span class="entry-label">Traveler #${index}</span>
      </div>
      <button type="button" class="remove-entry-btn" onclick="removeEntry(this)" aria-label="Remove traveler">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    
    <div class="form-group">
      <label class="form-label">Traveler</label>
      <div class="radio-group">
        <label class="radio-item"><input type="radio" name="traveler_name_${index}" value="eliseo"><span class="radio-custom"></span><span class="radio-label">Eliseo</span></label>
        <label class="radio-item"><input type="radio" name="traveler_name_${index}" value="clinton"><span class="radio-custom"></span><span class="radio-label">Clinton</span></label>
        <label class="radio-item"><input type="radio" name="traveler_name_${index}" value="edward"><span class="radio-custom"></span><span class="radio-label">Edward</span></label>
        <div class="other-input-wrapper">
          <label class="radio-item"><input type="radio" name="traveler_name_${index}" value="other"><span class="radio-custom"></span><span class="radio-label">Other</span></label>
          <input type="text" class="other-input" name="traveler_name_other_${index}" placeholder="Enter traveler name..." disabled>
          <input type="email" class="other-input" name="traveler_name_other_${index}_email" placeholder="Enter email..." disabled>
        </div>
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group"><label class="form-label">Travel From</label><textarea class="form-textarea" name="travel_from_${index}" placeholder="Enter departure address..." rows="2"></textarea></div>
      <div class="form-group"><label class="form-label">Travel To</label><textarea class="form-textarea" name="travel_to_${index}" placeholder="Enter destination address..." rows="2"></textarea></div>
    </div>
    
    <div class="form-row">
      <div class="form-group"><label class="form-label">Travel Date From</label><input type="datetime-local" class="form-input" name="traveler_from_datetime_${index}"></div>
      <div class="form-group"><label class="form-label">Travel Date To</label><input type="datetime-local" class="form-input" name="traveler_to_datetime_${index}"></div>
    </div>
    
    <div class="form-group">
      <label class="form-label">Travel Type</label>
      <div class="radio-group">
        <label class="radio-item"><input type="radio" name="travel_type_${index}" value="airline"><span class="radio-custom"></span><span class="radio-label">Airline</span></label>
        <label class="radio-item"><input type="radio" name="travel_type_${index}" value="rental_car"><span class="radio-custom"></span><span class="radio-label">Rental Car</span></label>
        <label class="radio-item"><input type="radio" name="travel_type_${index}" value="rental_truck"><span class="radio-custom"></span><span class="radio-label">Rental Truck</span></label>
        <label class="radio-item"><input type="radio" name="travel_type_${index}" value="personal"><span class="radio-custom"></span><span class="radio-label">Personal</span></label>
      </div>
    </div>
    
    <div class="travel-subsection" data-travel-type="airline" style="display: none;">
      <div class="travel-subsection-title"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path></svg><span>Flight Details</span></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Flight Name</label><input type="text" class="form-input" name="flight_name_${index}" placeholder="Flight Name"></div>
        <div class="form-group"><label class="form-label">Flight Number</label><input type="text" class="form-input" name="flight_number_${index}" placeholder="Flight Number"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Departure</label><input type="datetime-local" class="form-input" name="flight_departure_${index}"></div>
        <div class="form-group"><label class="form-label">Arrival</label><input type="datetime-local" class="form-input" name="flight_arrival_${index}"></div>
      </div>
      <div class="form-row"><div class="form-group"><label class="form-label">Quote</label><input type="text" class="form-input" name="flight_quote_${index}"></div></div>
    </div>
    
    <div class="travel-subsection" data-travel-type="rental_car" style="display: none;">
      <div class="travel-subsection-title"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"></path><circle cx="6.5" cy="16.5" r="2.5"></circle><circle cx="16.5" cy="16.5" r="2.5"></circle></svg><span>Rental Car Details</span></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Car Company</label><input type="text" class="form-input" name="car_company_${index}" placeholder="Car Company"></div>
        <div class="form-group"><label class="form-label">Car Number</label><input type="text" class="form-input" name="car_number_${index}" placeholder="Car Number"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Pickup</label><input type="datetime-local" class="form-input" name="car_pickup_${index}"></div>
        <div class="form-group"><label class="form-label">Drop-off</label><input type="datetime-local" class="form-input" name="car_dropoff_${index}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Pickup Address</label><textarea class="form-input" name="car_pickup_address_${index}"></textarea></div>
        <div class="form-group"><label class="form-label">Drop-off Address</label><textarea class="form-input" name="car_dropoff_address_${index}"></textarea></div>
      </div>
      <div class="form-row"><div class="form-group"><label class="form-label">Quote</label><input type="text" class="form-input" name="car_quote_${index}"></div></div>
    </div>
    
    <div class="travel-subsection" data-travel-type="rental_truck" style="display: none;">
      <div class="travel-subsection-title"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"></path><circle cx="6.5" cy="16.5" r="2.5"></circle><circle cx="16.5" cy="16.5" r="2.5"></circle></svg><span>Rental Truck</span></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Truck Company</label><input type="text" class="form-input" name="truck_company_${index}" placeholder="e.g., Enterprise"></div>
        <div class="form-group"><label class="form-label">Truck Number</label><input type="text" class="form-input" name="truck_number_${index}" placeholder="Truck Number"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Pickup</label><input type="datetime-local" class="form-input" name="truck_pickup_${index}"></div>
        <div class="form-group"><label class="form-label">Drop-off</label><input type="datetime-local" class="form-input" name="truck_dropoff_${index}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Pickup Address</label><textarea class="form-input" name="truck_pickup_address_${index}"></textarea></div>
        <div class="form-group"><label class="form-label">Drop-off Address</label><textarea class="form-input" name="truck_dropoff_address_${index}"></textarea></div>
      </div>
      <div class="form-row"><div class="form-group"><label class="form-label">Quote</label><input type="text" class="form-input" name="truck_quote_${index}"></div></div>
    </div>
    
    <div class="travel-subsection" data-travel-type="personal" style="display: none;">
      <div class="travel-subsection-title"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"></path><circle cx="6.5" cy="16.5" r="2.5"></circle><circle cx="16.5" cy="16.5" r="2.5"></circle></svg><span>Personal</span></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Quote</label><input type="text" class="form-input" name="personal_quote_${index}"></div></div>
    </div>
    
    <div class="travel-subsection">
      <div class="travel-subsection-title"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4M5 21V10.85M19 21V10.85"></path></svg><span>Hotel</span></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Hotel Name</label><input type="text" class="form-input" name="hotel_name_${index}" placeholder="Hotel Name"></div>
        <div class="form-group"><label class="form-label">Hotel Location</label><textarea class="form-input" name="hotel_location_${index}" placeholder="Hotel Location"></textarea></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Check In</label><input type="datetime-local" class="form-input" name="check_in_${index}"></div>
        <div class="form-group"><label class="form-label">Check Out</label><input type="datetime-local" class="form-input" name="check_out_${index}"></div>
      </div>
      <div class="form-row"><div class="form-group"><label class="form-label">Quote</label><input type="text" class="form-input" name="hotel_quote_${index}"></div></div>
    </div>
    
    <div class="form-group">
      <label class="form-label">Special Instructions</label>
      <textarea class="form-textarea" name="special_instructions_travel_${index}" placeholder="Enter any special instructions for this traveler..." rows="3"></textarea>
    </div>
  `;
  
  return entry;
}

function removeEntry(button) {
  const entry = button.closest('.quote-entry, .trucking-entry, .travel-entry, .installation-date-entry, .dismantle-date-entry');
  if (entry) {
    entry.style.opacity = '0';
    entry.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      entry.remove();
      updateInstallationRemoveButtons();
      updateDismantleRemoveButtons();
    }, 300);
  }
}

function initializeDynamicSections() {
  const addQuoteBtn = document.getElementById('addQuoteBtn');
  const quoteContainer = document.getElementById('printingQuotes');
  if (addQuoteBtn && quoteContainer) {
    addQuoteBtn.addEventListener('click', () => {
      quoteCount++;
      const entry = createQuoteEntry(quoteCount);
      quoteContainer.appendChild(entry);
      initializeRadios();
      entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
  
  const addTruckingBtn = document.getElementById('addTruckingBtn');
  const truckingContainer = document.getElementById('truckingEntries');
  if (addTruckingBtn && truckingContainer) {
    addTruckingBtn.addEventListener('click', () => {
      truckingCount++;
      const entry = createTruckingEntry(truckingCount);
      truckingContainer.appendChild(entry);
      initializeCheckboxes();
      initializeRadios();
      entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  const addInstallDateBtn = document.getElementById('addInstallDateBtn');
  const installationDatesContainer = document.getElementById('installationDates');
  if (addInstallDateBtn && installationDatesContainer) {
    addInstallDateBtn.addEventListener('click', () => {
      const installCount = installationDatesContainer.querySelectorAll('.installation-date-entry').length + 1;
      const entry = document.createElement('div');
      entry.className = 'installation-date-entry';
      entry.dataset.index = installCount;
      entry.innerHTML = `
        <div class="entry-header">
          <div class="entry-number"><span class="entry-badge">${installCount}</span><span class="entry-label">Installation Date #${installCount}</span></div>
          <button type="button" class="remove-entry-btn" onclick="removeEntry(this)" aria-label="Remove installation date">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" name="install_date_${installCount}"></div>
          <div class="form-group"><label class="form-label">From Time</label><input type="time" class="form-input" name="install_from_time_${installCount}"></div>
          <div class="form-group"><label class="form-label">To Time</label><input type="time" class="form-input" name="install_to_time_${installCount}"></div>
        </div>
      `;
      installationDatesContainer.appendChild(entry);
      updateInstallationRemoveButtons();
      entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  const addDismantleDateBtn = document.getElementById('addDismantleDateBtn');
  const dismantleDatesContainer = document.getElementById('dismantleDates');
  if (addDismantleDateBtn && dismantleDatesContainer) {
    addDismantleDateBtn.addEventListener('click', () => {
      const dismantleCount = dismantleDatesContainer.querySelectorAll('.dismantle-date-entry').length + 1;
      const entry = document.createElement('div');
      entry.className = 'dismantle-date-entry';
      entry.dataset.index = dismantleCount;
      entry.innerHTML = `
        <div class="entry-header">
          <div class="entry-number"><span class="entry-badge">${dismantleCount}</span><span class="entry-label">Dismantle Date #${dismantleCount}</span></div>
          <button type="button" class="remove-entry-btn" onclick="removeEntry(this)" aria-label="Remove dismantle date">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" name="dismantle_date_${dismantleCount}"></div>
          <div class="form-group"><label class="form-label">From Time</label><input type="time" class="form-input" name="dismantle_from_time_${dismantleCount}"></div>
          <div class="form-group"><label class="form-label">To Time</label><input type="time" class="form-input" name="dismantle_to_time_${dismantleCount}"></div>
        </div>
      `;
      dismantleDatesContainer.appendChild(entry);
      updateDismantleRemoveButtons();
      entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
  
  const addTravelBtn = document.getElementById('addTravelBtn');
  const travelContainer = document.getElementById('travelEntries');
  if (addTravelBtn && travelContainer) {
    addTravelBtn.addEventListener('click', () => {
      travelCount++;
      const entry = createTravelEntry(travelCount);
      travelContainer.appendChild(entry);
      initializeRadios();
      initializeTravelType();
      entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  updateInstallationRemoveButtons();
  updateDismantleRemoveButtons();
}

function updateInstallationRemoveButtons() {
  const entries = document.querySelectorAll('.installation-date-entry');
  entries.forEach((entry) => {
    const btn = entry.querySelector('.remove-entry-btn');
    if (btn) btn.style.display = entries.length > 1 ? 'block' : 'none';
  });
}

function updateDismantleRemoveButtons() {
  const entries = document.querySelectorAll('.dismantle-date-entry');
  entries.forEach((entry) => {
    const btn = entry.querySelector('.remove-entry-btn');
    if (btn) btn.style.display = entries.length > 1 ? 'block' : 'none';
  });
}

function initializeDamageItemsHandler() {
  const damageRadios = document.querySelectorAll('input[name="items_damage"]');
  const damageImagesContainer = document.getElementById('damageImagesContainer');
  
  damageRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (damageImagesContainer) {
        damageImagesContainer.style.display = e.target.value === 'yes' ? 'block' : 'none';
      }
    });
  });
}

function initializeSectionSaveButtons() {
  document.querySelectorAll('.section-save-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sectionId = btn.dataset.section;
      saveSection(sectionId);
    });
  });
}

function initializeCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.link-display').querySelector('input');
      if (input && input.value) {
        navigator.clipboard.writeText(input.value).then(() => {
          showToast('Link copied to clipboard!', 'success');
        }).catch(() => {
          showToast('Failed to copy', 'error');
        });
      } else {
        showToast('No link to copy', 'info');
      }
    });
  });
}

// ============================================
// Initialize Application
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
  currentEventId = getEventIdFromURL();
  
  if (!currentEventId) {
    console.warn('No event_id provided in URL. Save functionality will be limited.');
  }
  
  initializeAccordions();
  initializeCheckboxes();
  initializeRadios();
  initializeCOI();
  initializeTravelType();
  initializeTabs();
  initializeDynamicSections();
  initializeSectionSaveButtons();
  initializeCopyButtons();
  initializeDamageItemsHandler();
  
  if (currentEventId) {
    await loadAllSectionData(currentEventId);
  }
  
  const firstSection = document.querySelector('.section-card');
  if (firstSection) {
    firstSection.classList.add('expanded', 'active');
  }
  
  console.log('ZenSpace Onboarding App V4 initialized', { eventId: currentEventId });
});

// Make functions globally available
window.removeEntry = removeEntry;
window.saveSection = saveSection;
window.loadAllSectionData = loadAllSectionData;
window.showToast = showToast;