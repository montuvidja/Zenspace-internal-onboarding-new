/* ============================================
   ZenSpace Internal Onboarding - File Upload Functions
   Handles file uploads to Google Drive via Apps Script
   ============================================ */

// ============================================================================
// CONFIGURATION
// ============================================================================

// Replace with your deployed Apps Script Web App URL
const FILE_UPLOAD_ENDPOINT = 'https://script.google.com/macros/s/AKfycbze8yd27lK9WxJHKgdkrBYXuuK4ndBdcsjZ_j8qsQI_cXgGd_rScvwCy-6I0M-bYxUYow/exec';

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allow all file types for all upload types
const ALLOW_ALL_FILE_TYPES = true;

// Store uploaded file URLs (keyed by type and optional entry index)
const uploadedFileUrls = {};

// ============================================================================
// MAIN UPLOAD FUNCTION
// ============================================================================

/**
 * Upload files to Google Drive via Apps Script
 * 
 * @param {FileList|File[]} files - Files to upload
 * @param {string} uploadType - Type of upload (damage_images, trucking_invoices, etc.)
 * @param {number|null} entryIndex - Optional entry index for multi-entry sections
 * @param {boolean} replaceExisting - Whether to clear existing files first
 * @returns {Promise<object>} - Upload result
 */
async function uploadFiles(files, uploadType, entryIndex = null, replaceExisting = false) {
  // Validate upload type exists
  const validTypes = ['damage_images', 'event_images', 'trucking_invoices', 'travel_invoices', 'travel_files', 'coi_documents'];
  if (!validTypes.includes(uploadType)) {
    throw new Error(`Invalid upload type: ${uploadType}`);
  }
  
  // Get event name (you'll need to have this available globally or pass it)
  const eventName = getEventName();
  if (!eventName) {
    throw new Error('Event name not available. Please ensure event is loaded.');
  }
  
  // Validate and prepare files
  const fileDataArray = [];
  const errors = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name}: File too large (max 10MB)`);
      continue;
    }
    
    // All file types are now allowed - no type validation
    
    try {
      const base64Content = await fileToBase64(file);
      fileDataArray.push({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        content: base64Content
      });
    } catch (err) {
      errors.push(`${file.name}: Failed to read file`);
    }
  }
  
  if (fileDataArray.length === 0) {
    throw new Error('No valid files to upload. ' + errors.join('; '));
  }
  
  // Prepare payload
  const payload = {
    eventName: eventName,
    type: uploadType,
    files: fileDataArray,
    replaceExisting: replaceExisting
  };
  
  if (entryIndex !== null) {
    payload.entryIndex = entryIndex;
  }
  
  // Send to Apps Script
  const response = await fetch(FILE_UPLOAD_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Upload failed');
  }
  
  // Store uploaded URLs
  const storageKey = entryIndex !== null ? `${uploadType}_${entryIndex}` : uploadType;
  uploadedFileUrls[storageKey] = result.uploadedFiles;
  
  return {
    ...result,
    validationErrors: errors
  };
}

// ============================================================================
// FILE INPUT HANDLERS FOR EACH SECTION
// ============================================================================

/**
 * Handle damage images upload (Post-Event section)
 */
async function handleDamageImagesUpload(inputElement) {
  const files = inputElement.files;
  if (!files || files.length === 0) return;
  
  const container = inputElement.closest('.form-group');
  showUploadProgress(container, 'Uploading damage images...');
  
  try {
    const result = await uploadFiles(files, 'damage_images', null, false);
    showUploadSuccess(container, result);
    
    // Store URLs for later saving to Supabase
    updateHiddenField('damage_images_urls', result.uploadedFiles.map(f => f.url));
    
  } catch (error) {
    showUploadError(container, error.message);
  }
}

/**
 * Handle event images upload (Post-Event section)
 */
async function handleEventImagesUpload(inputElement) {
  const files = inputElement.files;
  if (!files || files.length === 0) return;
  
  const container = inputElement.closest('.form-group');
  showUploadProgress(container, 'Uploading event images...');
  
  try {
    const result = await uploadFiles(files, 'event_images', null, false);
    showUploadSuccess(container, result);
    
    updateHiddenField('event_images_urls', result.uploadedFiles.map(f => f.url));
    
  } catch (error) {
    showUploadError(container, error.message);
  }
}

/**
 * Handle trucking invoice upload (Trucking section - per route)
 */
async function handleTruckingInvoiceUpload(inputElement, routeIndex) {
  const files = inputElement.files;
  if (!files || files.length === 0) return;
  
  const container = inputElement.closest('.form-group');
  showUploadProgress(container, 'Uploading invoice...');
  
  try {
    const result = await uploadFiles(files, 'trucking_invoices', routeIndex, true);
    showUploadSuccess(container, result);
    
    // Store URL in hidden field specific to this route
    updateHiddenField(`trucking_invoice_url_${routeIndex}`, result.uploadedFiles[0]?.url || '');
    
  } catch (error) {
    showUploadError(container, error.message);
  }
}

/**
 * Handle travel invoices upload (Travel section)
 */
async function handleTravelInvoicesUpload(inputElement) {
  const files = inputElement.files;
  if (!files || files.length === 0) return;
  
  const container = inputElement.closest('.form-group');
  showUploadProgress(container, 'Uploading travel invoices...');
  
  try {
    const result = await uploadFiles(files, 'travel_invoices', null, false);
    showUploadSuccess(container, result);
    
    updateHiddenField('travel_invoices_urls', result.uploadedFiles.map(f => f.url));
    
  } catch (error) {
    showUploadError(container, error.message);
  }
}

/**
 * Handle COI document upload (COI section)
 */
async function handleCOIUpload(inputElement) {
  const files = inputElement.files;
  if (!files || files.length === 0) return;
  
  const container = inputElement.closest('.form-group');
  showUploadProgress(container, 'Uploading COI document...');
  
  try {
    const result = await uploadFiles(files, 'coi_documents', null, true);
    showUploadSuccess(container, result);
    
    updateHiddenField('coi_file_url', result.uploadedFiles[0]?.url || '');
    
  } catch (error) {
    showUploadError(container, error.message);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert file to base64 string
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get event name - implement based on your app structure
 * This should return the current event's name/folder name
 */
function getEventName() {
  // Option 1: Get from a global variable
  if (typeof currentEventName !== 'undefined' && currentEventName) {
    return currentEventName;
  }
  
  // Option 2: Get from a hidden input
  const eventNameInput = document.querySelector('[name="event_name"]');
  if (eventNameInput && eventNameInput.value) {
    return eventNameInput.value;
  }
  
  // Option 3: Get from page title or header
  const eventHeader = document.querySelector('.event-header-title, .event-name, #eventName');
  if (eventHeader && eventHeader.textContent) {
    return eventHeader.textContent.trim();
  }
  
  // Option 4: Get from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const eventParam = urlParams.get('event_name');
  if (eventParam) {
    return eventParam;
  }
  
  return null;
}

/**
 * Update or create hidden field to store upload URLs
 */
function updateHiddenField(fieldName, value) {
  let input = document.querySelector(`input[name="${fieldName}"]`);
  
  if (!input) {
    input = document.createElement('input');
    input.type = 'hidden';
    input.name = fieldName;
    document.body.appendChild(input);
  }
  
  input.value = Array.isArray(value) ? JSON.stringify(value) : value;
}

/**
 * Get uploaded file URLs for a field
 */
function getUploadedUrls(fieldName) {
  const input = document.querySelector(`input[name="${fieldName}"]`);
  if (!input || !input.value) return [];
  
  try {
    return JSON.parse(input.value);
  } catch {
    return input.value ? [input.value] : [];
  }
}

// ============================================================================
// UI FEEDBACK FUNCTIONS
// ============================================================================

/**
 * Show upload progress indicator
 */
function showUploadProgress(container, message) {
  removeUploadStatus(container);
  
  const statusDiv = document.createElement('div');
  statusDiv.className = 'upload-status upload-progress';
  statusDiv.innerHTML = `
    <svg class="spinner" viewBox="0 0 24 24" width="16" height="16">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"></circle>
    </svg>
    <span>${message}</span>
  `;
  container.appendChild(statusDiv);
}

/**
 * Show upload success message
 */
function showUploadSuccess(container, result) {
  removeUploadStatus(container);
  
  const statusDiv = document.createElement('div');
  statusDiv.className = 'upload-status upload-success';
  
  let html = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    <span>${result.totalUploaded} file(s) uploaded successfully</span>
  `;
  
  // Add link to folder
  if (result.folderUrl) {
    html += `<a href="${result.folderUrl}" target="_blank" class="folder-link">View folder</a>`;
  }
  
  // Show uploaded files
  if (result.uploadedFiles && result.uploadedFiles.length > 0) {
    html += '<div class="uploaded-files-list">';
    result.uploadedFiles.forEach(file => {
      if (file.url) {
        html += `<a href="${file.url}" target="_blank" class="uploaded-file-link">${file.fileName}</a>`;
      }
    });
    html += '</div>';
  }
  
  statusDiv.innerHTML = html;
  container.appendChild(statusDiv);
  
  // Auto-hide after 10 seconds
  setTimeout(() => {
    statusDiv.style.opacity = '0.7';
  }, 10000);
}

