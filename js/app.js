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
window.unsavedSections = {}; // Track unsaved changes per section

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

// Get single checkbox value (boolean)
function getCheckboxValue(name, container = document) {
  const checkbox = container.querySelector(`input[type="checkbox"][name="${name}"]`);
  return checkbox ? checkbox.checked : false;
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
    warehouse_address_other: getSelectedPrePlanWarehouse(),//getInputValue('warehouse_address_other', section),
    packing_deadline: toISODateTime(getInputValue('packing_deadline', section)),
    special_instructions: getInputValue('special_instructions_preplanning', section)
  };
}

function getSelectedPrePlanWarehouse() {
  // checked radio for this index group
  const checked = document.querySelector(`input[name="warehouse_address"]:checked`);
  if (!checked) return null;

  // the label that wraps this radio + content
  const option = checked.closest(".address-option");

 // const title = option.querySelector(".address-title")?.textContent.trim() || "";
  const detailsEl = option.querySelector(".address-details");
  const details = detailsEl?.dataset.address?.trim() || detailsEl?.innerText.trim() || "";

  // handle "other"
  if (checked.value === "Other") {
    const otherText = option.closest(".address-options")
      .querySelector(`textarea[name="warehouse_address_other"]`)?.value.trim() || "";

    return `${otherText}`;
  }

  console.log("Pickup Warehouse Title:", `${details}`);

  return `${details}`;
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
    proofs_approved: getCheckboxValue('proofs_approved', section),
    special_instructions: getInputValue('special_instructions_artwork', section)
  };
}

