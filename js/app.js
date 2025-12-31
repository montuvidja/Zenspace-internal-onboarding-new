/* ============================================
   ZenSpace Operations - Main JavaScript
   ============================================ */

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

// Get form data from a specific section
function getSectionData(sectionElement) {
  const data = {};
  const inputs = sectionElement.querySelectorAll('input, textarea, select');
  
  inputs.forEach(input => {
    if (!input.name) return;
    
    if (input.type === 'checkbox') {
      if (!data[input.name]) data[input.name] = [];
      if (input.checked) data[input.name].push(input.value);
    } else if (input.type === 'radio') {
      if (input.checked) data[input.name] = input.value;
    } else {
      data[input.name] = input.value;
    }
  });
  
  return data;
}

// Get all form data
function getAllFormData() {
  const form = document.getElementById('onboardingForm');
  if (!form) return {};
  
  const formData = new FormData(form);
  const data = {};
  
  // Get header fields
  document.querySelectorAll('.project-field input').forEach(input => {
    if (input.name) data[input.name] = input.value;
  });
  
  // Process form data
  for (let [key, value] of formData.entries()) {
    if (data[key]) {
      if (Array.isArray(data[key])) {
        data[key].push(value);
      } else {
        data[key] = [data[key], value];
      }
    } else {
      data[key] = value;
    }
  }
  
  return data;
}

// Save section data to localStorage
function saveSectionData(sectionId, data) {
  const allData = JSON.parse(localStorage.getItem('zenspace_sections') || '{}');
  allData[sectionId] = {
    data: data,
    savedAt: new Date().toISOString()
  };
  localStorage.setItem('zenspace_sections', JSON.stringify(allData));
}

// Load saved data and populate form
function loadSavedData() {
  const savedData = localStorage.getItem('zenspace_draft');
  if (!savedData) return;
  
  try {
    const data = JSON.parse(savedData);
    
    Object.entries(data).forEach(([name, value]) => {
      const inputs = document.querySelectorAll(`[name="${name}"]`);
      
      inputs.forEach(input => {
        if (input.type === 'checkbox') {
          const shouldCheck = Array.isArray(value) ? value.includes(input.value) : value === input.value;
          input.checked = shouldCheck;
          if (shouldCheck) {
            input.closest('.checkbox-item')?.classList.add('checked');
            input.closest('.single-checkbox')?.classList.add('checked');
          }
        } else if (input.type === 'radio') {
          if (input.value === value) {
            input.checked = true;
            input.closest('.radio-item')?.classList.add('selected');
            input.closest('.address-option')?.classList.add('selected');
          }
        } else {
          input.value = value || '';
        }
      });
    });
    
    console.log('Loaded saved draft');
  } catch (e) {
    console.error('Failed to load draft:', e);
  }
}

// ============================================
// Section Accordion
// ============================================

function initializeAccordions() {
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', (e) => {
      // Don't toggle if clicking on a button inside header
      if (e.target.closest('button')) return;
      
      const section = header.closest('.section-card');
      const isExpanded = section.classList.contains('expanded');
      
      // Toggle current section
      section.classList.toggle('expanded');
      section.classList.toggle('active', !isExpanded);
    });
  });
}

// ============================================
// Checkbox Handling
// ============================================

