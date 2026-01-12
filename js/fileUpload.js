/* ============================================
   ZenSpace Internal Onboarding - File Upload Functions V4
   Handles file uploads to Google Drive via Apps Script
   - Shows original file names
   - Delete functionality for uploaded files
   ============================================ */

// ============================================================================
// CONFIGURATION
// ============================================================================

const FILE_UPLOAD_ENDPOINT = 'https://script.google.com/macros/s/AKfycbze8yd27lK9WxJHKgdkrBYXuuK4ndBdcsjZ_j8qsQI_cXgGd_rScvwCy-6I0M-bYxUYow/exec';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOW_ALL_FILE_TYPES = true;

// Store uploaded file data - includes file names now
const uploadedFileData = {
  trucking_invoices: { files: [], folderUrl: '' },  // files: [{url, name}, ...]
  damage_images: { files: [], folderUrl: '' },
  event_images: { files: [], folderUrl: '' },
  travel_invoices: { files: [], folderUrl: '' },
  coi: { file: null, folderUrl: '' }  // file: {url, name} or null
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
        fileName: file.name,  // Keep original file name
        mimeType: file.type || 'application/octet-stream',
        content: base64Content,
        originalName: file.name  // Store original name
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
  
  // Add original names to result
  result.uploadedFiles = result.uploadedFiles.map((f, idx) => ({
    ...f,
    originalName: fileDataArray[idx]?.originalName || f.fileName || `File ${idx + 1}`
  }));
  
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
  const newFiles = result.uploadedFiles
    .filter(f => f.url)
    .map(f => ({
      url: f.url,
      name: f.originalName || f.fileName || extractFileName(f.url) || 'Unknown'
    }));
  
  const folderUrl = result.folderUrl || '';
  
  switch (uploadType) {
    case 'trucking_invoices':
      if (replaceExisting) {
        uploadedFileData.trucking_invoices.files = newFiles;
      } else {
        uploadedFileData.trucking_invoices.files = [
          ...uploadedFileData.trucking_invoices.files,
          ...newFiles
        ];
      }
      uploadedFileData.trucking_invoices.folderUrl = folderUrl;
      break;
      
    case 'damage_images':
      uploadedFileData.damage_images.files = [
        ...uploadedFileData.damage_images.files,
        ...newFiles
      ];
      uploadedFileData.damage_images.folderUrl = folderUrl;
      break;
      
    case 'event_images':
      uploadedFileData.event_images.files = [
        ...uploadedFileData.event_images.files,
        ...newFiles
      ];
      uploadedFileData.event_images.folderUrl = folderUrl;
      break;
      
    case 'travel_invoices':
      uploadedFileData.travel_invoices.files = [
        ...uploadedFileData.travel_invoices.files,
        ...newFiles
      ];
      uploadedFileData.travel_invoices.folderUrl = folderUrl;
      break;
      
    case 'coi_documents':
      uploadedFileData.coi.file = newFiles[0] || null;
      uploadedFileData.coi.folderUrl = folderUrl;
      break;
  }
}

/**
 * Get uploaded file data for a specific type
 * Returns in format compatible with Supabase (urls array)
 */
function getUploadedFileData(uploadType, entryIndex = null) {
  switch (uploadType) {
    case 'trucking_invoices':
      return {
        urls: uploadedFileData.trucking_invoices.files.map(f => f.url),
        files: uploadedFileData.trucking_invoices.files,
        folderUrl: uploadedFileData.trucking_invoices.folderUrl
      };
    case 'damage_images':
      return {
        urls: uploadedFileData.damage_images.files.map(f => f.url),
        files: uploadedFileData.damage_images.files,
        folderUrl: uploadedFileData.damage_images.folderUrl
      };
    case 'event_images':
      return {
        urls: uploadedFileData.event_images.files.map(f => f.url),
        files: uploadedFileData.event_images.files,
        folderUrl: uploadedFileData.event_images.folderUrl
      };
    case 'travel_invoices':
      return {
        urls: uploadedFileData.travel_invoices.files.map(f => f.url),
        files: uploadedFileData.travel_invoices.files,
        folderUrl: uploadedFileData.travel_invoices.folderUrl
      };
    case 'coi_documents':
      return {
        url: uploadedFileData.coi.file?.url || '',
        file: uploadedFileData.coi.file,
        folderUrl: uploadedFileData.coi.folderUrl
      };
    default:
      return { urls: [], files: [], folderUrl: '' };
  }
}