/**
 * Show upload error message
 */
function showUploadError(container, message) {
  removeUploadStatus(container);
  
  const statusDiv = document.createElement('div');
  statusDiv.className = 'upload-status upload-error';
  statusDiv.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
    <span>${message}</span>
  `;
  container.appendChild(statusDiv);
}

/**
 * Remove existing upload status from container
 */
function removeUploadStatus(container) {
  const existing = container.querySelector('.upload-status');
  if (existing) existing.remove();
}

// ============================================================================
// INITIALIZATION - Attach handlers to file inputs
// ============================================================================

function initializeFileUploads() {
  // Damage images (Post-Event)
  const damageImagesInput = document.querySelector('input[name="damage_images"]');
  if (damageImagesInput) {
    damageImagesInput.addEventListener('change', (e) => handleDamageImagesUpload(e.target));
  }
  
  // Event images (Post-Event)
  const eventImagesInput = document.querySelector('input[name="event_images"]');
  if (eventImagesInput) {
    eventImagesInput.addEventListener('change', (e) => handleEventImagesUpload(e.target));
  }
  
  // Trucking invoices (per route) - these are dynamically created
  document.addEventListener('change', (e) => {
    if (e.target.matches('input[name^="attach_invoice_"]')) {
      const match = e.target.name.match(/attach_invoice_(\d+)/);
      if (match) {
        const routeIndex = parseInt(match[1]);
        handleTruckingInvoiceUpload(e.target, routeIndex);
      }
    }
  });
  
  // Travel invoices
  const travelInvoicesInput = document.querySelector('input[name="travel_invoices"]');
  if (travelInvoicesInput) {
    travelInvoicesInput.addEventListener('change', (e) => handleTravelInvoicesUpload(e.target));
  }
  
  // COI document
  const coiFileInput = document.querySelector('input[name="coi_file"]');
  if (coiFileInput) {
    coiFileInput.addEventListener('change', (e) => handleCOIUpload(e.target));
  }
}

// ============================================================================
// CSS STYLES (add to your stylesheet or inject)
// ============================================================================

const uploadStyles = `
.upload-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  margin-top: 8px;
  font-size: 13px;
}