function initializeCheckboxes() {
  // Multi-select checkboxes
  document.querySelectorAll('.checkbox-item').forEach(item => {
    if (item.dataset.initialized) return;
    item.dataset.initialized = 'true';
    
    item.addEventListener('click', (e) => {
      // Prevent the native label → checkbox toggle so we only toggle once
      e.preventDefault();
      
      const checkbox = item.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        item.classList.toggle('checked', checkbox.checked);
        
        // Handle "other" input
        const wrapper = item.closest('.other-input-wrapper');
        if (wrapper) {
          const otherInput = wrapper.querySelector('.other-input');
          if (otherInput) {
            otherInput.disabled = !checkbox.checked;
            if (checkbox.checked) otherInput.focus();
          }
        }
        
        // Trigger change event
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
  
  // Single checkboxes
  document.querySelectorAll('.single-checkbox').forEach(item => {
    if (item.dataset.initialized) return;
    item.dataset.initialized = 'true';
    
    item.addEventListener('click', (e) => {
      // Prevent native toggle, we handle the state manually
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

// ============================================
// Radio Button Handling
// ============================================

function initializeRadios() {
  document.querySelectorAll('.radio-item').forEach(item => {
    if (item.dataset.initialized) return;
    item.dataset.initialized = 'true';
    
    item.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      const radio = item.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        
        // Update visual state for radio group
        const group = item.closest('.radio-group');
        if (group) {
          group.querySelectorAll('.radio-item').forEach(r => r.classList.remove('selected'));
        }
        item.classList.add('selected');
        
        // Handle "other" input
        const groupWrapper = item.closest('.radio-group');
        if (groupWrapper) {
          const otherInput = groupWrapper.querySelector('.other-input');
          if (otherInput) {
            const isOther = radio.value === 'other' || radio.value === 'third_party';
            otherInput.disabled = !isOther;
            if (isOther) otherInput.focus();
          }
        }
        
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
  
  // Address options
  document.querySelectorAll('.address-option').forEach(item => {
    if (item.dataset.initialized) return;
    item.dataset.initialized = 'true';
    
    item.addEventListener('click', (e) => {
      // Prevent native label/radio behavior so we fully control visual + checked state
      e.preventDefault();
      
      const radio = item.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        
        const wrapper = item.closest('.address-options');
        if (wrapper) {
          wrapper.querySelectorAll('.address-option').forEach(o => o.classList.remove('selected'));
          item.classList.add('selected');
          
          const otherInput = wrapper.querySelector('.address-other-input');
          if (otherInput) {
            const isOther = radio.value === 'other';
            otherInput.style.display = isOther ? 'block' : 'none';
            if (isOther) {
              otherInput.querySelector('textarea')?.focus();
            }
          }
        }
        
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
}

// ============================================
// Tabs
// ============================================

function initializeTabs() {
  document.querySelectorAll('.tabs-container').forEach(tabContainer => {
    const tabs = tabContainer.querySelectorAll('.tab-btn');
    const section = tabContainer.closest('.section-content');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        section.querySelectorAll('.tab-content').forEach(content => {
          content.classList.toggle('active', content.dataset.content === target);
        });
      });
    });
  });
}

// ============================================
// Dynamic Entries (Quotes, Trucking & Travel)
// ============================================

let quoteCount = 1;
let truckingCount = 1;
let travelCount = 1;

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
      <button type="button" class="remove-entry-btn" onclick="removeEntry(this)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
        </div>
      </div>
    </div>
  `;
  
  return entry;
}

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
      <button type="button" class="remove-entry-btn" onclick="removeEntry(this)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
          <span class="checkbox-custom">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
          <span class="checkbox-label">ZenSpace Truck</span>
        </label>
        <label class="checkbox-item">
          <input type="checkbox" name="truck_source_${index}" value="alex_logistics">
          <span class="checkbox-custom">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
          <span class="checkbox-label">Axle Logistics</span>
        </label>
        <label class="checkbox-item">
          <input type="checkbox" name="truck_source_${index}" value="edward">
          <span class="checkbox-custom">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
          <span class="checkbox-label">Edward</span>
        </label>
        <div class="other-input-wrapper">
          <label class="checkbox-item">
            <input type="checkbox" name="truck_source_${index}" value="other">
              <span class="checkbox-custom">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </span>
              <span class="checkbox-label">Other</span>
          </label>
          <input type="text" class="other-input" name="truck_source_${index}_other" placeholder="Enter name..." disabled>
        </div>
      </div>
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
            <div class="address-title">
              NYC Warehouse
              <span class="tag">East Coast</span>
            </div>
            <div class="address-details">123 Industrial Blvd, Brooklyn, NY 11201</div>
          </div>
        </label>
        <label class="address-option">
          <input type="radio" name="pickup_warehouse_${index}" value="hayward">
          <span class="radio-custom"></span>
          <div class="address-content">
            <div class="address-title">
              Hayward Warehouse
              <span class="tag">West Coast</span>
            </div>
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
      <label class="form-label">Special Delivery Instructions</label>
      <textarea class="form-textarea" name="delivery_instructions_${index}" placeholder="Enter any special instructions..." rows="3"></textarea>
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
      <button type="button" class="remove-entry-btn" onclick="removeEntry(this)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    
    <div class="form-group">
      <label class="form-label">Traveler</label>
      <div class="radio-group">
        <label class="radio-item">
          <input type="radio" name="traveler_name_${index}" value="eliseo">
          <span class="radio-custom"></span>
          <span class="radio-label">Eliseo</span>
        </label>
        <label class="radio-item">
          <input type="radio" name="traveler_name_${index}" value="clinton">
          <span class="radio-custom"></span>
          <span class="radio-label">Clinton</span>
        </label>
        <label class="radio-item">
          <input type="radio" name="traveler_name_${index}" value="edward">
          <span class="radio-custom"></span>
          <span class="radio-label">Edward</span>
        </label>
        <div class="other-input-wrapper">
          <label class="radio-item">
            <input type="radio" name="traveler_name_${index}" value="other">
            <span class="radio-custom"></span>
            <span class="radio-label">Other</span>
          </label>
          <input type="text" class="other-input" name="traveler_name_other_${index}" placeholder="Enter traveler name..." disabled>
        </div>
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Travel From</label>
        <textarea class="form-textarea" name="travel_from_${index}" placeholder="Enter departure address..." rows="2"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Travel To</label>
        <textarea class="form-textarea" name="travel_to_${index}" placeholder="Enter destination address..." rows="2"></textarea>
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Travel Date From</label>
        <input type="datetime-local" class="form-input" name="traveler_from_datetime_${index}">
      </div>
      <div class="form-group">
        <label class="form-label">Travel Date To</label>
        <input type="datetime-local" class="form-input" name="traveler_to_datetime_${index}">
      </div>
    </div>
    
    <div class="travel-subsection">
      <div class="travel-subsection-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path>
        </svg>
        <span>Flight Details</span>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Flight Number</label>
          <input type="text" class="form-input" name="flight_number_${index}" placeholder="e.g., AA 1234">
        </div>
        <div class="form-group">
          <label class="form-label">Departure</label>
          <input type="datetime-local" class="form-input" name="flight_departure_${index}">
        </div>
        <div class="form-group">
          <label class="form-label">Arrival</label>
          <input type="datetime-local" class="form-input" name="flight_arrival_${index}">
        </div>
      </div>
    </div>
    
    <div class="travel-subsection">
      <div class="travel-subsection-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"></path>
          <circle cx="6.5" cy="16.5" r="2.5"></circle>
          <circle cx="16.5" cy="16.5" r="2.5"></circle>
        </svg>
        <span>Rental Car Details</span>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Car Company</label>
          <input type="text" class="form-input" name="car_company_${index}" placeholder="e.g., Enterprise">
        </div>
        <div class="form-group">
          <label class="form-label">Pickup</label>
          <input type="datetime-local" class="form-input" name="car_pickup_${index}">
        </div>
        <div class="form-group">
          <label class="form-label">Drop-off</label>
          <input type="datetime-local" class="form-input" name="car_dropoff_${index}">
        </div>
      </div>
    </div>
  `;
  
  return entry;
}

function removeEntry(button) {
  const entry = button.closest('.quote-entry, .trucking-entry, .travel-entry');
  if (entry) {
    entry.style.opacity = '0';
    entry.style.transform = 'translateY(-20px)';
    setTimeout(() => entry.remove(), 300);
  }
}

function initializeDynamicSections() {
  // Add Quote button
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
  
  // Add Trucking button
  const addTruckingBtn = document.getElementById('addTruckingBtn');
  const truckingContainer = document.getElementById('truckingEntries');
  
  if (addTruckingBtn && truckingContainer) {
    addTruckingBtn.addEventListener('click', () => {
      truckingCount++;
      const entry = createTruckingEntry(truckingCount);
      truckingContainer.appendChild(entry);
      initializeCheckboxes();
      entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
  
  // Add Travel button
  const addTravelBtn = document.getElementById('addTravelBtn');
  const travelContainer = document.getElementById('travelEntries');
  
  if (addTravelBtn && travelContainer) {
    addTravelBtn.addEventListener('click', () => {
      travelCount++;
      const entry = createTravelEntry(travelCount);
      travelContainer.appendChild(entry);
      initializeCheckboxes();
      entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}

// ============================================
// Section Save Buttons
// ============================================

function saveSection(sectionId) {
  const section = document.querySelector(`[data-section="${sectionId}"]`);
  if (!section) {
    showToast('Section not found', 'error');
    return;
  }
  
  const sectionData = getSectionData(section);
  saveSectionData(sectionId, sectionData);
  
  // Update save status
  const saveStatus = section.querySelector('.save-status');
  if (saveStatus) {
    saveStatus.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>Saved just now</span>
    `;
    saveStatus.classList.add('saved');
  }
  
  showToast(`${getSectionName(sectionId)} saved successfully!`, 'success');
}

function getSectionName(sectionId) {
  const names = {
    'preplanning': 'Pre-planning',
    'artwork': 'Artwork & Branding',
    'printing': 'Printing & Production',
    'trucking': 'Trucking & Logistics',
    'installation': 'Installation & Dismantle',
    'postevent': 'Post-Event',
    'travel': 'Travel & Lodging'
  };
  return names[sectionId] || 'Section';
}

function initializeSectionSaveButtons() {
  document.querySelectorAll('.section-save-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sectionId = btn.dataset.section;
      saveSection(sectionId);
    });
  });
}

// ============================================
// Copy Buttons
// ============================================

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
// Footer Action Buttons
// ============================================

function initializeFooterActions() {
  // Save All Draft
  document.getElementById('saveDraftBtn')?.addEventListener('click', () => {
    const data = getAllFormData();
    localStorage.setItem('zenspace_draft', JSON.stringify(data));
    showToast('All sections saved to draft!', 'success');
  });
  
  // Export Data
  document.getElementById('exportBtn')?.addEventListener('click', () => {
    const data = getAllFormData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenspace-event-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully!', 'success');
  });
  
  // Submit Form
  document.getElementById('submitBtn')?.addEventListener('click', () => {
    const data = getAllFormData();
    console.log('Form data:', data);
    showToast('Form submitted successfully!', 'success');
  });
}

// ============================================
// Initialize Application
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  // Initialize all components
  initializeAccordions();
  initializeCheckboxes();
  initializeRadios();
  initializeTabs();
  initializeDynamicSections();
  initializeSectionSaveButtons();
  initializeCopyButtons();
  initializeFooterActions();
  
  // Load saved data
  loadSavedData();
  
  // Expand first section by default
  const firstSection = document.querySelector('.section-card');
  if (firstSection) {
    firstSection.classList.add('expanded', 'active');
  }
  
  console.log('ZenSpace Onboarding App initialized');
});

// Make removeEntry globally available
window.removeEntry = removeEntry;