/**
 * Set uploaded file data (used when loading from Supabase)
 * Accepts both old format (urls array) and new format (files array with names)
 */
function setUploadedFileData(uploadType, data, entryIndex = null) {
  // Convert old format (urls) to new format (files) if needed
  const convertToFiles = (urls, existingFiles = []) => {
    if (!urls || urls.length === 0) return existingFiles;
    return urls.map((url, idx) => {
      // Check if we have existing file info
      const existing = existingFiles.find(f => f.url === url);
      if (existing) return existing;
      return {
        url: url,
        name: extractFileName(url) || `File ${idx + 1}`
      };
    });
  };
  
  switch (uploadType) {
    case 'trucking_invoices':
      uploadedFileData.trucking_invoices.files = data.files || convertToFiles(data.urls);
      uploadedFileData.trucking_invoices.folderUrl = data.folderUrl || '';
      break;
    case 'damage_images':
      uploadedFileData.damage_images.files = data.files || convertToFiles(data.urls);
      uploadedFileData.damage_images.folderUrl = data.folderUrl || '';
      break;
    case 'event_images':
      uploadedFileData.event_images.files = data.files || convertToFiles(data.urls);
      uploadedFileData.event_images.folderUrl = data.folderUrl || '';
      break;
    case 'travel_invoices':
      uploadedFileData.travel_invoices.files = data.files || convertToFiles(data.urls);
      uploadedFileData.travel_invoices.folderUrl = data.folderUrl || '';
      break;
    case 'coi_documents':
      if (data.file) {
        uploadedFileData.coi.file = data.file;
      } else if (data.url) {
        uploadedFileData.coi.file = { url: data.url, name: extractFileName(data.url) || 'COI Document' };
      } else {
        uploadedFileData.coi.file = null;
      }
      uploadedFileData.coi.folderUrl = data.folderUrl || '';
      break;
  }
}

/**
 * Delete a specific file from uploaded data
 */
function deleteUploadedFile(uploadType, fileUrl) {
  switch (uploadType) {
    case 'trucking_invoices':
      uploadedFileData.trucking_invoices.files = uploadedFileData.trucking_invoices.files.filter(f => f.url !== fileUrl);
      break;
    case 'damage_images':
      uploadedFileData.damage_images.files = uploadedFileData.damage_images.files.filter(f => f.url !== fileUrl);
      break;
    case 'event_images':
      uploadedFileData.event_images.files = uploadedFileData.event_images.files.filter(f => f.url !== fileUrl);
      break;
    case 'travel_invoices':
      uploadedFileData.travel_invoices.files = uploadedFileData.travel_invoices.files.filter(f => f.url !== fileUrl);
      break;
    case 'coi_documents':
      uploadedFileData.coi.file = null;
      break;
  }
}

/**
 * Clear uploaded file data
 */
