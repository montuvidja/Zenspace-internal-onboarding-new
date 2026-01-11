/* ============================================
   ZenSpace Internal Onboarding - File Upload Functions V3
   Handles file uploads to Google Drive via Apps Script
   Trucking invoices now at section level (multiple files)
   ============================================ */

// ============================================================================
// CONFIGURATION
// ============================================================================

const FILE_UPLOAD_ENDPOINT = 'https://script.google.com/macros/s/AKfycbze8yd27lK9WxJHKgdkrBYXuuK4ndBdcsjZ_j8qsQI_cXgGd_rScvwCy-6I0M-bYxUYow/exec';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOW_ALL_FILE_TYPES = true;

// Store uploaded file data - ALL section-level now
const uploadedFileData = {
  trucking_invoices: { urls: [], folderUrl: '' },  // Changed from per-entry to section-level
  damage_images: { urls: [], folderUrl: '' },
  event_images: { urls: [], folderUrl: '' },
  travel_invoices: { urls: [], folderUrl: '' },
  coi: { url: '', folderUrl: '' }
};

// ============================================================================
// MAIN UPLOAD FUNCTION
// ============================================================================

async function uploadFiles(files, uploadType, entryIndex = null, replaceExisting = false) {
  const validTypes = ['damage_images', 'event_images', 'trucking_invoices', 'travel_invoices', 'travel_files', 'coi_documents'];
  if (!validTypes.includes(uploadType)) {
    throw new Error(`Invalid upload type: ${uploadType}`);
  }
  
  const eventName = getEventName();
  if (!eventName) {
    throw new Error('Event name not available. Please ensure event is loaded.');
  }
  
  const fileDataArray = [];
  const errors = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name}: File too large (max 10MB)`);
      continue;
    }
    
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
  
  const payload = {
    eventName: eventName,
    type: uploadType,
    files: fileDataArray,
    replaceExisting: replaceExisting
  };
  
  if (entryIndex !== null) {
    payload.entryIndex = entryIndex;
  }
  
  const response = await fetch(FILE_UPLOAD_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Upload failed');
  }
  
  storeUploadedData(uploadType, entryIndex, result, replaceExisting);
  
  return {
    ...result,
    validationErrors: errors
  };
}

/**
 * Store uploaded file data for Supabase saving
 */
function storeUploadedData(uploadType, entryIndex, result, replaceExisting = false) {
  const urls = result.uploadedFiles
    .filter(f => f.url)
    .map(f => f.url);
  
  const folderUrl = result.folderUrl || '';
  
  switch (uploadType) {
    case 'trucking_invoices':
      // Section-level: append to existing (unless replace)
      if (replaceExisting) {
        uploadedFileData.trucking_invoices.urls = urls;
      } else {
        uploadedFileData.trucking_invoices.urls = [
          ...uploadedFileData.trucking_invoices.urls,
          ...urls
        ];
      }
      uploadedFileData.trucking_invoices.folderUrl = folderUrl;
      break;
      
    case 'damage_images':
      uploadedFileData.damage_images.urls = [
        ...uploadedFileData.damage_images.urls,
        ...urls
      ];
      uploadedFileData.damage_images.folderUrl = folderUrl;
      break;
      
    case 'event_images':
      uploadedFileData.event_images.urls = [
        ...uploadedFileData.event_images.urls,
        ...urls
      ];
      uploadedFileData.event_images.folderUrl = folderUrl;
      break;
      
    case 'travel_invoices':
      uploadedFileData.travel_invoices.urls = [
        ...uploadedFileData.travel_invoices.urls,
        ...urls
      ];
      uploadedFileData.travel_invoices.folderUrl = folderUrl;
      break;
      
    case 'coi_documents':
      uploadedFileData.coi.url = urls[0] || '';
      uploadedFileData.coi.folderUrl = folderUrl;
      break;
  }
}

/**
 * Get uploaded file data for a specific type
 */
function getUploadedFileData(uploadType, entryIndex = null) {
  switch (uploadType) {
    case 'trucking_invoices':
      return uploadedFileData.trucking_invoices;
    case 'damage_images':
      return uploadedFileData.damage_images;
    case 'event_images':
      return uploadedFileData.event_images;
    case 'travel_invoices':
      return uploadedFileData.travel_invoices;
    case 'coi_documents':
      return uploadedFileData.coi;
    default:
      return { urls: [], folderUrl: '' };
  }
}

/**
 * Set uploaded file data (used when loading from Supabase)
 */
function setUploadedFileData(uploadType, data, entryIndex = null) {
  switch (uploadType) {
    case 'trucking_invoices':
      uploadedFileData.trucking_invoices = data;
      break;
    case 'damage_images':
      uploadedFileData.damage_images = data;
      break;
    case 'event_images':
      uploadedFileData.event_images = data;
      break;
    case 'travel_invoices':
      uploadedFileData.travel_invoices = data;
      break;
    case 'coi_documents':
      uploadedFileData.coi = data;
      break;
  }
}

/**
 * Clear uploaded file data
 */
function clearUploadedFileData() {
  uploadedFileData.trucking_invoices = { urls: [], folderUrl: '' };
  uploadedFileData.damage_images = { urls: [], folderUrl: '' };
  uploadedFileData.event_images = { urls: [], folderUrl: '' };
  uploadedFileData.travel_invoices = { urls: [], folderUrl: '' };
  uploadedFileData.coi = { url: '', folderUrl: '' };
}

// ============================================================================
// FILE INPUT HANDLERS
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
    showUploadSuccess(container, result, 'damage_images');
    showToast(`${result.totalUploaded} damage image(s) uploaded successfully!`, 'success');
  } catch (error) {
    showUploadError(container, error.message);
    showToast(`Upload failed: ${error.message}`, 'error');
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
    showUploadSuccess(container, result, 'event_images');
    showToast(`${result.totalUploaded} event image(s) uploaded successfully!`, 'success');
  } catch (error) {
    showUploadError(container, error.message);
    showToast(`Upload failed: ${error.message}`, 'error');
  }
}

/**
 * Handle trucking invoices upload (Section-level, multiple files)
 */
async function handleTruckingInvoicesUpload(inputElement) {
  const files = inputElement.files;
  if (!files || files.length === 0) return;
  
  const container = inputElement.closest('.form-group');
  showUploadProgress(container, 'Uploading trucking invoices...');
  
  try {
    const result = await uploadFiles(files, 'trucking_invoices', null, false);
    showUploadSuccess(container, result, 'trucking_invoices');
    showToast(`${result.totalUploaded} trucking invoice(s) uploaded successfully!`, 'success');
  } catch (error) {
    showUploadError(container, error.message);
    showToast(`Upload failed: ${error.message}`, 'error');
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
    showUploadSuccess(container, result, 'travel_invoices');
    showToast(`${result.totalUploaded} travel invoice(s) uploaded successfully!`, 'success');
  } catch (error) {
    showUploadError(container, error.message);
    showToast(`Upload failed: ${error.message}`, 'error');
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
    showUploadSuccess(container, result, 'coi_documents');
    showToast('COI document uploaded successfully!', 'success');
  } catch (error) {
    showUploadError(container, error.message);
    showToast(`Upload failed: ${error.message}`, 'error');
  }
}

// ============================================================================
// DISPLAY UPLOADED FILES
// ============================================================================

function displayUploadedFiles(container, urls, folderUrl, uploadType) {
  if (!container) return;
  
  const existingDisplay = container.querySelector('.uploaded-files-display');
  if (existingDisplay) existingDisplay.remove();
  
  if ((!urls || urls.length === 0) && !folderUrl) return;
  
  const displayDiv = document.createElement('div');
  displayDiv.className = 'uploaded-files-display';
  
  let html = '<div class="uploaded-files-header">';
  html += '<span class="uploaded-label">Uploaded files:</span>';
  if (folderUrl) {
    html += `<a href="${folderUrl}" target="_blank" class="folder-link-btn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
      Open Folder
    </a>`;
  }
  html += '</div>';
  
  if (urls && urls.length > 0) {
    html += '<div class="uploaded-files-grid">';
    urls.forEach((url, idx) => {
      const fileName = extractFileName(url) || `File ${idx + 1}`;
      const isImage = isImageUrl(url);
      
      html += `<div class="uploaded-file-item">`;
      if (isImage) {
        html += `<a href="${url}" target="_blank" class="file-thumbnail">
          <img src="${url}" alt="${fileName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="file-icon" style="display:none;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
        </a>`;
      } else {
        html += `<a href="${url}" target="_blank" class="file-icon-link">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </a>`;
      }
      html += `<span class="file-name" title="${fileName}">${truncateFileName(fileName, 15)}</span>`;
      html += '</div>';
    });
    html += '</div>';
  }
  
  displayDiv.innerHTML = html;
  
  const fileInput = container.querySelector('input[type="file"]');
  if (fileInput) {
    fileInput.parentNode.insertBefore(displayDiv, fileInput.nextSibling);
  } else {
    container.appendChild(displayDiv);
  }
}

function displaySingleUploadedFile(container, url, folderUrl) {
  displayUploadedFiles(container, url ? [url] : [], folderUrl);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getEventName() {
  if (typeof currentEventName !== 'undefined' && currentEventName) {
    return currentEventName;
  }
  
  const eventNameInput = document.querySelector('[name="event_name"]');
  if (eventNameInput && eventNameInput.value) {
    return eventNameInput.value;
  }
  
  const eventHeader = document.querySelector('.event-header-title, .event-name, #eventName');
  if (eventHeader && eventHeader.textContent) {
    return eventHeader.textContent.trim();
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const eventParam = urlParams.get('event_name');
  if (eventParam) {
    return eventParam;
  }
  
  return null;
}

function extractFileName(url) {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && !lastPart.includes('?')) {
      return decodeURIComponent(lastPart);
    }
  } catch (e) {}
  return '';
}

function isImageUrl(url) {
  if (!url) return false;
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext));
}

function truncateFileName(name, maxLength) {
  if (!name || name.length <= maxLength) return name;
  const ext = name.split('.').pop();
  const nameWithoutExt = name.slice(0, name.length - ext.length - 1);
  const truncatedName = nameWithoutExt.slice(0, maxLength - ext.length - 4) + '...';
  return truncatedName + '.' + ext;
}

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

function showUploadSuccess(container, result, uploadType) {
  removeUploadStatus(container);
  
  const statusDiv = document.createElement('div');
  statusDiv.className = 'upload-status upload-success';
  
  let html = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    <span>${result.totalUploaded} file(s) uploaded</span>
  `;
  
  if (result.folderUrl) {
    html += `<a href="${result.folderUrl}" target="_blank" class="folder-link">View folder</a>`;
  }
  
  statusDiv.innerHTML = html;
  container.appendChild(statusDiv);
  
  const urls = result.uploadedFiles.filter(f => f.url).map(f => f.url);
  displayUploadedFiles(container, urls, result.folderUrl, uploadType);
  
  setTimeout(() => {
    statusDiv.style.opacity = '0.6';
  }, 5000);
}

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