.upload-progress {
  background: #e3f2fd;
  color: #1565c0;
}

.upload-progress .spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.upload-success {
  background: #e8f5e9;
  color: #2e7d32;
  flex-wrap: wrap;
}

.upload-error {
  background: #ffebee;
  color: #c62828;
}

.folder-link {
  margin-left: auto;
  color: #1565c0;
  text-decoration: none;
  font-size: 12px;
}

.folder-link:hover {
  text-decoration: underline;
}

.uploaded-files-list {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(0,0,0,0.1);
}

.uploaded-file-link {
  background: rgba(255,255,255,0.5);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #333;
  text-decoration: none;
}

.uploaded-file-link:hover {
  background: rgba(255,255,255,0.8);
  text-decoration: underline;
}
`;

// Inject styles
function injectUploadStyles() {
  if (!document.querySelector('#upload-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'upload-styles';
    styleSheet.textContent = uploadStyles;
    document.head.appendChild(styleSheet);
  }
}

// ============================================================================
// AUTO-INITIALIZE ON DOM READY
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  injectUploadStyles();
  initializeFileUploads();
});

// Make functions globally available
window.uploadFiles = uploadFiles;
window.handleDamageImagesUpload = handleDamageImagesUpload;
window.handleEventImagesUpload = handleEventImagesUpload;
window.handleTruckingInvoiceUpload = handleTruckingInvoiceUpload;
window.handleTravelInvoicesUpload = handleTravelInvoicesUpload;
window.handleCOIUpload = handleCOIUpload;
window.getUploadedUrls = getUploadedUrls;