function clearUploadedFileData() {
  uploadedFileData.trucking_invoices = { files: [], folderUrl: '' };
  uploadedFileData.damage_images = { files: [], folderUrl: '' };
  uploadedFileData.event_images = { files: [], folderUrl: '' };
  uploadedFileData.travel_invoices = { files: [], folderUrl: '' };
  uploadedFileData.coi = { file: null, folderUrl: '' };
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
    // Auto-save file URLs and names to Supabase
    await saveFileDataToSupabase('damage_images');
  } catch (error) {
    showUploadError(container, error.message);
    showToast(`Upload failed: ${error.message}`, 'error');
  }
  
  // Clear input so same file can be uploaded again
  inputElement.value = '';
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
    // Auto-save file URLs and names to Supabase
    await saveFileDataToSupabase('event_images');
  } catch (error) {
    showUploadError(container, error.message);
    showToast(`Upload failed: ${error.message}`, 'error');
  }
  
  inputElement.value = '';
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
    // Auto-save file URLs and names to Supabase
    await saveFileDataToSupabase('trucking_invoices');
  } catch (error) {
    showUploadError(container, error.message);
    showToast(`Upload failed: ${error.message}`, 'error');
  }
  
  inputElement.value = '';
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
    // Auto-save file URLs and names to Supabase
    await saveFileDataToSupabase('travel_invoices');
  } catch (error) {
    showUploadError(container, error.message);
    showToast(`Upload failed: ${error.message}`, 'error');
  }
  
  inputElement.value = '';
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
    // Auto-save file URL and name to Supabase
    await saveFileDataToSupabase('coi_documents');
  } catch (error) {
    showUploadError(container, error.message);
    showToast(`Upload failed: ${error.message}`, 'error');
  }
  
  inputElement.value = '';
}

/**
 * Save file URLs and names to Supabase (auto-save for uploads)
 */
async function saveFileDataToSupabase(uploadType) {
  if (typeof supabase === 'undefined' || typeof currentEventId === 'undefined' || !currentEventId) {
    console.warn('Supabase not available or no event ID - file data will be saved with section save');
    return false;
  }
  
  try {
    const tableInfo = getTableInfoForUploadType(uploadType);
    if (!tableInfo) {
      console.warn('Unknown upload type:', uploadType);
      return false;
    }
    
    const fileData = getUploadedFileData(uploadType);
    
    let updateData = {};
    
    if (tableInfo.isSingle) {
      // COI - single file
      updateData = {
        [tableInfo.urlColumn]: fileData.url || null,
        [tableInfo.nameColumn]: fileData.file?.name || null,
        [tableInfo.folderColumn]: fileData.folderUrl || null
      };
    } else {
      // Multiple files
      const urls = fileData.urls || [];
      const names = fileData.files ? fileData.files.map(f => f.name) : [];
      
      updateData = {
        [tableInfo.urlColumn]: urls.length > 0 ? urls : null,
        [tableInfo.nameColumn]: names.length > 0 ? names : null,
        [tableInfo.folderColumn]: fileData.folderUrl || null
      };
    }
    
    // Check if record exists
    const { data: existing, error: checkError } = await supabase
      .from(tableInfo.table)
      .select('event_id')
      .eq('event_id', currentEventId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      // Error other than "no rows"
      throw checkError;
    }
    
    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from(tableInfo.table)
        .update(updateData)
        .eq('event_id', currentEventId);
      
      if (updateError) throw updateError;
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from(tableInfo.table)
        .insert({ event_id: currentEventId, ...updateData });
      
      if (insertError) throw insertError;
    }
    
    console.log(`File data saved to ${tableInfo.table}:`, updateData);
    return true;
    
  } catch (error) {
    console.error('Error saving file data to Supabase:', error);
    showToast('File uploaded but failed to save to database. Please save the section manually.', 'warning');
    return false;
  }
}

// ============================================================================
// DISPLAY UPLOADED FILES
// ============================================================================