function removeUploadStatus(container) {
  const existing = container.querySelector('.upload-status');
  if (existing) existing.remove();
}

// ============================================================================
// INITIALIZATION
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
  
  // Trucking invoices (Section-level, multiple files)
  const truckingInvoicesInput = document.querySelector('input[name="trucking_invoices"]');
  if (truckingInvoicesInput) {
    truckingInvoicesInput.addEventListener('change', (e) => handleTruckingInvoicesUpload(e.target));
  }
  
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
// CSS STYLES
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

.uploaded-files-display {
  margin-top: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.uploaded-files-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.uploaded-label {
  font-size: 12px;
  font-weight: 600;
  color: #495057;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.folder-link-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #e7f1ff;
  color: #0d6efd;
  border-radius: 4px;
  font-size: 12px;
  text-decoration: none;
  transition: background 0.2s;
}

.folder-link-btn:hover {
  background: #cfe2ff;
}

.uploaded-files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 10px;
}

.uploaded-file-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.file-thumbnail {
  width: 70px;
  height: 70px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.file-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-icon, .file-icon-link {
  width: 70px;
  height: 70px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #6c757d;
}

.file-icon-link:hover {
  background: #f8f9fa;
  color: #0d6efd;
}

.file-name {
  font-size: 10px;
  color: #6c757d;
  text-align: center;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`;

function injectUploadStyles() {
  if (!document.querySelector('#upload-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'upload-styles';
    styleSheet.textContent = uploadStyles;
    document.head.appendChild(styleSheet);
  }
}

// ============================================================================
// AUTO-INITIALIZE
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  injectUploadStyles();
  initializeFileUploads();
});

// ============================================================================
// EXPORTS
// ============================================================================

window.uploadFiles = uploadFiles;
window.handleDamageImagesUpload = handleDamageImagesUpload;
window.handleEventImagesUpload = handleEventImagesUpload;
window.handleTruckingInvoicesUpload = handleTruckingInvoicesUpload;
window.handleTravelInvoicesUpload = handleTravelInvoicesUpload;
window.handleCOIUpload = handleCOIUpload;
window.getUploadedFileData = getUploadedFileData;
window.setUploadedFileData = setUploadedFileData;
window.clearUploadedFileData = clearUploadedFileData;
window.displayUploadedFiles = displayUploadedFiles;
window.displaySingleUploadedFile = displaySingleUploadedFile;
window.uploadedFileData = uploadedFileData;
window.getUploadedUrls = getUploadedUrls;