// Section 3: Printing (main data)
function getPrintingData() {
  const section = document.querySelector('[data-section="printing"]');
  
  // Get assigned_printer value - if "third_party" is selected, use the other name
  let assignedPrinterValue = getRadioValue('assigned_printer', section);
  const assignedPrinterOtherName = getInputValue('assigned_printer_other', section);
  if (assignedPrinterValue === 'third_party' && assignedPrinterOtherName && assignedPrinterOtherName.trim()) {
    assignedPrinterValue = assignedPrinterOtherName.trim();
  }
  
  // Get assigned_graphic_installer value - if "third_party" is selected, use the other name
  let assignedGraphicInstallerValue = getRadioValue('assigned_graphic_installer', section);
  const assignedGraphicInstallerOtherName = getInputValue('assigned_graphic_installer_other', section);
  if (assignedGraphicInstallerValue === 'third_party' && assignedGraphicInstallerOtherName && assignedGraphicInstallerOtherName.trim()) {
    assignedGraphicInstallerValue = assignedGraphicInstallerOtherName.trim();
  }
  
  return {
    event_id: currentEventId,
    assigned_printer: assignedPrinterValue,
    assigned_printer_other_email: getInputValue('assigned_printer_other_email', section),
    installation_quote: getInputValue('installation_quote', section),
    assigned_graphic_installer: assignedGraphicInstallerValue,
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
    
    // Get quote_source value - if "third_party" is selected, use the other name
    let quoteSourceValue = getRadioValue(`quote_source_${index}`, entry);
    const quoteSourceOtherName = getInputValue(`quote_source_other_${index}`, entry);
    if (quoteSourceValue === 'third_party' && quoteSourceOtherName && quoteSourceOtherName.trim()) {
      quoteSourceValue = quoteSourceOtherName.trim();
    }
    
    quotes.push({
      event_id: currentEventId,
      quote_index: index,
      quote_source: quoteSourceValue,
      quote_source_other_email: getInputValue(`quote_source_other_${index}_email`, entry),
      quote_price: getInputValue(`quote_price_${index}`, entry),
      is_quote_approved: getCheckboxValue(`is_quote_approved_${index}`, entry)
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
    
    // Collect driver entries for this trucking route
    const drivers = [];
    const driverContainer = entry.querySelector(`#driverEntries_${index}`);
    if (driverContainer) {
      const driverEntries = driverContainer.querySelectorAll('.driver-entry');
      driverEntries.forEach((driverEntry, driverIdx) => {
        const driverIndex = parseInt(driverEntry.dataset.driverIndex) || (driverIdx + 1);
        drivers.push({
          driver_index: driverIndex,
          driver_name: getInputValue(`driver_name_${index}_${driverIndex}`, driverEntry),
          driver_mobile: getInputValue(`driver_mobile_${index}_${driverIndex}`, driverEntry),
          driver_email: getInputValue(`driver_email_${index}_${driverIndex}`, driverEntry)
        });
      });
    }
    
    // Get truck source value - single selection (radio)
    let truckSourceValue = getRadioValue(`truck_source_${index}`, entry);
    const truckSourceOtherName = getInputValue(`truck_source_${index}_other_name`, entry);
    const truckSourceOtherEmail = getInputValue(`truck_source_${index}_other_email`, entry);
    
    // Store truck_source as array (single element) for database compatibility
    // If "other" is selected, store "other" in array and custom name in truck_source_other
    let truckSourceArray = truckSourceValue ? [truckSourceValue] : [];
    let truckSourceOther = null;
    
    if (truckSourceValue === 'Other' && truckSourceOtherName && truckSourceOtherName.trim()) {
      truckSourceOther = truckSourceOtherName.trim();
    }
    
 // getSelectedPickupWarehouse(index);
    entries.push({
      event_id: currentEventId,
      entry_index: index,
      truck_source: truckSourceArray,
      truck_source_other: truckSourceOther,
      truck_source_other_email: truckSourceOtherEmail,
      truck_type: getRadioValue(`truck_type_${index}`, entry),
      sub_truck_type: getRadioValue(`sub_truck_type_${index}`, entry),
      truck_size: getInputValue(`truck_size_${index}`, entry),
      truck_quote: getInputValue(`truck_quote_${index}`, entry),
      is_trucking_quote_approved: getCheckboxValue(`is_trucking_quote_approved_${index}`, entry),
      pickup_datetime: toISODateTime(getInputValue(`pickup_datetime_${index}`, entry)),
      delivery_datetime: toISODateTime(getInputValue(`delivery_datetime_${index}`, entry)),
      pickup_warehouse: getRadioValue(`pickup_warehouse_${index}`, entry),
      pickup_warehouse_other: getSelectedPickupWarehouse(index),
    //  pickup_warehouse_other: getInputValue(`pickup_warehouse_other_${index}`, entry),
      delivery_address: getInputValue(`delivery_address_${index}`, entry),
      delivery_instructions: getInputValue(`delivery_instructions_${index}`, entry),
      drivers: drivers,
      truck_payment_status: getRadioValue(`truck_payment_status_${index}`, entry)
    });
  });


  
  return entries;
}

function getSelectedPickupWarehouse(index) {
  // checked radio for this index group
  const checked = document.querySelector(`input[name="pickup_warehouse_${index}"]:checked`);
  if (!checked) return null;

  // the label that wraps this radio + content
  const option = checked.closest(".address-option");

 // const title = option.querySelector(".address-title")?.textContent.trim() || "";
  const detailsEl = option.querySelector(".address-details");
  const details = detailsEl?.dataset.address?.trim() || detailsEl?.innerText.trim() || "";

  // handle "other"
  if (checked.value === "Other") {
    const otherText = option.closest(".address-options")
      .querySelector(`textarea[name="pickup_warehouse_other_${index}"]`)?.value.trim() || "";

    return `${otherText}`;
  }

  console.log("Pickup Warehouse Title:", `${details}`);

  return `${details}`;
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
    return_address_other: getSelectedPostPlanWarehouse(), //getInputValue('return_address_other_1', section),
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

function getSelectedPostPlanWarehouse() {
  // checked radio for this index group
  const checked = document.querySelector(`input[name="return_address"]:checked`);
  if (!checked) return null;

  // the label that wraps this radio + content
  const option = checked.closest(".address-option");

 // const title = option.querySelector(".address-title")?.textContent.trim() || "";
  const detailsEl = option.querySelector(".address-details");
  const details = detailsEl?.dataset.address?.trim() || detailsEl?.innerText.trim() || "";

  // handle "other"
  if (checked.value === "Other") {
    const otherText = option.closest(".address-options")
      .querySelector(`textarea[name="return_address_other_1"]`)?.value.trim() || "";

    return `${otherText}`;
  }

  return `${details}`;
}

// Section 7: Travel (multiple entries)
function getTravelData() {
  const entries = [];
  const travelEntries = document.querySelectorAll('.travel-entry');
  
  travelEntries.forEach((entry, idx) => {
    const index = parseInt(entry.dataset.index) || (idx + 1);
    
    // Collect one-way flights with their layovers
    const onewayFlights = [];
    const onewayContainer = entry.querySelector(`#onewayFlights_${index}`);
    if (onewayContainer) {
      onewayContainer.querySelectorAll('.flight-entry').forEach((flightEntry, fIdx) => {
        const flightIndex = fIdx + 1;
        
        // Collect layovers for this flight
        const layovers = [];
        const layoverContainer = flightEntry.querySelector(`[data-layover-container="oneway_${index}_${flightIndex}"]`);
        if (layoverContainer) {
          layoverContainer.querySelectorAll('.layover-entry').forEach((layoverEntry, lIdx) => {
            const layoverIndex = lIdx + 1;
            layovers.push({
              layover_index: layoverIndex,
              airport: getInputValue(`oneway_layover_airport_${index}_${flightIndex}_${layoverIndex}`, layoverEntry),
              duration: getInputValue(`oneway_layover_duration_${index}_${flightIndex}_${layoverIndex}`, layoverEntry),
              flight_name: getInputValue(`oneway_layover_flight_name_${index}_${flightIndex}_${layoverIndex}`, layoverEntry),
              connecting_flight: getInputValue(`oneway_layover_flight_${index}_${flightIndex}_${layoverIndex}`, layoverEntry),
              departure: toISODateTime(getInputValue(`oneway_layover_departure_${index}_${flightIndex}_${layoverIndex}`, layoverEntry)),
              arrival: toISODateTime(getInputValue(`oneway_layover_arrival_${index}_${flightIndex}_${layoverIndex}`, layoverEntry))
            });
          });
        }
        
        onewayFlights.push({
          flight_index: flightIndex,
          airline: getInputValue(`oneway_airline_${index}_${flightIndex}`, flightEntry),
          flight_number: getInputValue(`oneway_flight_number_${index}_${flightIndex}`, flightEntry),
          from: getInputValue(`oneway_from_${index}_${flightIndex}`, flightEntry),
          to: getInputValue(`oneway_to_${index}_${flightIndex}`, flightEntry),
          departure: toISODateTime(getInputValue(`oneway_departure_${index}_${flightIndex}`, flightEntry)),
          arrival: toISODateTime(getInputValue(`oneway_arrival_${index}_${flightIndex}`, flightEntry)),
          quote: getInputValue(`oneway_quote_${index}_${flightIndex}`, flightEntry),
          confirmation: getInputValue(`oneway_confirmation_${index}_${flightIndex}`, flightEntry),
          quote_approved: getCheckboxValue(`oneway_quote_approved_${index}_${flightIndex}`, flightEntry),
          has_layover: getRadioValue(`oneway_has_layover_${index}_${flightIndex}`, flightEntry) === 'yes',
          layovers: layovers
        });
      });
    }
    
    // Collect return flights with their layovers
    const returnFlights = [];
    const returnContainer = entry.querySelector(`#returnFlights_${index}`);
    if (returnContainer) {
      returnContainer.querySelectorAll('.flight-entry').forEach((flightEntry, fIdx) => {
        const flightIndex = fIdx + 1;
        
        // Collect layovers for this flight
        const layovers = [];
        const layoverContainer = flightEntry.querySelector(`[data-layover-container="return_${index}_${flightIndex}"]`);
        if (layoverContainer) {
          layoverContainer.querySelectorAll('.layover-entry').forEach((layoverEntry, lIdx) => {
            const layoverIndex = lIdx + 1;
            layovers.push({
              layover_index: layoverIndex,
              airport: getInputValue(`return_layover_airport_${index}_${flightIndex}_${layoverIndex}`, layoverEntry),
              duration: getInputValue(`return_layover_duration_${index}_${flightIndex}_${layoverIndex}`, layoverEntry),
              flight_name: getInputValue(`return_layover_flight_name_${index}_${flightIndex}_${layoverIndex}`, layoverEntry),
              connecting_flight: getInputValue(`return_layover_flight_${index}_${flightIndex}_${layoverIndex}`, layoverEntry),
              departure: toISODateTime(getInputValue(`return_layover_departure_${index}_${flightIndex}_${layoverIndex}`, layoverEntry)),
              arrival: toISODateTime(getInputValue(`return_layover_arrival_${index}_${flightIndex}_${layoverIndex}`, layoverEntry))
            });
          });
        }
        
        returnFlights.push({
          flight_index: flightIndex,
          airline: getInputValue(`return_airline_${index}_${flightIndex}`, flightEntry),
          flight_number: getInputValue(`return_flight_number_${index}_${flightIndex}`, flightEntry),
          from: getInputValue(`return_from_${index}_${flightIndex}`, flightEntry),
          to: getInputValue(`return_to_${index}_${flightIndex}`, flightEntry),
          departure: toISODateTime(getInputValue(`return_departure_${index}_${flightIndex}`, flightEntry)),
          arrival: toISODateTime(getInputValue(`return_arrival_${index}_${flightIndex}`, flightEntry)),
          quote: getInputValue(`return_quote_${index}_${flightIndex}`, flightEntry),
          confirmation: getInputValue(`return_confirmation_${index}_${flightIndex}`, flightEntry),
          quote_approved: getCheckboxValue(`return_quote_approved_${index}_${flightIndex}`, flightEntry),
          has_layover: getRadioValue(`return_has_layover_${index}_${flightIndex}`, flightEntry) === 'yes',
          layovers: layovers
        });
      });
    }
    
    // Collect hotels
    const hotels = [];
    const hotelContainer = entry.querySelector(`#hotelEntries_${index}`);
    if (hotelContainer) {
      hotelContainer.querySelectorAll('.hotel-entry').forEach((hotelEntry, hIdx) => {
        const hotelIndex = hIdx + 1;
        hotels.push({
          hotel_index: hotelIndex,
          name: getInputValue(`hotel_name_${index}_${hotelIndex}`, hotelEntry),
          location: getInputValue(`hotel_location_${index}_${hotelIndex}`, hotelEntry),
          check_in: toISODateTime(getInputValue(`check_in_${index}_${hotelIndex}`, hotelEntry)),
          check_out: toISODateTime(getInputValue(`check_out_${index}_${hotelIndex}`, hotelEntry)),
          quote: getInputValue(`hotel_quote_${index}_${hotelIndex}`, hotelEntry),
          confirmation: getInputValue(`hotel_confirmation_${index}_${hotelIndex}`, hotelEntry),
          quote_approved: getCheckboxValue(`hotel_quote_approved_${index}_${hotelIndex}`, hotelEntry)
        });
      });
    }
    
    // Collect rental cars
    const cars = [];
    const carContainer = entry.querySelector(`#carEntries_${index}`);
    if (carContainer) {
      carContainer.querySelectorAll('.car-entry').forEach((carEntry, cIdx) => {
        const carIndex = cIdx + 1;
        cars.push({
          car_index: carIndex,
          company: getInputValue(`car_company_${index}_${carIndex}`, carEntry),
          number: getInputValue(`car_number_${index}_${carIndex}`, carEntry),
          pickup: toISODateTime(getInputValue(`car_pickup_${index}_${carIndex}`, carEntry)),
          dropoff: toISODateTime(getInputValue(`car_dropoff_${index}_${carIndex}`, carEntry)),
          pickup_address: getInputValue(`car_pickup_address_${index}_${carIndex}`, carEntry),
          dropoff_address: getInputValue(`car_dropoff_address_${index}_${carIndex}`, carEntry),
          quote: getInputValue(`car_quote_${index}_${carIndex}`, carEntry),
          confirmation: getInputValue(`car_confirmation_${index}_${carIndex}`, carEntry),
          quote_approved: getCheckboxValue(`car_quote_approved_${index}_${carIndex}`, carEntry)
        });
      });
    }
    
    // Collect rental trucks
    const trucks = [];
    const truckContainer = entry.querySelector(`#truckEntries_${index}`);
    if (truckContainer) {
      truckContainer.querySelectorAll('.truck-entry').forEach((truckEntry, tIdx) => {
        const truckIndex = tIdx + 1;
        trucks.push({
          truck_index: truckIndex,
          company: getInputValue(`truck_company_${index}_${truckIndex}`, truckEntry),
          number: getInputValue(`truck_number_${index}_${truckIndex}`, truckEntry),
          pickup: toISODateTime(getInputValue(`truck_pickup_${index}_${truckIndex}`, truckEntry)),
          dropoff: toISODateTime(getInputValue(`truck_dropoff_${index}_${truckIndex}`, truckEntry)),
          pickup_address: getInputValue(`truck_pickup_address_${index}_${truckIndex}`, truckEntry),
          dropoff_address: getInputValue(`truck_dropoff_address_${index}_${truckIndex}`, truckEntry),
          quote: getInputValue(`truck_quote_${index}_${truckIndex}`, truckEntry),
          confirmation: getInputValue(`truck_confirmation_${index}_${truckIndex}`, truckEntry),
          quote_approved: getCheckboxValue(`truck_quote_approved_${index}_${truckIndex}`, truckEntry)
        });
      });
    }
    
    // Get traveler_name value - if "other" is selected, use the other name
    let travelerNameValue = getRadioValue(`traveler_name_${index}`, entry);
    const travelerNameOther = getInputValue(`traveler_name_other_${index}`, entry);
    if (travelerNameValue === 'Other' && travelerNameOther && travelerNameOther.trim()) {
      travelerNameValue = travelerNameOther.trim();
    }
    
    entries.push({
      event_id: currentEventId,
      traveler_index: index,
      traveler_name: travelerNameValue,
      traveler_name_other_email: getInputValue(`traveler_name_other_${index}_email`, entry),
      travel_from: getInputValue(`travel_from_${index}`, entry),
      travel_to: getInputValue(`travel_to_${index}`, entry),
      traveler_from_datetime: toISODateTime(getInputValue(`traveler_from_datetime_${index}`, entry)),
      traveler_to_datetime: toISODateTime(getInputValue(`traveler_to_datetime_${index}`, entry)),
      travel_type: getRadioValue(`travel_type_${index}`, entry),
      // Flight details - new structure with layovers per flight
      oneway_flights: onewayFlights,
      return_flights: returnFlights,
      // Rental car details - new array structure
      cars: cars,
      // Rental truck details - new array structure
      trucks: trucks,
      // Personal
      personal_quote: getInputValue(`personal_quote_${index}`, entry),
      // Hotel details - new array structure
      hotels: hotels,
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

// Section 8: COI - WITH FILE URLs and Names (multi-file)
function getCOIData() {
  const section = document.querySelector('[data-section="coi"]');
  
  // Get uploaded file data (now multi-file format)
  const coiData = typeof getUploadedFileData === 'function' 
    ? getUploadedFileData('coi_documents') 
    : { urls: [], files: [], folderUrl: '' };
  
  // Extract names from files array
  const fileNames = coiData.files ? coiData.files.map(f => f.name) : [];
  
  return {
    event_id: currentEventId,
    coi_required: getRadioValue('coi_required', section),
    // File URLs and Names (multi-file)
    coi_file_urls: coiData.urls && coiData.urls.length > 0 ? coiData.urls : null,
    coi_file_names: fileNames.length > 0 ? fileNames : null,
    coi_folder_url: coiData.folderUrl || null
  };
}

// Section 9: Booking Software
function getBookingSoftwareData() {
  const section = document.querySelector('[data-section="booking-software"]');
  return {
    event_id: currentEventId,
    is_booking_software: getRadioValue('is_booking_software', section) === 'yes',
    client_graphics_folder_link: getInputValue('client_graphics_folder_link', section),
    generated_graphics_folder_link: getInputValue('generated_graphics_folder_link', section),
    booking_web_url: getInputValue('booking_web_url', section),
    notes: getInputValue('booking_software_notes', section)
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

// Save Booking Software
async function saveBookingSoftware() {
  if (!currentEventId) {
    showToast('No event selected. Please select an event first.', 'error');
    return false;
  }
  
  const data = getBookingSoftwareData();
  const result = await upsertSectionData('internal_booking_software', data);
  
  if (result.success) {
    updateSaveStatus('booking-software', true);
    showToast('Booking Software saved successfully!', 'success');
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
    case 'booking-software':
      success = await saveBookingSoftware();
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
  
  if (success) {
    window.unsavedSections[sectionId] = false;
  }
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
      coi,
      bookingSoftware
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
      supabase.from('internal_coi').select('*').eq('event_id', eventId).single(),
      supabase.from('internal_booking_software').select('*').eq('event_id', eventId).single()  // ADD THIS LINE
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
    if (bookingSoftware.data) populateBookingSoftware(bookingSoftware.data);  // ADD THIS LINE
    
    // Mark all sections as clean after loading
    window.unsavedSections = {
      'preplanning': false,
      'artwork': false,
      'printing': false,
      'trucking': false,
      'installation': false,
      'postevent': false,
      'travel': false,
      'coi': false,
      'booking-software': false
    };
    
    console.log('All section data loaded successfully');
  } catch (error) {
    console.error('Error loading section data:', error);
  }
}

// Populate form helpers
function setInputValue(name, value, container = document) {
  let input = container.querySelector(`[name="${name}"]`);
  if (!input && container !== document) {
    input = document.querySelector(`[name="${name}"]`);
  }
  if (input) input.value = value || '';
}

function setRadioValue(name, value, container = document) {
  if (!value) return;
  
  // First try to find in container, then fall back to document
  let radio = container.querySelector(`input[name="${name}"][value="${value}"]`);
  if (!radio && container !== document) {
    radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
  }
  
  if (radio) {
    radio.checked = true;
    radio.closest('.radio-item')?.classList.add('selected');
    radio.closest('.address-option')?.classList.add('selected');
    
    if (value === 'Other' || value === 'third_party') {
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
  } else {
    console.warn(`[setRadioValue] Radio not found: ${name}=${value}`);
  }
}

function setCheckboxValues(name, values, container = document) {
  if (!values || !Array.isArray(values)) return;
  values.forEach(value => {
    const checkbox = container.querySelector(`input[name="${name}"][value="${value}"]`);
    if (checkbox) {
      checkbox.checked = true;
      checkbox.closest('.checkbox-item')?.classList.add('checked');
      
      if (value === 'Other') {
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

// Set single checkbox value (boolean)
function setCheckboxValue(name, value, container = document) {
  // First try to find in container, then fall back to document
  let checkbox = container.querySelector(`input[type="checkbox"][name="${name}"]`);
  if (!checkbox && container !== document) {
    checkbox = document.querySelector(`input[type="checkbox"][name="${name}"]`);
  }
  
  
  if (checkbox) {
    checkbox.checked = !!value;
    // Handle both checkbox-item and single-checkbox styles
    const checkboxItem = checkbox.closest('.checkbox-item') || checkbox.closest('.single-checkbox');
    if (checkboxItem) {
      if (value) {
        checkboxItem.classList.add('checked');
      } else {
        checkboxItem.classList.remove('checked');
      }
    }
  } else {
  }
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
  
  if (data.warehouse_address === 'Other') {
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
  setCheckboxValue('proofs_approved', data.proofs_approved, section);
  setInputValue('special_instructions_artwork', data.special_instructions, section);
  
  updateSaveStatus('artwork', true);
}

function populatePrinting(data) {
  const section = document.querySelector('[data-section="printing"]');
  if (!section) return;
  
  // Handle assigned_printer - check if it's a predefined value or custom
  const predefinedPrinters = ['Alan', 'third_party'];
  if (data.assigned_printer && !predefinedPrinters.includes(data.assigned_printer)) {
    // It's a custom value - set radio to "third_party" and fill the other name field
    setRadioValue('assigned_printer', 'third_party', section);
    setInputValue('assigned_printer_other', data.assigned_printer, section);
    // Enable the other input fields
    const otherNameInput = section.querySelector('[name="assigned_printer_other"]');
    const otherEmailInput = section.querySelector('[name="assigned_printer_other_email"]');
    if (otherNameInput) otherNameInput.disabled = false;
    if (otherEmailInput) otherEmailInput.disabled = false;
  } else {
    setRadioValue('assigned_printer', data.assigned_printer, section);
  }
  setInputValue('assigned_printer_other_email', data.assigned_printer_other_email, section);
  
  setInputValue('installation_quote', data.installation_quote, section);
  
  // Handle assigned_graphic_installer - check if it's a predefined value or custom
  const predefinedInstallers = ['Alan', 'Eliseo', 'Clint', 'third_party'];
  if (data.assigned_graphic_installer && !predefinedInstallers.includes(data.assigned_graphic_installer)) {
    // It's a custom value - set radio to "third_party" and fill the other name field
    setRadioValue('assigned_graphic_installer', 'third_party', section);
    setInputValue('assigned_graphic_installer_other', data.assigned_graphic_installer, section);
    // Enable the other input fields
    const otherNameInput = section.querySelector('[name="assigned_graphic_installer_other"]');
    const otherEmailInput = section.querySelector('[name="assigned_graphic_installer_other_email"]');
    if (otherNameInput) otherNameInput.disabled = false;
    if (otherEmailInput) otherEmailInput.disabled = false;
  } else {
    setRadioValue('assigned_graphic_installer', data.assigned_graphic_installer, section);
  }
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
      // Handle quote_source - check if it's a predefined value or custom
      const predefinedSources = ['Alan', 'third_party'];
      if (quote.quote_source && !predefinedSources.includes(quote.quote_source)) {
        // It's a custom value - set radio to "third_party" and fill the other name field
        setRadioValue(`quote_source_${quote.quote_index}`, 'third_party', entry);
        setInputValue(`quote_source_other_${quote.quote_index}`, quote.quote_source, entry);
        // Enable the other input fields
        const otherNameInput = entry.querySelector(`[name="quote_source_other_${quote.quote_index}"]`);
        const otherEmailInput = entry.querySelector(`[name="quote_source_other_${quote.quote_index}_email"]`);
        if (otherNameInput) otherNameInput.disabled = false;
        if (otherEmailInput) otherEmailInput.disabled = false;
      } else {
        setRadioValue(`quote_source_${quote.quote_index}`, quote.quote_source, entry);
      }
      setInputValue(`quote_source_other_${quote.quote_index}_email`, quote.quote_source_other_email, entry);
      setInputValue(`quote_price_${quote.quote_index}`, quote.quote_price, entry);
      setCheckboxValue(`is_quote_approved_${quote.quote_index}`, quote.is_quote_approved, entry);
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
      // Handle truck_source - stored as array in DB, displayed as single radio selection
      // Extract first value from array if it's an array
      const predefinedSources = ['Zenspace', 'Axle Logistics', 'Edward', 'Other'];
      let truckSourceValue = null;
      
      if (Array.isArray(data.truck_source) && data.truck_source.length > 0) {
        truckSourceValue = data.truck_source[0];
      } else if (typeof data.truck_source === 'string') {
        truckSourceValue = data.truck_source;
      }
      
      if (truckSourceValue === 'Other') {
        // "Other" is selected - set radio to "Other" and fill in the custom name from truck_source_other
        setRadioValue(`truck_source_${data.entry_index}`, 'Other', entry);
        if (data.truck_source_other) {
          setInputValue(`truck_source_${data.entry_index}_other_name`, data.truck_source_other, entry);
        }
        // Enable the other input fields
        const otherNameInput = entry.querySelector(`[name="truck_source_${data.entry_index}_other_name"]`);
        const otherEmailInput = entry.querySelector(`[name="truck_source_${data.entry_index}_other_email"]`);
        if (otherNameInput) otherNameInput.disabled = false;
        if (otherEmailInput) otherEmailInput.disabled = false;
      } else if (truckSourceValue && predefinedSources.includes(truckSourceValue)) {
        // It's a predefined value
        setRadioValue(`truck_source_${data.entry_index}`, truckSourceValue, entry);
      }
      
      setInputValue(`truck_source_${data.entry_index}_other_email`, data.truck_source_other_email, entry);
      setRadioValue(`truck_type_${data.entry_index}`, data.truck_type, entry);
      setRadioValue(`sub_truck_type_${data.entry_index}`, data.sub_truck_type, entry);
      setInputValue(`truck_size_${data.entry_index}`, data.truck_size, entry);
      setInputValue(`truck_quote_${data.entry_index}`, data.truck_quote, entry);
      setCheckboxValue(`is_trucking_quote_approved_${data.entry_index}`, data.is_trucking_quote_approved, entry);
      setInputValue(`pickup_datetime_${data.entry_index}`, fromISODateTime(data.pickup_datetime), entry);
      setInputValue(`delivery_datetime_${data.entry_index}`, fromISODateTime(data.delivery_datetime), entry);
      setRadioValue(`pickup_warehouse_${data.entry_index}`, data.pickup_warehouse, entry);
      setInputValue(`pickup_warehouse_other_${data.entry_index}`, data.pickup_warehouse_other, entry);
      setInputValue(`delivery_address_${data.entry_index}`, data.delivery_address, entry);
      setInputValue(`delivery_instructions_${data.entry_index}`, data.delivery_instructions, entry);
      
      // Populate drivers
      if (data.drivers && data.drivers.length > 0) {
        const driverContainer = entry.querySelector(`#driverEntries_${data.entry_index}`);
        if (driverContainer) {
          // Clear existing driver entries except the first one
          const existingDrivers = driverContainer.querySelectorAll('.driver-entry');
          existingDrivers.forEach((driverEntry, driverIdx) => {
            if (driverIdx > 0) driverEntry.remove();
          });
          
          // Populate each driver
          data.drivers.forEach((driver, driverIdx) => {
            if (driverIdx > 0) {
              // Add new driver entry
              const newDriverEntry = createDriverEntry(data.entry_index, driver.driver_index);
              driverContainer.appendChild(newDriverEntry);
            }
            
            const driverEntry = driverContainer.querySelector(`.driver-entry[data-driver-index="${driver.driver_index}"]`);
            if (driverEntry) {
              setInputValue(`driver_name_${data.entry_index}_${driver.driver_index}`, driver.driver_name, driverEntry);
              setInputValue(`driver_mobile_${data.entry_index}_${driver.driver_index}`, driver.driver_mobile, driverEntry);
              setInputValue(`driver_email_${data.entry_index}_${driver.driver_index}`, driver.driver_email, driverEntry);
              
              // Show remove button for additional drivers
              if (driverIdx > 0) {
                const removeBtn = driverEntry.querySelector('.remove-driver-btn');
                setRemoveButtonVisibility(removeBtn, true);
              }
            }
          });
        }
      }
      
      setRadioValue(`truck_payment_status_${data.entry_index}`, data.truck_payment_status, entry);
      
      if (data.pickup_warehouse === 'Other') {
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

function setRemoveButtonVisibility(button, shouldShow) {
  if (!button) return;
  button.classList.toggle('is-hidden', !shouldShow);
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
  
  if (data.return_address === 'Other') {
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
      // Handle traveler_name - check if it's a predefined value or custom
      const predefinedTravelers = ['Eliseo', 'Clinton', 'Edward', 'Other'];
      if (data.traveler_name && !predefinedTravelers.includes(data.traveler_name)) {
        // It's a custom value - set radio to "Other" and fill the other name field
        setRadioValue(`traveler_name_${data.traveler_index}`, 'Other', entry);
        setInputValue(`traveler_name_other_${data.traveler_index}`, data.traveler_name, entry);
        // Enable the other input fields
        const otherNameInput = entry.querySelector(`[name="traveler_name_other_${data.traveler_index}"]`);
        const otherEmailInput = entry.querySelector(`[name="traveler_name_other_${data.traveler_index}_email"]`);
        if (otherNameInput) otherNameInput.disabled = false;
        if (otherEmailInput) otherEmailInput.disabled = false;
      } else {
        setRadioValue(`traveler_name_${data.traveler_index}`, data.traveler_name, entry);
      }
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
      
      // Populate one-way flights (with has_layover, quote_approved, and layovers inside each flight)
      const onewayFlights = data.oneway_flights || [];
      const onewayContainer = entry.querySelector(`#onewayFlights_${data.traveler_index}`);
      if (onewayContainer && onewayFlights.length > 0) {
        // First flight already exists, populate it
        const firstOnewayFlight = onewayContainer.querySelector('.flight-entry');
        if (firstOnewayFlight && onewayFlights[0]) {
          populateFlightEntry(firstOnewayFlight, 'oneway', data.traveler_index, 1, onewayFlights[0]);
        }
        // Add additional flights
        for (let i = 1; i < onewayFlights.length; i++) {
          const newFlight = createFlightEntryElement('oneway', data.traveler_index, i + 1);
          onewayContainer.appendChild(newFlight);
          populateFlightEntry(newFlight, 'oneway', data.traveler_index, i + 1, onewayFlights[i]);
        }
        updateFlightRemoveButtons(onewayContainer);
      }
      
      // Populate return flights (with has_layover, quote_approved, and layovers inside each flight)
      const returnFlights = data.return_flights || [];
      const returnContainer = entry.querySelector(`#returnFlights_${data.traveler_index}`);
      if (returnContainer && returnFlights.length > 0) {
        const firstReturnFlight = returnContainer.querySelector('.flight-entry');
        if (firstReturnFlight && returnFlights[0]) {
          populateFlightEntry(firstReturnFlight, 'return', data.traveler_index, 1, returnFlights[0]);
        }
        for (let i = 1; i < returnFlights.length; i++) {
          const newFlight = createFlightEntryElement('return', data.traveler_index, i + 1);
          returnContainer.appendChild(newFlight);
          populateFlightEntry(newFlight, 'return', data.traveler_index, i + 1, returnFlights[i]);
        }
        updateFlightRemoveButtons(returnContainer);
      }
      
      // Populate rental cars (from cars JSONB array)
      const cars = data.cars || [];
      const carContainer = entry.querySelector(`#carEntries_${data.traveler_index}`);
      if (carContainer && cars.length > 0) {
        // First car already exists
        const firstCar = carContainer.querySelector('.car-entry');
        if (firstCar && cars[0]) {
          populateCarEntry(firstCar, data.traveler_index, 1, cars[0]);
        }
        // Add additional cars
        for (let i = 1; i < cars.length; i++) {
          const newCar = createCarEntryElement(data.traveler_index, i + 1);
          carContainer.appendChild(newCar);
          populateCarEntry(newCar, data.traveler_index, i + 1, cars[i]);
        }
        updateCarRemoveButtons(carContainer);
      } else {
        // Backward compatibility: use old single car fields if cars array is empty
        setInputValue(`car_company_${data.traveler_index}_1`, data.car_company, entry);
        setInputValue(`car_number_${data.traveler_index}_1`, data.car_number, entry);
        setInputValue(`car_pickup_${data.traveler_index}_1`, fromISODateTime(data.car_pickup), entry);
        setInputValue(`car_dropoff_${data.traveler_index}_1`, fromISODateTime(data.car_dropoff), entry);
        setInputValue(`car_pickup_address_${data.traveler_index}_1`, data.car_pickup_address, entry);
        setInputValue(`car_dropoff_address_${data.traveler_index}_1`, data.car_dropoff_address, entry);
        setInputValue(`car_quote_${data.traveler_index}_1`, data.car_quote, entry);
      }
      
      // Populate rental trucks (from trucks JSONB array)
      const trucks = data.trucks || [];
      const truckContainer = entry.querySelector(`#truckEntries_${data.traveler_index}`);
      if (truckContainer && trucks.length > 0) {
        // First truck already exists
        const firstTruck = truckContainer.querySelector('.truck-entry');
        if (firstTruck && trucks[0]) {
          populateTruckEntry(firstTruck, data.traveler_index, 1, trucks[0]);
        }
        // Add additional trucks
        for (let i = 1; i < trucks.length; i++) {
          const newTruck = createTruckEntryElement(data.traveler_index, i + 1);
          truckContainer.appendChild(newTruck);
          populateTruckEntry(newTruck, data.traveler_index, i + 1, trucks[i]);
        }
        updateTruckRemoveButtons(truckContainer);
      } else {
        // Backward compatibility: use old single truck fields if trucks array is empty
        setInputValue(`truck_company_${data.traveler_index}_1`, data.truck_company, entry);
        setInputValue(`truck_number_${data.traveler_index}_1`, data.truck_number, entry);
        setInputValue(`truck_pickup_${data.traveler_index}_1`, fromISODateTime(data.truck_pickup), entry);
        setInputValue(`truck_dropoff_${data.traveler_index}_1`, fromISODateTime(data.truck_dropoff), entry);
        setInputValue(`truck_pickup_address_${data.traveler_index}_1`, data.truck_pickup_address, entry);
        setInputValue(`truck_dropoff_address_${data.traveler_index}_1`, data.truck_dropoff_address, entry);
        setInputValue(`truck_quote_${data.traveler_index}_1`, data.truck_quote, entry);
      }
      
      // Personal
      setInputValue(`personal_quote_${data.traveler_index}`, data.personal_quote, entry);
      
      // Populate hotels (from hotels JSONB array)
      const hotels = data.hotels || [];
      const hotelContainer = entry.querySelector(`#hotelEntries_${data.traveler_index}`);
      if (hotelContainer && hotels.length > 0) {
        // First hotel already exists
        const firstHotel = hotelContainer.querySelector('.hotel-entry');
        if (firstHotel && hotels[0]) {
          populateHotelEntry(firstHotel, data.traveler_index, 1, hotels[0]);
        }
        // Add additional hotels
        for (let i = 1; i < hotels.length; i++) {
          const newHotel = createHotelEntryElement(data.traveler_index, i + 1);
          hotelContainer.appendChild(newHotel);
          populateHotelEntry(newHotel, data.traveler_index, i + 1, hotels[i]);
        }
        updateHotelRemoveButtons(hotelContainer);
      } else {
        // Backward compatibility: use old single hotel fields if hotels array is empty
        setInputValue(`hotel_name_${data.traveler_index}_1`, data.hotel_name, entry);
        setInputValue(`hotel_location_${data.traveler_index}_1`, data.hotel_location, entry);
        setInputValue(`check_in_${data.traveler_index}_1`, fromISODateTime(data.check_in), entry);
        setInputValue(`check_out_${data.traveler_index}_1`, fromISODateTime(data.check_out), entry);
        setInputValue(`hotel_quote_${data.traveler_index}_1`, data.hotel_quote, entry);
      }
      
      // Special instructions per traveler
      setInputValue(`special_instructions_travel_${data.traveler_index}`, data.special_instructions, entry);
    }
  });
  
  initializeTravelType();
  initializeLayoverToggles();
  initializeCheckboxes();
  updateSaveStatus('travel', true);
}

// Helper function to populate flight entry (with quote_approved, has_layover, and layovers)
function populateFlightEntry(element, type, travelerIndex, flightIndex, data) {
  
  // Basic flight fields
  setInputValue(`${type}_airline_${travelerIndex}_${flightIndex}`, data.airline, element);
  setInputValue(`${type}_flight_number_${travelerIndex}_${flightIndex}`, data.flight_number, element);
  setInputValue(`${type}_from_${travelerIndex}_${flightIndex}`, data.from, element);
  setInputValue(`${type}_to_${travelerIndex}_${flightIndex}`, data.to, element);
  setInputValue(`${type}_departure_${travelerIndex}_${flightIndex}`, fromISODateTime(data.departure), element);
  setInputValue(`${type}_arrival_${travelerIndex}_${flightIndex}`, fromISODateTime(data.arrival), element);
  setInputValue(`${type}_quote_${travelerIndex}_${flightIndex}`, data.quote, element);
  setInputValue(`${type}_confirmation_${travelerIndex}_${flightIndex}`, data.confirmation, element);
  
  // Quote approved checkbox
  setCheckboxValue(`${type}_quote_approved_${travelerIndex}_${flightIndex}`, data.quote_approved, element);
  
  // Has layover radio
  const hasLayover = data.has_layover === true || data.has_layover === 'yes';
  setRadioValue(`${type}_has_layover_${travelerIndex}_${flightIndex}`, hasLayover ? 'yes' : 'no', element);
  
  // Show/hide layover section
  const layoverSection = element.querySelector(`[data-layover-section="${type}_${travelerIndex}_${flightIndex}"]`);
  if (layoverSection) {
    layoverSection.style.display = hasLayover ? 'block' : 'none';
  }
  
  // Populate layovers for this flight (layovers are inside flight object)
  const flightLayovers = data.layovers || [];
  const layoverContainer = element.querySelector(`[data-layover-container="${type}_${travelerIndex}_${flightIndex}"]`);
  if (layoverContainer && flightLayovers.length > 0) {
    // First layover already exists
    const firstLayover = layoverContainer.querySelector('.layover-entry');
    if (firstLayover && flightLayovers[0]) {
      populateLayoverEntry(firstLayover, type, travelerIndex, flightIndex, 1, flightLayovers[0]);
    }
    // Add additional layovers
    for (let i = 1; i < flightLayovers.length; i++) {
      const newLayover = createLayoverEntryElement(type, travelerIndex, flightIndex, i + 1);
      layoverContainer.appendChild(newLayover);
      populateLayoverEntry(newLayover, type, travelerIndex, flightIndex, i + 1, flightLayovers[i]);
    }
    updateLayoverRemoveButtons(layoverContainer);
  }
}

// Helper function to populate layover entry (with flightIndex)
function populateLayoverEntry(element, type, travelerIndex, flightIndex, layoverIndex, data) {
  setInputValue(`${type}_layover_airport_${travelerIndex}_${flightIndex}_${layoverIndex}`, data.airport, element);
  setInputValue(`${type}_layover_duration_${travelerIndex}_${flightIndex}_${layoverIndex}`, data.duration, element);
  setInputValue(`${type}_layover_flight_name_${travelerIndex}_${flightIndex}_${layoverIndex}`, data.flight_name, element);
  setInputValue(`${type}_layover_flight_${travelerIndex}_${flightIndex}_${layoverIndex}`, data.connecting_flight, element);
  setInputValue(`${type}_layover_departure_${travelerIndex}_${flightIndex}_${layoverIndex}`, fromISODateTime(data.departure), element);
  setInputValue(`${type}_layover_arrival_${travelerIndex}_${flightIndex}_${layoverIndex}`, fromISODateTime(data.arrival), element);
}

// Helper function to populate hotel entry
function populateHotelEntry(element, travelerIndex, hotelIndex, data) {
  setInputValue(`hotel_name_${travelerIndex}_${hotelIndex}`, data.name, element);
  setInputValue(`hotel_location_${travelerIndex}_${hotelIndex}`, data.location, element);
  setInputValue(`check_in_${travelerIndex}_${hotelIndex}`, fromISODateTime(data.check_in), element);
  setInputValue(`check_out_${travelerIndex}_${hotelIndex}`, fromISODateTime(data.check_out), element);
  setInputValue(`hotel_quote_${travelerIndex}_${hotelIndex}`, data.quote, element);
  setInputValue(`hotel_confirmation_${travelerIndex}_${hotelIndex}`, data.confirmation, element);
  setCheckboxValue(`hotel_quote_approved_${travelerIndex}_${hotelIndex}`, data.quote_approved, element);
}

// Helper function to populate car entry
function populateCarEntry(element, travelerIndex, carIndex, data) {
  setInputValue(`car_company_${travelerIndex}_${carIndex}`, data.company, element);
  setInputValue(`car_number_${travelerIndex}_${carIndex}`, data.number, element);
  setInputValue(`car_pickup_${travelerIndex}_${carIndex}`, fromISODateTime(data.pickup), element);
  setInputValue(`car_dropoff_${travelerIndex}_${carIndex}`, fromISODateTime(data.dropoff), element);
  setInputValue(`car_pickup_address_${travelerIndex}_${carIndex}`, data.pickup_address, element);
  setInputValue(`car_dropoff_address_${travelerIndex}_${carIndex}`, data.dropoff_address, element);
  setInputValue(`car_quote_${travelerIndex}_${carIndex}`, data.quote, element);
  setInputValue(`car_confirmation_${travelerIndex}_${carIndex}`, data.confirmation, element);
  setCheckboxValue(`car_quote_approved_${travelerIndex}_${carIndex}`, data.quote_approved, element);
}

// Helper function to populate truck entry
function populateTruckEntry(element, travelerIndex, truckIndex, data) {
  setInputValue(`truck_company_${travelerIndex}_${truckIndex}`, data.company, element);
  setInputValue(`truck_number_${travelerIndex}_${truckIndex}`, data.number, element);
  setInputValue(`truck_pickup_${travelerIndex}_${truckIndex}`, fromISODateTime(data.pickup), element);
  setInputValue(`truck_dropoff_${travelerIndex}_${truckIndex}`, fromISODateTime(data.dropoff), element);
  setInputValue(`truck_pickup_address_${travelerIndex}_${truckIndex}`, data.pickup_address, element);
  setInputValue(`truck_dropoff_address_${travelerIndex}_${truckIndex}`, data.dropoff_address, element);
  setInputValue(`truck_quote_${travelerIndex}_${truckIndex}`, data.quote, element);
  setInputValue(`truck_confirmation_${travelerIndex}_${truckIndex}`, data.confirmation, element);
  setCheckboxValue(`truck_quote_approved_${travelerIndex}_${truckIndex}`, data.quote_approved, element);
}

// Update remove buttons visibility
function updateFlightRemoveButtons(container) {
  const entries = container.querySelectorAll('.flight-entry');
  entries.forEach((entry, idx) => {
    const removeBtn = entry.querySelector('.remove-flight-btn');
    setRemoveButtonVisibility(removeBtn, entries.length > 1);
  });
}

function updateLayoverRemoveButtons(container) {
  const entries = container.querySelectorAll('.layover-entry');
  entries.forEach((entry, idx) => {
    const removeBtn = entry.querySelector('.remove-layover-btn');
    setRemoveButtonVisibility(removeBtn, entries.length > 1);
  });
}

function updateCarRemoveButtons(container) {
  const entries = container.querySelectorAll('.car-entry');
  entries.forEach((entry, idx) => {
    const removeBtn = entry.querySelector('.remove-car-btn');
    setRemoveButtonVisibility(removeBtn, entries.length > 1);
  });
}

function updateTruckRemoveButtons(container) {
  const entries = container.querySelectorAll('.truck-entry');
  entries.forEach((entry, idx) => {
    const removeBtn = entry.querySelector('.remove-truck-btn');
    setRemoveButtonVisibility(removeBtn, entries.length > 1);
  });
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

// Populate COI - WITH FILE DISPLAY and Names (multi-file)
function populateCOI(data) {
  const section = document.querySelector('[data-section="coi"]');
  if (!section) return;
  
  setRadioValue('coi_required', data.coi_required, section);
  
  const wrapper = document.querySelector('.coi-file-wrapper');
  if (wrapper) {
    wrapper.style.display = data.coi_required === 'yes' ? 'block' : 'none';
  }
  
  if (data.coi_file_urls || data.coi_folder_url) {
    const coiInput = section.querySelector('input[name="coi_file"]');
    const coiContainer = coiInput?.closest('.form-group') || wrapper;
    
    if (coiContainer) {
      // Build files array with names
      const urls = data.coi_file_urls || [];
      const names = data.coi_file_names || [];
      const files = urls.map((url, idx) => ({
        url: url,
        name: names[idx] || `COI Document ${idx + 1}`
      }));
      
      if (typeof setUploadedFileData === 'function') {
        setUploadedFileData('coi_documents', {
          urls: urls,
          files: files,
          folderUrl: data.coi_folder_url || ''
        });
      }
      if (typeof displayUploadedFiles === 'function') {
        displayUploadedFiles(coiContainer, urls, data.coi_folder_url, 'coi_documents');
      }
    }
  }
  
  updateSaveStatus('coi', true);
}

// Populate Booking Software
function populateBookingSoftware(data) {
  const section = document.querySelector('[data-section="booking-software"]');
  if (!section) return;
  
  // Set the radio button value
  const isBookingSoftware = data.is_booking_software ? 'yes' : 'no';
  setRadioValue('is_booking_software', isBookingSoftware, section);
  
  // Show/hide conditional fields
  const fieldsWrapper = section.querySelector('.booking-software-fields');
  if (fieldsWrapper) {
    fieldsWrapper.style.display = data.is_booking_software ? 'block' : 'none';
  }
  
  // Set input values
  setInputValue('client_graphics_folder_link', data.client_graphics_folder_link, section);
  setInputValue('generated_graphics_folder_link', data.generated_graphics_folder_link, section);
  setInputValue('booking_web_url', data.booking_web_url, section);
  setInputValue('booking_software_notes', data.notes, section);
  
  // Show/hide booking web URL open link
  const bookingWebUrlLink = document.getElementById('booking-web-url-link');
  if (bookingWebUrlLink && data.booking_web_url) {
    bookingWebUrlLink.href = data.booking_web_url;
    bookingWebUrlLink.style.display = 'flex';
  }
  
  updateSaveStatus('booking-software', true);
}

// ============================================
// UI Initialization Functions
// ============================================

function initializeAccordions() {
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      
      // Check for unsaved changes
      if (Object.values(window.unsavedSections).some(v => v)) {
        showConfirmDialog(
          'Unsaved Changes',
          'You have unsaved changes in one or more sections. Are you sure you want to switch sections?',
          () => {
            const section = header.closest('.section-card');
            const isExpanded = section.classList.contains('expanded');
            section.classList.toggle('expanded');
            section.classList.toggle('active', !isExpanded);
          }
        );
        return;
      }
      
      const section = header.closest('.section-card');
      const isExpanded = section.classList.contains('expanded');
      section.classList.toggle('expanded');
      section.classList.toggle('active', !isExpanded);
    });
  });
}

function initializeCheckboxes() {
  // Initialize regular checkbox groups (multiple selection, with other-input support)
  document.querySelectorAll('.checkbox-item:not(.single-checkbox)').forEach(item => {
    if (item.dataset.initialized) return;
    item.dataset.initialized = 'true';
    
    item.addEventListener('click', (e) => {
      // If clicking directly on the input, let browser handle it
      if (e.target.tagName === 'INPUT') {
        const checkbox = e.target;
        item.classList.toggle('checked', checkbox.checked);
        const wrapper = item.closest('.other-input-wrapper');
        if (wrapper) {
          const otherInputs = wrapper.querySelectorAll('.other-input');
          otherInputs.forEach(oi => {
            oi.disabled = !checkbox.checked;
            // Clear values when checkbox is unchecked
            if (!checkbox.checked) {
              oi.value = '';
            }
            if (checkbox.checked) oi.focus();
          });
        }
        return;
      }
      
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
            // Clear values when checkbox is unchecked
            if (!checkbox.checked) {
              oi.value = '';
            }
            if (checkbox.checked) oi.focus();
          });
        }
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
  
  // Initialize single checkboxes (standalone yes/no type)
  document.querySelectorAll('.single-checkbox').forEach(item => {
    if (item.dataset.initialized) return;
    item.dataset.initialized = 'true';
    
    item.addEventListener('click', (e) => {
      // If clicking directly on the input, let browser handle it
      if (e.target.tagName === 'INPUT') {
        item.classList.toggle('checked', e.target.checked);
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
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
            const isOther = radio.value === 'Other' || radio.value === 'third_party';
            otherInputs.forEach((oi, i) => {
              oi.disabled = !isOther;
              // Clear values when Other/3rd Party is deselected
              if (!isOther) {
                oi.value = '';
              }
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
            const isOther = radio.value === 'Other';
            otherInput.style.display = isOther ? 'block' : 'none';
            // Clear textarea value when Other is deselected
            if (!isOther) {
              const textarea = otherInput.querySelector('textarea');
              if (textarea) textarea.value = '';
            }
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
      // Check for unsaved changes before switching tabs
      if (window.unsavedSections && Object.values(window.unsavedSections).some(v => v)) {
        showConfirmDialog(
          'Unsaved Changes',
          'You have unsaved changes. Are you sure you want to switch tabs?',
          () => {
            const container = btn.closest('.section-content');
            const tabId = btn.dataset.tab;
            container.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            container.querySelector(`[data-content="${tabId}"]`)?.classList.add('active');
          }
        );
        return;
      }
      
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
          <input type="radio" name="quote_source_${index}" value="Alan">
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
    <div class="form-group">
      <label class="single-checkbox checkbox-item">
        <input type="checkbox" name="is_quote_approved_${index}">
        <span class="checkbox-custom">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
        <span class="checkbox-label">Is this quote approved?</span>
      </label>
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
      <div class="radio-group">
        <label class="radio-item">
          <input type="radio" name="truck_source_${index}" value="Zenspace">
          <span class="radio-custom"></span>
          <span class="radio-label">Enterprise</span>
        </label>
        <label class="radio-item">
          <input type="radio" name="truck_source_${index}" value="Axle Logistics">
          <span class="radio-custom"></span>
          <span class="radio-label">Axle Logistics</span>
        </label>
        <label class="radio-item">
          <input type="radio" name="truck_source_${index}" value="Edward">
          <span class="radio-custom"></span>
          <span class="radio-label">Edward</span>
        </label>
        <div class="other-input-wrapper">
          <label class="radio-item">
            <input type="radio" name="truck_source_${index}" value="Other">
            <span class="radio-custom"></span>
            <span class="radio-label">Other</span>
          </label>
          <input type="text" class="other-input" name="truck_source_${index}_other_name" placeholder="Enter name..." disabled>
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
      <label class="form-label">Truck Quote</label>
      <input type="text" class="form-input" name="truck_quote_${index}" placeholder="$0.00">
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
          <input type="radio" name="pickup_warehouse_${index}" value="NJ">
          <span class="radio-custom"></span>
          <div class="address-content">
            <div class="address-title">${NycWarehouse} </div>
            <div class="address-details">${NycWarehouseAddress}</div>
          </div>
        </label>
        <label class="address-option">
          <input type="radio" name="pickup_warehouse_${index}" value="Hayward">
          <span class="radio-custom"></span>
          <div class="address-content">
            <div class="address-title">${HaywardWarehouse}</div>
            <div class="address-details">${HaywardWarehouseAddress}</div>
          </div>
        </label>
        <label class="address-option">
          <input type="radio" name="pickup_warehouse_${index}" value="Other">
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
    
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Delivery Date & Time</label>
        <input type="datetime-local" class="form-input" name="delivery_datetime_${index}">
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label">Delivery Address</label>
      <input type="text" class="form-input" name="delivery_address_${index}" placeholder="Enter delivery address">
    </div>



    <!-- Driver Details - Dynamic Entries -->
    <div class="form-group">
      <label class="form-label">Driver Details</label>
      <div id="driverEntries_${index}">
        <div class="driver-entry" data-driver-index="1">
          <div class="entry-header" style="margin-bottom: 8px;">
            <div class="entry-number">
              <span class="entry-badge" style="width: 20px; height: 20px; font-size: 10px;">1</span>
              <span class="entry-label" style="font-size: 13px;">Driver #1</span>
            </div>
            <button type="button" class="remove-entry-btn remove-driver-btn is-hidden" onclick="removeDriverEntry(this)" aria-label="Remove driver">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="text" class="form-input" name="driver_name_${index}_1" placeholder="Driver Name" style="flex:1; min-width:0;">
            <input type="text" class="form-input" name="driver_mobile_${index}_1" placeholder="Driver Mobile" style="flex:1; min-width:0;">
            <input type="email" class="form-input" name="driver_email_${index}_1" placeholder="Driver Email" style="flex:1; min-width:0;">
          </div>
        </div>
      </div>
      <button type="button" class="add-more-btn add-driver-btn" data-trucking-index="${index}" onclick="addDriverEntry(this)" style="margin-top: 10px; padding: 8px 12px; font-size: 13px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>Add Another Driver</span>
      </button>
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

    <div class="form-group">
      <label class="single-checkbox checkbox-item">
        <input type="checkbox" name="is_trucking_quote_approved_${index}">
        <span class="checkbox-custom">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
        <span class="checkbox-label">Is this quote approved?</span>
      </label>
    </div>
  `;
  
  return entry;
}

// Create a driver entry for a trucking route
function createDriverEntry(truckingIndex, driverIndex) {
  const entry = document.createElement('div');
  entry.className = 'driver-entry';
  entry.dataset.driverIndex = driverIndex;
  
  entry.innerHTML = `
    <div class="entry-header" style="margin-bottom: 8px;">
      <div class="entry-number">
        <span class="entry-badge" style="width: 20px; height: 20px; font-size: 10px;">${driverIndex}</span>
        <span class="entry-label" style="font-size: 13px;">Driver #${driverIndex}</span>
      </div>
      <button type="button" class="remove-entry-btn remove-driver-btn" onclick="removeDriverEntry(this)" aria-label="Remove driver">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div style="display:flex; gap:8px; align-items:center;">
      <input type="text" class="form-input" name="driver_name_${truckingIndex}_${driverIndex}" placeholder="Driver Name" style="flex:1; min-width:0;">
      <input type="text" class="form-input" name="driver_mobile_${truckingIndex}_${driverIndex}" placeholder="Driver Mobile" style="flex:1; min-width:0;">
      <input type="email" class="form-input" name="driver_email_${truckingIndex}_${driverIndex}" placeholder="Driver Email" style="flex:1; min-width:0;">
    </div>
  `;
  
  return entry;
}

// Add a new driver entry to a trucking route
function addDriverEntry(button) {
  const truckingIndex = button.dataset.truckingIndex;
  const container = document.getElementById(`driverEntries_${truckingIndex}`);
  
  if (!container) return;
  
  const existingEntries = container.querySelectorAll('.driver-entry');
  const newIndex = existingEntries.length + 1;
  
  const newEntry = createDriverEntry(truckingIndex, newIndex);
  container.appendChild(newEntry);
  
  // Show remove buttons on all entries except the first one
  existingEntries.forEach((entry, idx) => {
    const removeBtn = entry.querySelector('.remove-driver-btn');
    setRemoveButtonVisibility(removeBtn, idx > 0);
  });

  setRemoveButtonVisibility(newEntry.querySelector('.remove-driver-btn'), true);
}

// Remove a driver entry
function removeDriverEntry(button) {
  const driverEntry = button.closest('.driver-entry');
  const container = driverEntry?.parentElement;
  
  if (!driverEntry || !container) return;
  
  driverEntry.remove();
  
  // Re-index remaining entries
  const remainingEntries = container.querySelectorAll('.driver-entry');
  remainingEntries.forEach((entry, idx) => {
    const newIndex = idx + 1;
    entry.dataset.driverIndex = newIndex;
    
    // Update badge and label
    const badge = entry.querySelector('.entry-badge');
    const label = entry.querySelector('.entry-label');
    if (badge) badge.textContent = newIndex;
    if (label) label.textContent = `Driver #${newIndex}`;
    
    // Update input names
    const truckingIndex = container.id.replace('driverEntries_', '');
    const inputs = entry.querySelectorAll('input');
    inputs.forEach(input => {
      const nameMatch = input.name.match(/^(driver_\w+)_\d+_\d+$/);
      if (nameMatch) {
        input.name = `${nameMatch[1]}_${truckingIndex}_${newIndex}`;
      }
    });
    
    // Show/hide remove button
    const removeBtn = entry.querySelector('.remove-driver-btn');
    setRemoveButtonVisibility(removeBtn, idx !== 0);
  });
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
        <label class="radio-item"><input type="radio" name="traveler_name_${index}" value="Eliseo"><span class="radio-custom"></span><span class="radio-label">Eliseo</span></label>
        <label class="radio-item"><input type="radio" name="traveler_name_${index}" value="Clinton"><span class="radio-custom"></span><span class="radio-label">Clinton</span></label>
        <label class="radio-item"><input type="radio" name="traveler_name_${index}" value="Edward"><span class="radio-custom"></span><span class="radio-label">Edward</span></label>
        <div class="other-input-wrapper">
          <label class="radio-item"><input type="radio" name="traveler_name_${index}" value="Other"><span class="radio-custom"></span><span class="radio-label">Other</span></label>
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
      
      <!-- ONE-WAY FLIGHTS -->
      <div class="flight-section">
        <div class="flight-section-header"><h4 class="flight-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>One-Way Flight</h4></div>
        <div id="onewayFlights_${index}" class="flight-entries-container">
          <div class="flight-entry" data-flight-index="1" data-flight-type="oneway">
            <div class="entry-header">
              <span class="entry-badge">1</span>
              <span class="entry-label">Flight #1</span>
              <button type="button" class="remove-entry-btn remove-flight-btn is-hidden" onclick="removeFlightEntry(this, 'oneway', ${index})" aria-label="Remove flight">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Airline</label><input type="text" class="form-input" name="oneway_airline_${index}_1" placeholder="e.g., Delta, United"></div>
              <div class="form-group"><label class="form-label">Flight Number</label><input type="text" class="form-input" name="oneway_flight_number_${index}_1" placeholder="e.g., DL1234"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">From</label><input type="text" class="form-input" name="oneway_from_${index}_1" placeholder="Departure City/Airport"></div>
              <div class="form-group"><label class="form-label">To</label><input type="text" class="form-input" name="oneway_to_${index}_1" placeholder="Arrival City/Airport"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Departure</label><input type="datetime-local" class="form-input" name="oneway_departure_${index}_1"></div>
              <div class="form-group"><label class="form-label">Arrival</label><input type="datetime-local" class="form-input" name="oneway_arrival_${index}_1"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Quote</label><input type="text" class="form-input" name="oneway_quote_${index}_1" placeholder="$0.00"></div>
              <div class="form-group"><label class="form-label">Confirmation #</label><input type="text" class="form-input" name="oneway_confirmation_${index}_1" placeholder="Booking confirmation"></div>
            </div>
            <div class="form-group approval-checkbox-group"><label class="single-checkbox"><input type="checkbox" name="oneway_quote_approved_${index}_1"><span class="checkbox-custom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span><span class="checkbox-label">Is this quote approved?</span></label></div>
            <div class="layover-toggle"><label class="form-label">Has Layover?</label><div class="radio-group"><label class="radio-item"><input type="radio" name="oneway_has_layover_${index}_1" value="no" checked><span class="radio-custom"></span><span class="radio-label">No</span></label><label class="radio-item"><input type="radio" name="oneway_has_layover_${index}_1" value="yes"><span class="radio-custom"></span><span class="radio-label">Yes</span></label></div></div>
            <div class="layover-section" data-layover-section="oneway_${index}_1" style="display: none;">
              <div class="layover-section-header"><h5 class="layover-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>Layover Details</h5></div>
              <div class="layover-entries-container" data-layover-container="oneway_${index}_1">
                <div class="layover-entry" data-layover-index="1">
                  <div class="entry-header">
                    <span class="entry-badge layover-badge">L1</span>
                    <span class="entry-label">Layover #1</span>
                    <button type="button" class="remove-entry-btn remove-layover-btn is-hidden" onclick="removeLayoverEntry(this, 'oneway', ${index}, 1)" aria-label="Remove layover">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                  <div class="form-row"><div class="form-group"><label class="form-label">Layover Airport</label><input type="text" class="form-input" name="oneway_layover_airport_${index}_1_1" placeholder="e.g., ORD, ATL"></div><div class="form-group"><label class="form-label">Duration</label><input type="text" class="form-input" name="oneway_layover_duration_${index}_1_1" placeholder="e.g., 2h 30m"></div></div>
                  <div class="form-row"><div class="form-group"><label class="form-label">Connecting Flight Name</label><input type="text" class="form-input" name="oneway_layover_flight_name_${index}_1_1" placeholder="e.g., Delta, United"></div><div class="form-group"><label class="form-label">Connecting Flight Number</label><input type="text" class="form-input" name="oneway_layover_flight_${index}_1_1" placeholder="e.g., DL5678"></div></div>
                  <div class="form-row"><div class="form-group"><label class="form-label">Departure Time</label><input type="datetime-local" class="form-input" name="oneway_layover_departure_${index}_1_1"></div><div class="form-group"><label class="form-label">Arrival Time</label><input type="datetime-local" class="form-input" name="oneway_layover_arrival_${index}_1_1"></div></div>
                </div>
              </div>
              <button type="button" class="add-layover-btn" data-traveler-index="${index}" data-flight-index="1" data-flight-type="oneway" onclick="addLayoverEntry(this)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Add Another Layover</button>
            </div>
          </div>
        </div>
        <button type="button" class="add-flight-btn" data-traveler-index="${index}" data-flight-type="oneway" onclick="addFlightEntry(this)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Add Another One-Way Flight</button>
      </div>
      
      <!-- RETURN FLIGHTS -->
      <div class="flight-section return-flight-section">
        <div class="flight-section-header"><h4 class="flight-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Return Flight</h4></div>
        <div id="returnFlights_${index}" class="flight-entries-container">
          <div class="flight-entry" data-flight-index="1" data-flight-type="return">
            <div class="entry-header">
              <span class="entry-badge return-badge">1</span>
              <span class="entry-label">Flight #1</span>
              <button type="button" class="remove-entry-btn remove-flight-btn is-hidden" onclick="removeFlightEntry(this, 'return', ${index})" aria-label="Remove flight">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Airline</label><input type="text" class="form-input" name="return_airline_${index}_1" placeholder="e.g., Delta, United"></div>
              <div class="form-group"><label class="form-label">Flight Number</label><input type="text" class="form-input" name="return_flight_number_${index}_1" placeholder="e.g., DL5678"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">From</label><input type="text" class="form-input" name="return_from_${index}_1" placeholder="Departure City/Airport"></div>
              <div class="form-group"><label class="form-label">To</label><input type="text" class="form-input" name="return_to_${index}_1" placeholder="Arrival City/Airport"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Departure</label><input type="datetime-local" class="form-input" name="return_departure_${index}_1"></div>
              <div class="form-group"><label class="form-label">Arrival</label><input type="datetime-local" class="form-input" name="return_arrival_${index}_1"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Quote</label><input type="text" class="form-input" name="return_quote_${index}_1" placeholder="$0.00"></div>
              <div class="form-group"><label class="form-label">Confirmation #</label><input type="text" class="form-input" name="return_confirmation_${index}_1" placeholder="Booking confirmation"></div>
            </div>
            <div class="form-group approval-checkbox-group"><label class="single-checkbox"><input type="checkbox" name="return_quote_approved_${index}_1"><span class="checkbox-custom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span><span class="checkbox-label">Is this quote approved?</span></label></div>
            <div class="layover-toggle"><label class="form-label">Has Layover?</label><div class="radio-group"><label class="radio-item"><input type="radio" name="return_has_layover_${index}_1" value="no" checked><span class="radio-custom"></span><span class="radio-label">No</span></label><label class="radio-item"><input type="radio" name="return_has_layover_${index}_1" value="yes"><span class="radio-custom"></span><span class="radio-label">Yes</span></label></div></div>
            <div class="layover-section" data-layover-section="return_${index}_1" style="display: none;">
              <div class="layover-section-header"><h5 class="layover-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>Layover Details</h5></div>
              <div class="layover-entries-container" data-layover-container="return_${index}_1">
                <div class="layover-entry" data-layover-index="1">
                  <div class="entry-header">
                    <span class="entry-badge layover-badge">L1</span>
                    <span class="entry-label">Layover #1</span>
                    <button type="button" class="remove-entry-btn remove-layover-btn is-hidden" onclick="removeLayoverEntry(this, 'return', ${index}, 1)" aria-label="Remove layover">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                  <div class="form-row"><div class="form-group"><label class="form-label">Layover Airport</label><input type="text" class="form-input" name="return_layover_airport_${index}_1_1" placeholder="e.g., ORD, ATL"></div><div class="form-group"><label class="form-label">Duration</label><input type="text" class="form-input" name="return_layover_duration_${index}_1_1" placeholder="e.g., 2h 30m"></div></div>
                  <div class="form-row"><div class="form-group"><label class="form-label">Connecting Flight Name</label><input type="text" class="form-input" name="return_layover_flight_name_${index}_1_1" placeholder="e.g., Delta, United"></div><div class="form-group"><label class="form-label">Connecting Flight Number</label><input type="text" class="form-input" name="return_layover_flight_${index}_1_1" placeholder="e.g., DL5678"></div></div>
                  <div class="form-row"><div class="form-group"><label class="form-label">Departure Time</label><input type="datetime-local" class="form-input" name="return_layover_departure_${index}_1_1"></div><div class="form-group"><label class="form-label">Arrival Time</label><input type="datetime-local" class="form-input" name="return_layover_arrival_${index}_1_1"></div></div>
                </div>
              </div>
              <button type="button" class="add-layover-btn" data-traveler-index="${index}" data-flight-index="1" data-flight-type="return" onclick="addLayoverEntry(this)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Add Another Layover</button>
            </div>
          </div>
        </div>
        <button type="button" class="add-flight-btn" data-traveler-index="${index}" data-flight-type="return" onclick="addFlightEntry(this)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Add Another Return Flight</button>
      </div>
    </div>
    
    <div class="travel-subsection" data-travel-type="rental_car" style="display: none;">
      <div class="travel-subsection-title"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"></path><circle cx="6.5" cy="16.5" r="2.5"></circle><circle cx="16.5" cy="16.5" r="2.5"></circle></svg><span>Rental Car Details</span></div>
      <div class="car-entries-container" id="carEntries_${index}">
        <div class="car-entry" data-car-index="1">
          <div class="entry-header">
            <span class="entry-badge">1</span>
            <span class="entry-label">Car #1</span>
            <button type="button" class="remove-entry-btn remove-car-btn is-hidden" onclick="removeCarEntry(this, ${index})" aria-label="Remove car">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Car Company</label><input type="text" class="form-input" name="car_company_${index}_1" placeholder="e.g., Enterprise, Hertz"></div>
            <div class="form-group"><label class="form-label">Car Number / Type</label><input type="text" class="form-input" name="car_number_${index}_1" placeholder="e.g., Sedan, SUV"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Pickup</label><input type="datetime-local" class="form-input" name="car_pickup_${index}_1"></div>
            <div class="form-group"><label class="form-label">Drop-off</label><input type="datetime-local" class="form-input" name="car_dropoff_${index}_1"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Pickup Address</label><textarea class="form-input" name="car_pickup_address_${index}_1" placeholder="Pickup location"></textarea></div>
            <div class="form-group"><label class="form-label">Drop-off Address</label><textarea class="form-input" name="car_dropoff_address_${index}_1" placeholder="Drop-off location"></textarea></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Quote</label><input type="text" class="form-input" name="car_quote_${index}_1" placeholder="$0.00"></div>
            <div class="form-group"><label class="form-label">Confirmation #</label><input type="text" class="form-input" name="car_confirmation_${index}_1" placeholder="Booking confirmation"></div>
          </div>
          <div class="form-group approval-checkbox-group"><label class="single-checkbox"><input type="checkbox" name="car_quote_approved_${index}_1"><span class="checkbox-custom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span><span class="checkbox-label">Is this quote approved?</span></label></div>
        </div>
      </div>
      <button type="button" class="add-entry-btn" onclick="addCarEntry(${index})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Add Another Car</button>
    </div>
    
    <div class="travel-subsection" data-travel-type="rental_truck" style="display: none;">
      <div class="travel-subsection-title"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"></path><circle cx="6.5" cy="16.5" r="2.5"></circle><circle cx="16.5" cy="16.5" r="2.5"></circle></svg><span>Rental Truck Details</span></div>
      <div class="truck-entries-container" id="truckEntries_${index}">
        <div class="truck-entry" data-truck-index="1">
          <div class="entry-header">
            <span class="entry-badge">1</span>
            <span class="entry-label">Truck #1</span>
            <button type="button" class="remove-entry-btn remove-truck-btn is-hidden" onclick="removeTruckEntry(this, ${index})" aria-label="Remove truck">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Truck Company</label><input type="text" class="form-input" name="truck_company_${index}_1" placeholder="e.g., U-Haul, Penske"></div>
            <div class="form-group"><label class="form-label">Truck Number / Type</label><input type="text" class="form-input" name="truck_number_${index}_1" placeholder="e.g., 10ft, 15ft Box Truck"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Pickup</label><input type="datetime-local" class="form-input" name="truck_pickup_${index}_1"></div>
            <div class="form-group"><label class="form-label">Drop-off</label><input type="datetime-local" class="form-input" name="truck_dropoff_${index}_1"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Pickup Address</label><textarea class="form-input" name="truck_pickup_address_${index}_1" placeholder="Pickup location"></textarea></div>
            <div class="form-group"><label class="form-label">Drop-off Address</label><textarea class="form-input" name="truck_dropoff_address_${index}_1" placeholder="Drop-off location"></textarea></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Quote</label><input type="text" class="form-input" name="truck_quote_${index}_1" placeholder="$0.00"></div>
            <div class="form-group"><label class="form-label">Confirmation #</label><input type="text" class="form-input" name="truck_confirmation_${index}_1" placeholder="Booking confirmation"></div>
          </div>
          <div class="form-group approval-checkbox-group"><label class="single-checkbox"><input type="checkbox" name="truck_quote_approved_${index}_1"><span class="checkbox-custom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span><span class="checkbox-label">Is this quote approved?</span></label></div>
        </div>
      </div>
      <button type="button" class="add-entry-btn" onclick="addTruckEntry(${index})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Add Another Truck</button>
    </div>
    
    <div class="travel-subsection" data-travel-type="personal" style="display: none;">
      <div class="travel-subsection-title"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"></path><circle cx="6.5" cy="16.5" r="2.5"></circle><circle cx="16.5" cy="16.5" r="2.5"></circle></svg><span>Personal</span></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Quote</label><input type="text" class="form-input" name="personal_quote_${index}"></div></div>
    </div>
    
    <div class="travel-subsection">
      <div class="travel-subsection-title"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4M5 21V10.85M19 21V10.85"></path></svg><span>Hotel</span></div>
      <div class="hotel-entries-container" id="hotelEntries_${index}">
        <div class="hotel-entry" data-hotel-index="1">
          <div class="entry-header">
            <span class="entry-badge hotel-badge">1</span>
            <span class="entry-label">Hotel #1</span>
            <button type="button" class="remove-entry-btn remove-hotel-btn is-hidden" onclick="removeHotelEntry(this, ${index})" aria-label="Remove hotel">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Hotel Name</label><input type="text" class="form-input" name="hotel_name_${index}_1" placeholder="Hotel Name"></div>
            <div class="form-group"><label class="form-label">Hotel Location</label><textarea class="form-input" name="hotel_location_${index}_1" placeholder="Hotel Location"></textarea></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Check In</label><input type="datetime-local" class="form-input" name="check_in_${index}_1"></div>
            <div class="form-group"><label class="form-label">Check Out</label><input type="datetime-local" class="form-input" name="check_out_${index}_1"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Quote</label><input type="text" class="form-input" name="hotel_quote_${index}_1" placeholder="$0.00"></div>
            <div class="form-group"><label class="form-label">Confirmation #</label><input type="text" class="form-input" name="hotel_confirmation_${index}_1" placeholder="Booking confirmation"></div>
          </div>
          <div class="form-group approval-checkbox-group"><label class="single-checkbox"><input type="checkbox" name="hotel_quote_approved_${index}_1"><span class="checkbox-custom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span><span class="checkbox-label">Is this quote approved?</span></label></div>
        </div>
      </div>
      <button type="button" class="add-hotel-btn" data-traveler-index="${index}" onclick="addHotelEntry(this)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Add Another Hotel</button>
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

// ============================================
// Flight Entry Functions
// ============================================

function createFlightEntryElement(type, travelerIndex, flightIndex) {
  const badgeClass = type === 'return' ? 'return-badge' : '';
  const entry = document.createElement('div');
  entry.className = 'flight-entry';
  entry.dataset.flightIndex = flightIndex;
  entry.dataset.flightType = type;
  
  entry.innerHTML = `
    <div class="entry-header">
      <span class="entry-badge ${badgeClass}">${flightIndex}</span>
      <span class="entry-label">Flight #${flightIndex}</span>
      <button type="button" class="remove-entry-btn remove-flight-btn" onclick="removeFlightEntry(this, '${type}', ${travelerIndex})" aria-label="Remove flight">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Airline</label><input type="text" class="form-input" name="${type}_airline_${travelerIndex}_${flightIndex}" placeholder="e.g., Delta, United"></div>
      <div class="form-group"><label class="form-label">Flight Number</label><input type="text" class="form-input" name="${type}_flight_number_${travelerIndex}_${flightIndex}" placeholder="e.g., DL1234"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">From</label><input type="text" class="form-input" name="${type}_from_${travelerIndex}_${flightIndex}" placeholder="Departure City/Airport"></div>
      <div class="form-group"><label class="form-label">To</label><input type="text" class="form-input" name="${type}_to_${travelerIndex}_${flightIndex}" placeholder="Arrival City/Airport"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Departure</label><input type="datetime-local" class="form-input" name="${type}_departure_${travelerIndex}_${flightIndex}"></div>
      <div class="form-group"><label class="form-label">Arrival</label><input type="datetime-local" class="form-input" name="${type}_arrival_${travelerIndex}_${flightIndex}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Quote</label><input type="text" class="form-input" name="${type}_quote_${travelerIndex}_${flightIndex}" placeholder="$0.00"></div>
      <div class="form-group"><label class="form-label">Confirmation #</label><input type="text" class="form-input" name="${type}_confirmation_${travelerIndex}_${flightIndex}" placeholder="Booking confirmation"></div>
    </div>
    
    <!-- Quote Approval -->
    <div class="form-group approval-checkbox-group">
      <label class="single-checkbox">
        <input type="checkbox" name="${type}_quote_approved_${travelerIndex}_${flightIndex}">
        <span class="checkbox-custom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
        <span class="checkbox-label">Is this quote approved?</span>
      </label>
    </div>
    
    <!-- Has Layover Toggle -->
    <div class="layover-toggle">
      <label class="form-label">Has Layover?</label>
      <div class="radio-group">
        <label class="radio-item"><input type="radio" name="${type}_has_layover_${travelerIndex}_${flightIndex}" value="no" checked><span class="radio-custom"></span><span class="radio-label">No</span></label>
        <label class="radio-item"><input type="radio" name="${type}_has_layover_${travelerIndex}_${flightIndex}" value="yes"><span class="radio-custom"></span><span class="radio-label">Yes</span></label>
      </div>
    </div>
    
    <!-- Layover Details Section -->
    <div class="layover-section" data-layover-section="${type}_${travelerIndex}_${flightIndex}" style="display: none;">
      <div class="layover-section-header">
        <h5 class="layover-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          Layover Details
        </h5>
      </div>
      <div class="layover-entries-container" data-layover-container="${type}_${travelerIndex}_${flightIndex}">
        <div class="layover-entry" data-layover-index="1">
          <div class="entry-header">
            <span class="entry-badge layover-badge">L1</span>
            <span class="entry-label">Layover #1</span>
      <button type="button" class="remove-entry-btn remove-layover-btn is-hidden" onclick="removeLayoverEntry(this, '${type}', ${travelerIndex}, ${flightIndex})" aria-label="Remove layover">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Layover Airport</label><input type="text" class="form-input" name="${type}_layover_airport_${travelerIndex}_${flightIndex}_1" placeholder="e.g., ORD, ATL"></div>
            <div class="form-group"><label class="form-label">Duration</label><input type="text" class="form-input" name="${type}_layover_duration_${travelerIndex}_${flightIndex}_1" placeholder="e.g., 2h 30m"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Connecting Flight Name</label><input type="text" class="form-input" name="${type}_layover_flight_name_${travelerIndex}_${flightIndex}_1" placeholder="e.g., Delta, United"></div>
            <div class="form-group"><label class="form-label">Connecting Flight Number</label><input type="text" class="form-input" name="${type}_layover_flight_${travelerIndex}_${flightIndex}_1" placeholder="e.g., DL5678"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Departure Time</label><input type="datetime-local" class="form-input" name="${type}_layover_departure_${travelerIndex}_${flightIndex}_1"></div>
            <div class="form-group"><label class="form-label">Arrival Time</label><input type="datetime-local" class="form-input" name="${type}_layover_arrival_${travelerIndex}_${flightIndex}_1"></div>
          </div>
        </div>
      </div>
      <button type="button" class="add-layover-btn" data-traveler-index="${travelerIndex}" data-flight-index="${flightIndex}" data-flight-type="${type}" onclick="addLayoverEntry(this)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Add Another Layover
      </button>
    </div>
  `;
  
  return entry;
}

function addFlightEntry(button) {
  const travelerIndex = button.dataset.travelerIndex;
  const flightType = button.dataset.flightType;
  const containerId = `${flightType}Flights_${travelerIndex}`;
  const container = document.getElementById(containerId);
  
  if (container) {
    const existingEntries = container.querySelectorAll('.flight-entry');
    const newIndex = existingEntries.length + 1;
    const newEntry = createFlightEntryElement(flightType, travelerIndex, newIndex);
    container.appendChild(newEntry);
    updateFlightRemoveButtons(container);
    initializeCheckboxes();
    initializeRadios();
    initializeLayoverToggles();
    newEntry.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function removeFlightEntry(button, type, travelerIndex) {
  const entry = button.closest('.flight-entry');
  const container = entry?.parentElement;
  
  if (entry && container) {
    entry.style.opacity = '0';
    entry.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      entry.remove();
      reindexFlightEntries(container, type, travelerIndex);
      updateFlightRemoveButtons(container);
    }, 300);
  }
}

function reindexFlightEntries(container, type, travelerIndex) {
  const entries = container.querySelectorAll('.flight-entry');
  entries.forEach((entry, idx) => {
    const newIndex = idx + 1;
    entry.dataset.flightIndex = newIndex;
    
    // Update badge
    const badge = entry.querySelector('.entry-badge');
    if (badge) badge.textContent = newIndex;
    
    // Update label
    const label = entry.querySelector('.entry-label');
    if (label) label.textContent = `Flight #${newIndex}`;
    
    // Update remove button onclick
    const removeBtn = entry.querySelector('.remove-flight-btn');
    if (removeBtn) {
      removeBtn.setAttribute('onclick', `removeFlightEntry(this, '${type}', ${travelerIndex})`);
    }
    
    // Update all input names
    const inputs = entry.querySelectorAll('input');
    inputs.forEach(input => {
      const name = input.name;
      if (name) {
        // Match pattern like "oneway_airline_1_2" and replace the last number
        const parts = name.split('_');
        if (parts.length >= 3) {
          parts[parts.length - 1] = newIndex;
          input.name = parts.join('_');
        }
      }
    });
  });
}

// ============================================
// Layover Entry Functions
// ============================================

function createLayoverEntryElement(type, travelerIndex, flightIndex, layoverIndex) {
  const entry = document.createElement('div');
  entry.className = 'layover-entry';
  entry.dataset.layoverIndex = layoverIndex;
  
  entry.innerHTML = `
    <div class="entry-header">
      <span class="entry-badge layover-badge">L${layoverIndex}</span>
      <span class="entry-label">Layover #${layoverIndex}</span>
      <button type="button" class="remove-entry-btn remove-layover-btn" onclick="removeLayoverEntry(this, '${type}', ${travelerIndex}, ${flightIndex})" aria-label="Remove layover">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Layover Airport</label><input type="text" class="form-input" name="${type}_layover_airport_${travelerIndex}_${flightIndex}_${layoverIndex}" placeholder="e.g., ORD, ATL"></div>
      <div class="form-group"><label class="form-label">Duration</label><input type="text" class="form-input" name="${type}_layover_duration_${travelerIndex}_${flightIndex}_${layoverIndex}" placeholder="e.g., 2h 30m"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Connecting Flight Name</label><input type="text" class="form-input" name="${type}_layover_flight_name_${travelerIndex}_${flightIndex}_${layoverIndex}" placeholder="e.g., Delta, United"></div>
      <div class="form-group"><label class="form-label">Connecting Flight Number</label><input type="text" class="form-input" name="${type}_layover_flight_${travelerIndex}_${flightIndex}_${layoverIndex}" placeholder="e.g., DL5678"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Departure Time</label><input type="datetime-local" class="form-input" name="${type}_layover_departure_${travelerIndex}_${flightIndex}_${layoverIndex}"></div>
      <div class="form-group"><label class="form-label">Arrival Time</label><input type="datetime-local" class="form-input" name="${type}_layover_arrival_${travelerIndex}_${flightIndex}_${layoverIndex}"></div>
    </div>
  `;
  
  return entry;
}

function addLayoverEntry(button) {
  const travelerIndex = button.dataset.travelerIndex;
  const flightIndex = button.dataset.flightIndex;
  const flightType = button.dataset.flightType;
  const container = button.closest('.layover-section').querySelector('.layover-entries-container');
  
  if (container) {
    const existingEntries = container.querySelectorAll('.layover-entry');
    const newIndex = existingEntries.length + 1;
    const newEntry = createLayoverEntryElement(flightType, travelerIndex, flightIndex, newIndex);
    container.appendChild(newEntry);
    updateLayoverRemoveButtons(container);
    newEntry.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function removeLayoverEntry(button, type, travelerIndex, flightIndex) {
  const entry = button.closest('.layover-entry');
  const container = entry?.parentElement;
  
  if (entry && container) {
    entry.style.opacity = '0';
    entry.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      entry.remove();
      reindexLayoverEntries(container, type, travelerIndex, flightIndex);
      updateLayoverRemoveButtons(container);
    }, 300);
  }
}

function reindexLayoverEntries(container, type, travelerIndex, flightIndex) {
  const entries = container.querySelectorAll('.layover-entry');
  entries.forEach((entry, idx) => {
    const newIndex = idx + 1;
    entry.dataset.layoverIndex = newIndex;
    
    // Update badge
    const badge = entry.querySelector('.entry-badge');
    if (badge) badge.textContent = `L${newIndex}`;
    
    // Update label
    const label = entry.querySelector('.entry-label');
    if (label) label.textContent = `Layover #${newIndex}`;
    
    // Update remove button onclick
    const removeBtn = entry.querySelector('.remove-layover-btn');
    if (removeBtn) {
      removeBtn.setAttribute('onclick', `removeLayoverEntry(this, '${type}', ${travelerIndex}, ${flightIndex})`);
    }
    
    // Update all input names
    const inputs = entry.querySelectorAll('input');
    inputs.forEach(input => {
      const name = input.name;
      if (name) {
        const parts = name.split('_');
        if (parts.length >= 5) {
          parts[parts.length - 1] = newIndex;
          input.name = parts.join('_');
        }
      }
    });
  });
}

// ============================================
// Layover Toggle Initialization
// ============================================

function initializeLayoverToggles() {
  // Layover toggles for all flight entries (oneway and return)
  document.querySelectorAll('input[name^="oneway_has_layover_"], input[name^="return_has_layover_"]').forEach(radio => {
    radio.addEventListener('change', function() {
      // Parse name like "oneway_has_layover_1_1" to get type, travelerIndex, flightIndex
      const nameParts = this.name.split('_');
      const type = nameParts[0]; // oneway or return
      const travelerIndex = nameParts[3];
      const flightIndex = nameParts[4];
      const layoverSectionKey = `${type}_${travelerIndex}_${flightIndex}`;
      const layoverSection = document.querySelector(`[data-layover-section="${layoverSectionKey}"]`);
      if (layoverSection) {
        layoverSection.style.display = this.value === 'yes' ? 'block' : 'none';
      }
    });
  });
}

// ============================================
// Hotel Entry Functions
// ============================================

function createHotelEntryElement(travelerIndex, hotelIndex) {
  const entry = document.createElement('div');
  entry.className = 'hotel-entry';
  entry.dataset.hotelIndex = hotelIndex;
  
  entry.innerHTML = `
    <div class="entry-header">
      <span class="entry-badge hotel-badge">${hotelIndex}</span>
      <span class="entry-label">Hotel #${hotelIndex}</span>
      <button type="button" class="remove-entry-btn remove-hotel-btn" onclick="removeHotelEntry(this, ${travelerIndex})" aria-label="Remove hotel">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Hotel Name</label><input type="text" class="form-input" name="hotel_name_${travelerIndex}_${hotelIndex}" placeholder="Hotel Name"></div>
      <div class="form-group"><label class="form-label">Hotel Location</label><textarea class="form-input" name="hotel_location_${travelerIndex}_${hotelIndex}" placeholder="Hotel Location"></textarea></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Check In</label><input type="datetime-local" class="form-input" name="check_in_${travelerIndex}_${hotelIndex}"></div>
      <div class="form-group"><label class="form-label">Check Out</label><input type="datetime-local" class="form-input" name="check_out_${travelerIndex}_${hotelIndex}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Quote</label><input type="text" class="form-input" name="hotel_quote_${travelerIndex}_${hotelIndex}" placeholder="$0.00"></div>
      <div class="form-group"><label class="form-label">Confirmation #</label><input type="text" class="form-input" name="hotel_confirmation_${travelerIndex}_${hotelIndex}" placeholder="Booking confirmation"></div>
    </div>
    <div class="form-group approval-checkbox-group">
      <label class="single-checkbox">
        <input type="checkbox" name="hotel_quote_approved_${travelerIndex}_${hotelIndex}">
        <span class="checkbox-custom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
        <span class="checkbox-label">Is this quote approved?</span>
      </label>
    </div>
  `;
  
  return entry;
}

function addHotelEntry(button) {
  const travelerIndex = button.dataset.travelerIndex;
  const containerId = `hotelEntries_${travelerIndex}`;
  const container = document.getElementById(containerId);
  
  if (container) {
    const existingEntries = container.querySelectorAll('.hotel-entry');
    const newIndex = existingEntries.length + 1;
    const newEntry = createHotelEntryElement(travelerIndex, newIndex);
    container.appendChild(newEntry);
    updateHotelRemoveButtons(container);
    initializeCheckboxes();
    newEntry.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function removeHotelEntry(button, travelerIndex) {
  const entry = button.closest('.hotel-entry');
  const container = entry?.parentElement;
  
  if (entry && container) {
    entry.style.opacity = '0';
    entry.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      entry.remove();
      reindexHotelEntries(container, travelerIndex);
      updateHotelRemoveButtons(container);
    }, 300);
  }
}

function reindexHotelEntries(container, travelerIndex) {
  const entries = container.querySelectorAll('.hotel-entry');
  entries.forEach((entry, idx) => {
    const newIndex = idx + 1;
    entry.dataset.hotelIndex = newIndex;
    
    // Update badge
    const badge = entry.querySelector('.entry-badge');
    if (badge) badge.textContent = newIndex;
    
    // Update label
    const label = entry.querySelector('.entry-label');
    if (label) label.textContent = `Hotel #${newIndex}`;
    
    // Update remove button onclick
    const removeBtn = entry.querySelector('.remove-hotel-btn');
    if (removeBtn) {
      removeBtn.setAttribute('onclick', `removeHotelEntry(this, ${travelerIndex})`);
    }
    
    // Update all input names
    const inputs = entry.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      const name = input.name;
      if (name) {
        const parts = name.split('_');
        if (parts.length >= 3) {
          parts[parts.length - 1] = newIndex;
          input.name = parts.join('_');
        }
      }
    });
  });
}

function updateHotelRemoveButtons(container) {
  const entries = container.querySelectorAll('.hotel-entry');
  entries.forEach((entry, idx) => {
    const removeBtn = entry.querySelector('.remove-hotel-btn');
    setRemoveButtonVisibility(removeBtn, entries.length > 1);
  });
}

// ============================================
// Car Entry Functions
// ============================================

function createCarEntryElement(travelerIndex, carIndex) {
  const entry = document.createElement('div');
  entry.className = 'car-entry';
  entry.dataset.carIndex = carIndex;
  
  entry.innerHTML = `
    <div class="entry-header">
      <span class="entry-badge">${carIndex}</span>
      <span class="entry-label">Car #${carIndex}</span>
      <button type="button" class="remove-entry-btn remove-car-btn" onclick="removeCarEntry(this, ${travelerIndex})" aria-label="Remove car">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Car Company</label><input type="text" class="form-input" name="car_company_${travelerIndex}_${carIndex}" placeholder="e.g., Enterprise, Hertz"></div>
      <div class="form-group"><label class="form-label">Car Number / Type</label><input type="text" class="form-input" name="car_number_${travelerIndex}_${carIndex}" placeholder="e.g., Sedan, SUV"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Pickup</label><input type="datetime-local" class="form-input" name="car_pickup_${travelerIndex}_${carIndex}"></div>
      <div class="form-group"><label class="form-label">Drop-off</label><input type="datetime-local" class="form-input" name="car_dropoff_${travelerIndex}_${carIndex}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Pickup Address</label><textarea class="form-input" name="car_pickup_address_${travelerIndex}_${carIndex}" placeholder="Pickup location"></textarea></div>
      <div class="form-group"><label class="form-label">Drop-off Address</label><textarea class="form-input" name="car_dropoff_address_${travelerIndex}_${carIndex}" placeholder="Drop-off location"></textarea></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Quote</label><input type="text" class="form-input" name="car_quote_${travelerIndex}_${carIndex}" placeholder="$0.00"></div>
      <div class="form-group"><label class="form-label">Confirmation #</label><input type="text" class="form-input" name="car_confirmation_${travelerIndex}_${carIndex}" placeholder="Booking confirmation"></div>
    </div>
    <div class="form-group approval-checkbox-group">
      <label class="single-checkbox">
        <input type="checkbox" name="car_quote_approved_${travelerIndex}_${carIndex}">
        <span class="checkbox-custom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
        <span class="checkbox-label">Is this quote approved?</span>
      </label>
    </div>
  `;
  
  return entry;
}

function addCarEntry(travelerIndex) {
  const containerId = `carEntries_${travelerIndex}`;
  const container = document.getElementById(containerId);
  
  if (container) {
    const existingEntries = container.querySelectorAll('.car-entry');
    const newIndex = existingEntries.length + 1;
    const newEntry = createCarEntryElement(travelerIndex, newIndex);
    container.appendChild(newEntry);
    updateCarRemoveButtons(container);
    initializeCheckboxes();
    newEntry.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function removeCarEntry(button, travelerIndex) {
  const entry = button.closest('.car-entry');
  const container = entry?.parentElement;
  
  if (entry && container) {
    entry.style.opacity = '0';
    entry.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      entry.remove();
      reindexCarEntries(container, travelerIndex);
      updateCarRemoveButtons(container);
    }, 300);
  }
}

function reindexCarEntries(container, travelerIndex) {
  const entries = container.querySelectorAll('.car-entry');
  entries.forEach((entry, idx) => {
    const newIndex = idx + 1;
    entry.dataset.carIndex = newIndex;
    
    // Update badge
    const badge = entry.querySelector('.entry-badge');
    if (badge) badge.textContent = newIndex;
    
    // Update label
    const label = entry.querySelector('.entry-label');
    if (label) label.textContent = `Car #${newIndex}`;
    
    // Update remove button onclick
    const removeBtn = entry.querySelector('.remove-car-btn');
    if (removeBtn) {
      removeBtn.setAttribute('onclick', `removeCarEntry(this, ${travelerIndex})`);
    }
    
    // Update all input names
    const inputs = entry.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      const name = input.name;
      if (name) {
        const parts = name.split('_');
        if (parts.length >= 3) {
          parts[parts.length - 1] = newIndex;
          input.name = parts.join('_');
        }
      }
    });
  });
}

// ============================================
// Truck Entry Functions
// ============================================

function createTruckEntryElement(travelerIndex, truckIndex) {
  const entry = document.createElement('div');
  entry.className = 'truck-entry';
  entry.dataset.truckIndex = truckIndex;
  
  entry.innerHTML = `
    <div class="entry-header">
      <span class="entry-badge">${truckIndex}</span>
      <span class="entry-label">Truck #${truckIndex}</span>
      <button type="button" class="remove-entry-btn remove-truck-btn" onclick="removeTruckEntry(this, ${travelerIndex})" aria-label="Remove truck">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Truck Company</label><input type="text" class="form-input" name="truck_company_${travelerIndex}_${truckIndex}" placeholder="e.g., U-Haul, Penske"></div>
      <div class="form-group"><label class="form-label">Truck Number / Type</label><input type="text" class="form-input" name="truck_number_${travelerIndex}_${truckIndex}" placeholder="e.g., 10ft, 15ft Box Truck"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Pickup</label><input type="datetime-local" class="form-input" name="truck_pickup_${travelerIndex}_${truckIndex}"></div>
      <div class="form-group"><label class="form-label">Drop-off</label><input type="datetime-local" class="form-input" name="truck_dropoff_${travelerIndex}_${truckIndex}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Pickup Address</label><textarea class="form-input" name="truck_pickup_address_${travelerIndex}_${truckIndex}" placeholder="Pickup location"></textarea></div>
      <div class="form-group"><label class="form-label">Drop-off Address</label><textarea class="form-input" name="truck_dropoff_address_${travelerIndex}_${truckIndex}" placeholder="Drop-off location"></textarea></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Quote</label><input type="text" class="form-input" name="truck_quote_${travelerIndex}_${truckIndex}" placeholder="$0.00"></div>
      <div class="form-group"><label class="form-label">Confirmation #</label><input type="text" class="form-input" name="truck_confirmation_${travelerIndex}_${truckIndex}" placeholder="Booking confirmation"></div>
    </div>
    <div class="form-group approval-checkbox-group">
      <label class="single-checkbox">
        <input type="checkbox" name="truck_quote_approved_${travelerIndex}_${truckIndex}">
        <span class="checkbox-custom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
        <span class="checkbox-label">Is this quote approved?</span>
      </label>
    </div>
  `;
  
  return entry;
}

function addTruckEntry(travelerIndex) {
  const containerId = `truckEntries_${travelerIndex}`;
  const container = document.getElementById(containerId);
  
  if (container) {
    const existingEntries = container.querySelectorAll('.truck-entry');
    const newIndex = existingEntries.length + 1;
    const newEntry = createTruckEntryElement(travelerIndex, newIndex);
    container.appendChild(newEntry);
    updateTruckRemoveButtons(container);
    initializeCheckboxes();
    newEntry.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function removeTruckEntry(button, travelerIndex) {
  const entry = button.closest('.truck-entry');
  const container = entry?.parentElement;
  
  if (entry && container) {
    entry.style.opacity = '0';
    entry.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      entry.remove();
      reindexTruckEntries(container, travelerIndex);
      updateTruckRemoveButtons(container);
    }, 300);
  }
}

function reindexTruckEntries(container, travelerIndex) {
  const entries = container.querySelectorAll('.truck-entry');
  entries.forEach((entry, idx) => {
    const newIndex = idx + 1;
    entry.dataset.truckIndex = newIndex;
    
    // Update badge
    const badge = entry.querySelector('.entry-badge');
    if (badge) badge.textContent = newIndex;
    
    // Update label
    const label = entry.querySelector('.entry-label');
    if (label) label.textContent = `Truck #${newIndex}`;
    
    // Update remove button onclick
    const removeBtn = entry.querySelector('.remove-truck-btn');
    if (removeBtn) {
      removeBtn.setAttribute('onclick', `removeTruckEntry(this, ${travelerIndex})`);
    }
    
    // Update all input names
    const inputs = entry.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      const name = input.name;
      if (name) {
        const parts = name.split('_');
        if (parts.length >= 3) {
          parts[parts.length - 1] = newIndex;
          input.name = parts.join('_');
        }
      }
    });
  });
}

function initializeDynamicSections() {
  const addQuoteBtn = document.getElementById('addQuoteBtn');
  const quoteContainer = document.getElementById('printingQuotes');
  if (addQuoteBtn && quoteContainer) {
    addQuoteBtn.addEventListener('click', () => {
      quoteCount++;
      const entry = createQuoteEntry(quoteCount);
      quoteContainer.appendChild(entry);
      initializeCheckboxes();
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
      initializeLayoverToggles();
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
    setRemoveButtonVisibility(btn, entries.length > 1);
  });
}

function updateDismantleRemoveButtons() {
  const entries = document.querySelectorAll('.dismantle-date-entry');
  entries.forEach((entry) => {
    const btn = entry.querySelector('.remove-entry-btn');
    setRemoveButtonVisibility(btn, entries.length > 1);
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

function initializeFormInteractions() {
  // Track unsaved changes
  document.querySelectorAll('.section-card input, .section-card textarea, .section-card select').forEach(el => {
    el.addEventListener('input', () => {
      const section = el.closest('.section-card');
      if (section) {
        const sectionId = section.dataset.section;
        window.unsavedSections[sectionId] = true;
      }
    });
    el.addEventListener('change', () => {
      const section = el.closest('.section-card');
      if (section) {
        const sectionId = section.dataset.section;
        window.unsavedSections[sectionId] = true;
      }
    });
  });
  
  // Also for custom checkboxes and radios
  document.querySelectorAll('.section-card .checkbox-option, .section-card .radio-option').forEach(el => {
    el.addEventListener('click', () => {
      const section = el.closest('.section-card');
      if (section) {
        const sectionId = section.dataset.section;
        window.unsavedSections[sectionId] = true;
      }
    });
  });
  
  // Prevent page reload/close with unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (window.unsavedSections && Object.values(window.unsavedSections).some(v => v)) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return 'You have unsaved changes. Are you sure you want to leave?';
    }
  });
  
  // Booking Software - Toggle conditional fields
  const bookingSoftwareRadios = document.querySelectorAll('input[name="is_booking_software"]');
  bookingSoftwareRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      const fieldsWrapper = document.querySelector('.booking-software-fields');
      if (fieldsWrapper) {
        fieldsWrapper.style.display = this.value === 'yes' ? 'block' : 'none';
      }
    });
  });
  
  // Booking Web URL input change - show/hide open link
  const bookingWebUrlInput = document.querySelector('input[name="booking_web_url"]');
  const bookingWebUrlLink = document.getElementById('booking-web-url-link');
  if (bookingWebUrlInput && bookingWebUrlLink) {
    bookingWebUrlInput.addEventListener('input', function() {
      const url = this.value.trim();
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        bookingWebUrlLink.href = url;
        bookingWebUrlLink.style.display = 'flex';
      } else {
        bookingWebUrlLink.style.display = 'none';
      }
    });
  }
}

// Auto-set Booking Software based on BookingApp data
function autoSetBookingSoftwareFromBookingApp(bookingAppData) {
  if (!bookingAppData || !Array.isArray(bookingAppData)) return;
  
  const section = document.querySelector('[data-section="booking-software"]');
  if (!section) return;
  
  // Check if BookingApp has any data
  const hasBookingAppData = bookingAppData.length > 0;
  
  if (hasBookingAppData) {
    // Auto-select "Yes" 
    const yesRadio = section.querySelector('input[name="is_booking_software"][value="yes"]');
    if (yesRadio && !yesRadio.checked) {
      yesRadio.checked = true;
      yesRadio.closest('.radio-item')?.classList.add('selected');
      
      // Show the conditional fields
      const fieldsWrapper = section.querySelector('.booking-software-fields');
      if (fieldsWrapper) {
        fieldsWrapper.style.display = 'block';
      }
      
      // Remove selected class from "No" option
      const noRadio = section.querySelector('input[name="is_booking_software"][value="no"]');
      if (noRadio) {
        noRadio.closest('.radio-item')?.classList.remove('selected');
      }
    }
  }
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
  initializeLayoverToggles();
  initializeTabs();
  initializeDynamicSections();
  initializeSectionSaveButtons();
  initializeCopyButtons();
  initializeDamageItemsHandler();
  initializeFormInteractions();
  
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
window.addFlightEntry = addFlightEntry;
window.removeFlightEntry = removeFlightEntry;
window.addLayoverEntry = addLayoverEntry;
window.removeLayoverEntry = removeLayoverEntry;
window.addHotelEntry = addHotelEntry;
window.removeHotelEntry = removeHotelEntry;