function displayUploadedFiles(container, urls, folderUrl, uploadType) {
  if (!container) return;
  
  const existingDisplay = container.querySelector('.uploaded-files-display');
  if (existingDisplay) existingDisplay.remove();
  
  // Get files with names
  const fileData = getUploadedFileData(uploadType);
  
  // Handle both array (files) and single file (file) formats
  let files = fileData.files || [];
  
  // For COI, convert single file to array
  if (files.length === 0 && fileData.file) {
    files = [fileData.file];
  }
  
  // If no files array, convert urls to files
  const displayFiles = files.length > 0 ? files : (urls || []).map((url, idx) => ({
    url: url,
    name: extractFileName(url) || `File ${idx + 1}`
  }));
  
  if (displayFiles.length === 0 && !folderUrl) return;
  
  const displayDiv = document.createElement('div');
  displayDiv.className = 'uploaded-files-display';
  displayDiv.dataset.uploadType = uploadType;
  
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
  
  if (displayFiles.length > 0) {
    html += '<div class="uploaded-files-list">';
    displayFiles.forEach((file) => {
      const isImage = isImageUrl(file.url);
      const fileIcon = isImage ? `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      ` : `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      `;
      
      html += `
        <div class="uploaded-file-row" data-url="${file.url}">
          <div class="file-info">
            <span class="file-type-icon">${fileIcon}</span>
            <a href="${file.url}" target="_blank" class="file-link" title="${file.name}">${file.name}</a>
          </div>
          <button type="button" class="delete-file-btn" onclick="handleDeleteFile('${uploadType}', '${file.url}', this)" title="Remove file">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      `;
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

function displaySingleUploadedFile(container, url, folderUrl, uploadType = 'coi_documents') {
  displayUploadedFiles(container, url ? [url] : [], folderUrl, uploadType);
}

/**
 * Handle file deletion - deletes from Google Drive and Supabase
 */
async function handleDeleteFile(uploadType, fileUrl, buttonElement) {
  if (!confirm('Are you sure you want to delete this file? This cannot be undone.')) return;
  
  const row = buttonElement.closest('.uploaded-file-row');
  if (row) {
    // Show loading state
    buttonElement.disabled = true;
    buttonElement.innerHTML = `
      <svg class="spinner" width="16" height="16" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"></circle>
      </svg>
    `;
  }
  
  try {
    // 1. Delete from Google Drive
    const driveDeleted = await deleteFromGoogleDrive(fileUrl);
    
    // 2. Delete from Supabase
    const dbDeleted = await deleteFromSupabase(uploadType, fileUrl);
    
    // 3. Remove from local data
    deleteUploadedFile(uploadType, fileUrl);
    
    // 4. Remove from UI with animation
    if (row) {
      row.style.opacity = '0';
      row.style.transform = 'translateX(10px)';
      setTimeout(() => {
        row.remove();
        
        // Check if no more files, remove the display container
        const display = document.querySelector(`.uploaded-files-display[data-upload-type="${uploadType}"]`);
        if (display) {
          const remainingFiles = display.querySelectorAll('.uploaded-file-row');
          if (remainingFiles.length === 0) {
            display.remove();
          }
        }
      }, 200);
    }
    
    showToast('File deleted successfully!', 'success');
    
  } catch (error) {
    console.error('Delete error:', error);
    showToast(`Delete failed: ${error.message}`, 'error');
    
    // Restore button
    if (row) {
      buttonElement.disabled = false;
      buttonElement.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      `;
    }
  }
}

/**
 * Delete file from Google Drive via Apps Script
 */
async function deleteFromGoogleDrive(fileUrl) {
  try {
    const response = await fetch("https://script.google.com/macros/s/AKfycbzP7f-04yJIeMZPLjg-JwqYl34dyP6VdBZpmktaDZSD-lhNtRpIA9HlbytGoDEW5KqM1g/exec", {
      method: 'POST',
      body: JSON.stringify({
        action: 'delete',
        fileUrl: fileUrl
      })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      console.warn('Google Drive delete warning:', result.error);
      // Don't throw - file might already be deleted or we don't have permission
    }
    
    return result.success;
  } catch (error) {
    console.warn('Google Drive delete error:', error);
    // Continue anyway - we still want to remove from database
    return false;
  }
}

/**
 * Delete file URL from Supabase database
 */
async function deleteFromSupabase(uploadType, fileUrl) {
  if (typeof supabase === 'undefined' || !currentEventId) {
    console.warn('Supabase not available or no event ID');
    return false;
  }
  
  try {
    // Get table and column info based on upload type
    const tableInfo = getTableInfoForUploadType(uploadType);
    if (!tableInfo) {
      console.warn('Unknown upload type:', uploadType);
      return false;
    }
    
    // Fetch current data
    const { data: currentData, error: fetchError } = await supabase
      .from(tableInfo.table)
      .select(tableInfo.urlColumn + ', ' + tableInfo.nameColumn)
      .eq('event_id', currentEventId)
      .single();
    
    if (fetchError) {
      console.warn('Fetch error:', fetchError);
      return false;
    }
    
    // Remove the URL and corresponding name from arrays
    let urls = currentData[tableInfo.urlColumn] || [];
    let names = currentData[tableInfo.nameColumn] || [];
    
    // Handle single file (COI) vs array
    if (tableInfo.isSingle) {
      // Single file - set to null
      const updateData = {
        [tableInfo.urlColumn]: null,
        [tableInfo.nameColumn]: null
      };
      
      const { error: updateError } = await supabase
        .from(tableInfo.table)
        .update(updateData)
        .eq('event_id', currentEventId);
      
      if (updateError) throw updateError;
      
    } else {
      // Array - remove specific URL
      const urlIndex = urls.indexOf(fileUrl);
      if (urlIndex > -1) {
        urls.splice(urlIndex, 1);
        if (names.length > urlIndex) {
          names.splice(urlIndex, 1);
        }
      }
      
      const updateData = {
        [tableInfo.urlColumn]: urls.length > 0 ? urls : null,
        [tableInfo.nameColumn]: names.length > 0 ? names : null
      };
      
      const { error: updateError } = await supabase
        .from(tableInfo.table)
        .update(updateData)
        .eq('event_id', currentEventId);
      
      if (updateError) throw updateError;
    }
    
    return true;
    
  } catch (error) {
    console.error('Supabase delete error:', error);
    throw error;
  }
}

/**
 * Get table and column information for upload type
 */
function getTableInfoForUploadType(uploadType) {
  const mapping = {
    'trucking_invoices': {
      table: 'internal_trucking_meta',
      urlColumn: 'trucking_invoices_urls',
      nameColumn: 'trucking_invoices_names',
      folderColumn: 'trucking_invoices_folder_url',
      isSingle: false
    },
    'travel_invoices': {
      table: 'internal_travel_meta',
      urlColumn: 'travel_invoices_urls',
      nameColumn: 'travel_invoices_names',
      folderColumn: 'travel_invoices_folder_url',
      isSingle: false
    },
    'damage_images': {
      table: 'internal_postevent',
      urlColumn: 'damage_images_urls',
      nameColumn: 'damage_images_names',
      folderColumn: 'damage_images_folder_url',
      isSingle: false
    },
    'event_images': {
      table: 'internal_postevent',
      urlColumn: 'event_images_urls',
      nameColumn: 'event_images_names',
      folderColumn: 'event_images_folder_url',
      isSingle: false
    },
    'coi_documents': {
      table: 'internal_coi',
      urlColumn: 'coi_file_url',
      nameColumn: 'coi_file_name',
      folderColumn: 'coi_folder_url',
      isSingle: true
    }
  };
  
  return mapping[uploadType] || null;
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
  
  // Display files with names from uploadedFileData
  const fileData = getUploadedFileData(uploadType);
  const folderUrl = fileData.folderUrl || result.folderUrl;
  
  // Handle both array (urls) and single (url) formats
  const urls = fileData.urls || (fileData.url ? [fileData.url] : []);
  displayUploadedFiles(container, urls, folderUrl, uploadType);
  
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

/* New list-style display */
.uploaded-files-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.uploaded-file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.uploaded-file-row:hover {
  border-color: #dee2e6;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.file-type-icon {
  flex-shrink: 0;
  color: #6c757d;
  display: flex;
  align-items: center;
}

.file-link {
  color: #0d6efd;
  text-decoration: none;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-link:hover {
  text-decoration: underline;
}

.delete-file-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #adb5bd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-file-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* Keep old grid style for backwards compatibility */
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
window.deleteUploadedFile = deleteUploadedFile;
window.handleDeleteFile = handleDeleteFile;
window.saveFileDataToSupabase = saveFileDataToSupabase;
window.uploadedFileData = uploadedFileData;
window.getUploadedUrls = getUploadedUrls;