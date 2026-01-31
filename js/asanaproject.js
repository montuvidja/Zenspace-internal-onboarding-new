let eventData1 = null;

// Reusable confirmation dialog function
function showConfirmDialog(title, message, onConfirm) {
  // Remove any existing dialog
  const existingDialog = document.querySelector('.confirm-dialog-overlay');
  if (existingDialog) existingDialog.remove();

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'confirm-dialog-overlay';
  overlay.innerHTML = `
    <div class="confirm-dialog">
      <div class="confirm-dialog-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h3>${title}</h3>
      </div>
      <p class="confirm-dialog-message">${message}</p>
      <div class="confirm-dialog-actions">
        <button class="confirm-dialog-btn cancel">Cancel</button>
        <button class="confirm-dialog-btn confirm">Confirm</button>
      </div>
    </div>
  `;

  // Add styles if not already added
  if (!document.getElementById('confirm-dialog-styles')) {
    const styles = document.createElement('style');
    styles.id = 'confirm-dialog-styles';
    styles.textContent = `
      .confirm-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .confirm-dialog {
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease;
      }
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .confirm-dialog-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }
      .confirm-dialog-header svg {
        width: 24px;
        height: 24px;
        color: #f59e0b;
      }
      .confirm-dialog-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
      }
      .confirm-dialog-message {
        color: #6b7280;
        margin: 0 0 24px 0;
        line-height: 1.5;
      }
      .confirm-dialog-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      .confirm-dialog-btn {
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
      }
      .confirm-dialog-btn.cancel {
        background: #f3f4f6;
        color: #374151;
      }
      .confirm-dialog-btn.cancel:hover {
        background: #e5e7eb;
      }
      .confirm-dialog-btn.confirm {
        background: #3b82f6;
        color: white;
      }
      .confirm-dialog-btn.confirm:hover {
        background: #2563eb;
      }
    `;
    document.head.appendChild(styles);
  }

  document.body.appendChild(overlay);

  // Handle button clicks
  const cancelBtn = overlay.querySelector('.confirm-dialog-btn.cancel');
  const confirmBtn = overlay.querySelector('.confirm-dialog-btn.confirm');

  cancelBtn.addEventListener('click', () => {
    overlay.remove();
  });

  confirmBtn.addEventListener('click', () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });

  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

const createProjectBtn = document.getElementById('updateArtworkProjectBtn');
if (createProjectBtn) {
    createProjectBtn.addEventListener('click', () => {
      showConfirmDialog(
        'Update Artwork Project',
        'Are you sure you want to update the Artwork & Branding project in Asana?',
        () => loadArtWorkAndBranding()
      );
    });
  }

const updatePrintingProjectBtn = document.getElementById('updatePrintingProjectBtn');
if (updatePrintingProjectBtn) {
    updatePrintingProjectBtn.addEventListener('click', () => {
      showConfirmDialog(
        'Update Printing Project',
        'Are you sure you want to update the Printing project in Asana?',
        () => getInternalPrintingData()
      );
    });
  }


const updatePrePlanBtn = document.getElementById('updatePrePlanBtn');
if (updatePrePlanBtn) {
    updatePrePlanBtn.addEventListener('click', () => {
      showConfirmDialog(
        'Update Pre-Plan Project',
        'Are you sure you want to update the Pre-Planning project in Asana?',
        () => getPrePlanData()
      );
    });
  }

const updateTruckingProjectBtn = document.getElementById('updateTruckingProjectBtn');
if (updateTruckingProjectBtn) {
    updateTruckingProjectBtn.addEventListener('click', () => {
      showConfirmDialog(
        'Update Trucking Project',
        'Are you sure you want to update the Trucking project in Asana?',
        () => generateTruckingDescription()
      );
    });
  }

const updatePostEventProjectBtn = document.getElementById('updatePostEventProjectBtn');
if (updatePostEventProjectBtn) {
    updatePostEventProjectBtn.addEventListener('click', () => {
      showConfirmDialog(
        'Update Post-Event Project',
        'Are you sure you want to update the Post-Event project in Asana?',
        () => generatePostEventDescription()
      );
    });

  }

const updateInstallerProjectBtn = document.getElementById('updateInstallerProjectBtn');
if (updateInstallerProjectBtn) {
    updateInstallerProjectBtn.addEventListener('click', () => {
      showConfirmDialog(
        'Update Installation Project',
        'Are you sure you want to update the Installation project in Asana?',
        () => generateInstallationDescription()
      );
    });
  }
  
const updateSoftwareProjectBtn = document.getElementById('updateSoftwareProjectBtn');
if (updateSoftwareProjectBtn) {
    updateSoftwareProjectBtn.addEventListener('click', () => {
      showConfirmDialog(
        'Update Software Project',
        'Are you sure you want to update the Software project in Asana?',
        () => generateSoftwareDescription()
      );
    });
  }




  /**
 * Create Asana project via Make.com webhook
 */
async function createAsanaProjectFromForm() {
    // Replace with your Make.com webhook URL
    const MAKE_WEBHOOK_URL = 'https://hook.eu2.make.com/65ekfm999df11s29ypulbd3rf28lhh3n';
    
    try {
       // showMessage('Creating Asana project...', 'info');
      eventData1 = await getPrePlanData(); // Ensure data is loaded before collecting form data
        
        // Collect form data
        const payload = {
            // Basic Info
            event_name: eventData1["event-name-detail"] || '',
            event_start_date: eventData1["start-date"] || '',
            event_end_date: eventData1["end-date"] || '',
            main_onboarding_sheet_link: eventData1["main_onboarding_sheet_link"] || '',
            external_onboarding_form_link: `https://onboarding.zenspace.io/external/index.html?event_id=${eventData1['deal-id']}`,
            internal_onboarding_form_link: `https://onboarding.zenspace.io/internal/index.html?event_id=${eventData1['deal-id']}`,
           
            // Metadata
            created_at: new Date().toISOString(),
            created_by: 'Internal Onboarding Form'
        };
        
        console.log('Sending to Make.com:', payload);
        
        const response = await fetch(MAKE_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Webhook failed: ${response.status}`);
        }
        
        console.log('Asana project creation triggered successfully');
        return true;
        
    } catch (error) {
        console.error('Error creating Asana project:', error);
        return false;
    }
}


async function getPrePlanData() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      await ensureSupabaseClient();
    //  showLoader("Loading event data...");
      const eventId = urlParams.get('event_id');// '4718866000034408037';
     


    // Fetch all data in parallel
    const [eventResult, podResult, evContactResult, bookingResult, brandingResult] = await Promise.all([
      supabase
        .from("events")
        .select("*")
        .eq("event_id", eventId)
        .single(),
      
      supabase
        .from('pods_booked')
        .select('*')
        .eq('event_id', eventId),

      supabase
        .from('event_contacts')
        .select('*')
        .eq('event_id', eventId)
        .single(),

      supabase
        .from('booking_app_addons')
        .select('*')
        .eq('event_id', eventId),

      supabase
        .from('branding_items')
        .select('*')
        .eq('event_id', eventId),
    ]);

    // Extract data
    const event = eventResult.data;
    const pods = podResult.data || [];
    const contact = evContactResult.data;
    const addons = bookingResult.data || [];
    const branding = brandingResult.data || [];

    // Format dates
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    // Build pods summary (e.g., "2 units of 4-Seater Pods, 1 unit of 6-Seater Pod")
    const podsSummary = pods.map(p => 
      `${p.quantity || 1} unit${(p.quantity || 1) > 1 ? 's' : ''} of ${p.pod_type}`
    ).join(', ') || 'N/A';

    // Build branding summary
    const brandingSummary = branding.length > 0 
      ? branding.map(b => b.branding_name).join(', ')
      : 'No Branding';

    // Check for booking software addon
    const hasBookingSoftware = addons.some(a => 
      a.product_type?.toLowerCase().includes('booking') || 
      a.product?.toLowerCase().includes('booking')
    );

    const hasBranding = branding.length > 0;

    // Build contact info
    const contactName = contact 
      ? `${contact.org_first_name || ''} ${contact.org_last_name || ''}`.trim()
      : '';
    const contactPhone = contact?.org_phone || '';
    const contactEmail = contact?.org_email || '';
    const contactInfo = [contactName, contactPhone, contactEmail].filter(Boolean).join(' | ') || 'N/A';

    // Build contact info
    const gc_contactName = contact 
      ? `${contact.gc_first_name || ''} ${contact.gc_last_name || ''}`.trim()
      : '';
    const gc_contactPhone = contact?.org_phone || '';
    const gc_contactEmail = contact?.org_email || '';
    const gc_contactInfo = [gc_contactName, gc_contactPhone, gc_contactEmail].filter(Boolean).join(' | ') || 'N/A';

    // Build the description
    const description = `Event Overview:

  Event Name: ${event?.event_name || event?.deal_name || 'N/A'}

  Event Address: ${event?.display_address || [event?.address_line1, event?.city, event?.state, event?.postal_code, event?.country].filter(Boolean).join(', ') || 'N/A'}

  Event Start Date & Time: ${formatDate(event?.event_start_at)} | ${formatTime(event?.event_start_at)}
  Event End Date & Time: ${formatDate(event?.event_end_at)} | ${formatTime(event?.event_end_at)}

  Load-In: ${formatDate(event?.load_in_date)} | ${formatTime(event?.load_in_date)}
  Load-Out: ${formatDate(event?.load_out_date)} | ${formatTime(event?.load_out_date)}

--------------------------------------------------------

Event Organiser's Contact: 

  Name: ${contactName}
  Phone: ${contactPhone}
  Email: ${contactEmail}

GC's Contact: 

  Name: ${gc_contactName}
  Phone: ${gc_contactPhone}
  Email: ${gc_contactEmail}

--------------------------------------------------------     

Scope of Work
  1. Pods: ${podsSummary}
  2. Branding: ${hasBranding ? 'Custom Branding' : 'No Branding'}
  3. Delivery Type: 
  4. Booking Software: ${hasBookingSoftware ? 'Yes' : 'No'}`;


      console.log("Generated Description:", description);


      const data = {
        "project_id": getProjectId(),
        "confirm_details": description,
        "Task":"pre_event_planning"
      };

      updateProjectTask(data);
  
  } catch (err) {
        console.error("loadEventData error:", err);
        document.getElementById("not-found-message")?.classList.remove("d-none");
        document.getElementById("form-wrapper")?.classList.add("d-none");
      return null;
      //  hideLoader();
      }
}

async function loadArtWorkAndBranding() {

  const urlParams = new URLSearchParams(window.location.search);
      await ensureSupabaseClient();
    //  showLoader("Loading event data...");
      const eventId = urlParams.get('event_id');
       // 1) core event
      const { data: ev, error: evErr } = await supabase
        .from("internal_artwork")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();
      if (evErr) throw evErr;
      if (!ev) throw new Error("Event not found");
  

      // Build the shape your UI expects
      const data = {
        "project_id": getProjectId(),
        "event_id": ev.event_id,
        "proofs_responsible": ev.proofs_responsible || "",
        "proofs_responsible_other": ev.proofs_responsible_other || "",
        "proofs_responsible_other_email": ev.proofs_responsible_other_email || "",
        "graphics_upload_link": ev.graphics_upload_link || "",
        "proofs_folder_link": ev.proofs_folder_link || "",
        "proofs_due_date": ev.proofs_due_date || "",
        "special_instructions": ev.special_instructions || "",
        "proofs_approved": ev.proofs_approved || "",
        "Task":"artwork_and_branding"
      };

      updateProjectTask(data);

}

// Fetch internal printing data with associated quotes
async function getInternalPrintingData() {
  try {
      const urlParams = new URLSearchParams(window.location.search);
      await ensureSupabaseClient();
    //  showLoader("Loading event data...");
      const eventId = urlParams.get('event_id');
       // 1) core event
      const [printingResult, quotesResult] = await Promise.all([
      supabase
        .from('internal_printing')
        .select('*')
        .eq('event_id', eventId)
        .single(),
      
      supabase
        .from('internal_printing_quotes')
        .select('*')
        .eq('event_id', eventId)
        .order('quote_index', { ascending: true })
    ]);

    // Handle errors
    if (printingResult.error && printingResult.error.code !== 'PGRST116') {
      throw printingResult.error;
    }
    if (quotesResult.error) {
      throw quotesResult.error;
    }

    const printingData = {
      ...printingResult.data,
      quotes: quotesResult.data || [] // Include quotes if available
    }

     const data = {
        "project_id": getProjectId(),
        "printing_data": printingData,
        "Task":"printing"
      };

    updateProjectTask(data);
    
  } catch (error) {
    console.error('Error fetching internal printing data:', error);
    return { success: false, error: error.message };
  }
}



async function generateTruckingDescription() {
  try {
    const bol_folder_link = document.getElementById("folder_bol_url").href || "";
    const urlParams = new URLSearchParams(window.location.search);
    await ensureSupabaseClient();
    const eventId = urlParams.get('event_id');

    // Fetch trucking entries and meta in parallel
    const [truckingResult, metaResult] = await Promise.all([
      supabase
        .from('internal_trucking')
        .select('*')
        .eq('event_id', eventId)
        .order('entry_index', { ascending: true }),
      
      supabase
        .from('internal_trucking_meta')
        .select('*')
        .eq('event_id', eventId)
        .single()
    ]);

    const truckingEntries = truckingResult.data || [];
    const meta = metaResult.data;

    // Format date (DD/MM/YYYY)
    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Format time (h:mm am/pm)
    const formatTime = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      }).toLowerCase();
    };

    // Format date with time
    const formatDateTime = (dateStr) => {
      if (!dateStr) return 'N/A';
      return `${formatDate(dateStr)} - ${formatTime(dateStr)}`;
    };

    // Get truck source name
    const getTruckSource = (entry) => {
      if (entry.truck_source_new) return entry.truck_source_new;
      if (entry.truck_source_other) return entry.truck_source_other;
      if (entry.truck_source && entry.truck_source.length > 0) {
        return entry.truck_source.join(', ');
      }
      return 'N/A';
    };

    // Get truck quote
    const getTruckQuote = (entry) => {
      return entry.truck_quote || 
             entry.truck_quote_enterprise || 
             entry.truck_quote_axle || 
             entry.truck_quote_edward || 
             entry.truck_quote_other || 
             'N/A';
    };

    // Get pickup address
    const getPickupAddress = (entry) => {
      if (entry.pickup_warehouse_other) {
        return entry.pickup_warehouse_other;
      }
      if (entry.pickup_warehouse) {
        return entry.pickup_warehouse;
      }
      return 'N/A';
    };

    // Format drivers from JSONB
    const formatDrivers = (drivers) => {
      if (!drivers || !Array.isArray(drivers) || drivers.length === 0) {
        return '    No drivers assigned';
      }
      
      const sortedDrivers = [...drivers].sort((a, b) => 
        (a.driver_index || 0) - (b.driver_index || 0)
      );
      
      return sortedDrivers.map((driver, index) => {
        const driverNum = driver.driver_index || (index + 1);
        let driverText = `    Driver \n`;
        driverText += `      Name: ${driver.driver_name || 'N/A'}\n`;
        driverText += `      Mobile No: ${driver.driver_mobile || 'N/A'}\n`;
        driverText += `      Email: ${driver.driver_email || 'N/A'}`;
        return driverText;
      }).join('\n');
    };

    // Build trucking description (all entries)
    let truckingDescription = '';

    truckingEntries.forEach((entry, index) => {
      const entryNumber = entry.entry_index || (index + 1);
      
      truckingDescription += `Truck Source #${entryNumber}\n`;
      truckingDescription += `  Source Name: ${getTruckSource(entry)}\n`;
      truckingDescription += `  Truck Type: ${entry.truck_type || 'N/A'}\n`;
      truckingDescription += `  Truck Size: ${entry.truck_size || 'N/A'}\n`;
      truckingDescription += `  Truck Quote: ${getTruckQuote(entry)}\n`;
      truckingDescription += `  Pick Up Address: ${getPickupAddress(entry)}\n`;
      truckingDescription += `  Delivery Address: ${entry.delivery_address || 'N/A'}\n`;
      truckingDescription += `  Pick Up Date: ${formatDate(entry.pickup_datetime)}\n`;
      truckingDescription += `  Special Delivery Instruction: ${entry.delivery_instructions || ''}\n`;
      truckingDescription += `  Is Approved: ${entry.is_trucking_quote_approved ? 'Yes' : 'No'}\n`;
      
      if (index < truckingEntries.length - 1) {
        truckingDescription += '\n';
      }
    });

    if (meta?.special_instructions) {
      truckingDescription += '\n\nGeneral Trucking Instructions:\n';
      truckingDescription += meta.special_instructions;
    }

    // Filter approved entries
    const approvedEntries = truckingEntries.filter(entry => entry.is_trucking_quote_approved === true);

    // Build driver description (only approved truck sources)
    let driverDescription = '';

    if (approvedEntries.length === 0) {
      driverDescription = 'No approved truck sources found.';
    } else {
      approvedEntries.forEach((entry, index) => {
        const entryNumber = entry.entry_index || (index + 1);
        
        driverDescription += `Truck Source #${entryNumber} - ${getTruckSource(entry)}\n`;
        driverDescription += `  Pick Up Date: ${formatDate(entry.pickup_datetime)}\n`;
        driverDescription += `  Delivery Address: ${entry.delivery_address || 'N/A'}\n`;
        driverDescription += `  Driver Details:\n`;
        driverDescription += formatDrivers(entry.drivers);
        
        if (index < approvedEntries.length - 1) {
          driverDescription += '\n\n';
        }
      });
    }

    // Build pickup/delivery description (only approved truck sources)
    let pickupDeliveryDescription = '';

    if (approvedEntries.length === 0) {
      pickupDeliveryDescription = 'No approved truck sources found.';
    } else {
      approvedEntries.forEach((entry, index) => {
        const entryNumber = entry.entry_index || (index + 1);
        
        pickupDeliveryDescription += `Truck Source #${entryNumber} - ${getTruckSource(entry)}\n`;
        pickupDeliveryDescription += `----------------------------------------\n`;
        
        // Pickup section
        if(entry.pickup_warehouse.toLowerCase() === 'other') {
          pickupDeliveryDescription += `Pickup - ${entry.pickup_warehouse_other} \n`;
        } else {
          pickupDeliveryDescription += `Pickup - ${entry.pickup_warehouse || 'N/A'} Warehouse (Zenspace) \n`;
          pickupDeliveryDescription += `         ${entry.pickup_warehouse_other}\n`;
        }
        pickupDeliveryDescription += `Pick up Date - ${formatDateTime(entry.pickup_datetime)}`;
        
        pickupDeliveryDescription += `\n \n`;
        
        // Drop off section
        pickupDeliveryDescription += `Drop off - ${entry.delivery_address || 'N/A'}\n`;
        pickupDeliveryDescription += `Drop off Date - ${formatDateTime(entry.delivery_datetime)}\n`;
        
        if (index < approvedEntries.length - 1) {
          pickupDeliveryDescription += '\n\n';
        }
      });
    }

    const data = {
      "project_id": getProjectId(),
      "confirm_details": truckingDescription,
      "driver_details": driverDescription,
      "pickup_delivery_details": pickupDeliveryDescription,
      "bol_folder_link": bol_folder_link || "",
      "Task": "trucking_source"
    };

    updateProjectTask(data);

  } catch (error) {
    console.error('Error generating trucking description:', error);
    return { success: false, error: error.message };
  }
}

async function generatePostEventDescription() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    await ensureSupabaseClient();
    const eventId = urlParams.get('event_id');

    // Fetch post-event data
    const { data: postEventData, error } = await supabase
      .from('internal_postevent')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const postEvent = postEventData;

    // Format date with time
    const formatDateTime = (dateStr) => {
      if (!dateStr) return 'N/A';
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const time = date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      }).toLowerCase();
      return `${day}/${month}/${year} ${time}`;
    };

    // Format receiving persons
    const formatReceivingPersons = (receivingArray, otherName, otherEmail) => {
      if (!receivingArray || !Array.isArray(receivingArray) || receivingArray.length === 0) {
        return 'N/A';
      }

      return receivingArray.map((person, index) => {
        const num = index + 1;
        if (person.toLowerCase() === 'other') {
          // Use other name and email
          const otherDetails = otherEmail ? `${otherName || 'N/A'} - ${otherEmail}` : (otherName || 'N/A');
          return `${num}. ${otherDetails}`;
        }
        return `${num}. ${person}`;
      }).join('\n         ');
    };

    // 1. Receiving Person Details
    const receivingPersonDescription = `Receiving Person Details
-----------------------------------------
Name: ${formatReceivingPersons(postEvent?.warehouse_receiving, postEvent?.warehouse_receiving_other, postEvent?.warehouse_receiving_other_email)}
Return Date: ${formatDateTime(postEvent?.return_datetime)}
Return Address: ${postEvent?.return_address || postEvent?.return_address_other || 'N/A'}
Special Instruction: ${postEvent?.special_instructions || 'None'}`;

    // 2. Damage Check
    const hasDamage = postEvent?.items_damage?.toLowerCase() === 'yes' || 
                      (postEvent?.damage_images_urls && postEvent?.damage_images_urls.length > 0);
    
    let damageDescription = '';
    if (hasDamage) {
      damageDescription = `Damage Check 🔍
-----------------------------------------
Damages: Yes
Damage Photo Folder: ${postEvent?.damage_images_folder_url || 'N/A'}`;
    } else {
      damageDescription = `Damage Check 🔍
-----------------------------------------
Damages: No`;
    }

    // 3. Event Photos
    const eventPhotosDescription = `Pod Paparazzi Time 📸
-----------------------------------------
Events Photo Folder: ${postEvent?.event_images_folder_url || 'N/A'}`;

    // 4. Client Debrief
    const clientDebriefDescription = `Client Debrief ☕
-----------------------------------------
${postEvent?.debrief_note || 'No debrief notes available.'}`;

    const data = {
      "project_id": getProjectId(),
      "receiving_person": receivingPersonDescription,
      "is_damage": damageDescription,
      "event_photos": eventPhotosDescription,
      "client_debrief": clientDebriefDescription,
      "Task": "post_event"
    };

    updateProjectTask(data);

  } catch (error) {
    console.error('Error generating post-event description:', error);
    return { success: false, error: error.message };
  }
}


async function generateInstallationDescription() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    await ensureSupabaseClient();
    const eventId = urlParams.get('event_id');

    // Fetch installation data
    const { data: installationData, error: installError } = await supabase
      .from('internal_installation')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (installError && installError.code !== 'PGRST116') {
      throw installError;
    }

    const installation = installationData;

    // Fetch installation dates
    const { data: datesData, error: datesError } = await supabase
      .from('internal_installation_dates')
      .select('*')
      .eq('event_id', eventId)
      .order('date_index', { ascending: true });

    if (datesError && datesError.code !== 'PGRST116') {
      throw datesError;
    }

    // Separate install and dismantle dates
    const installDates = (datesData || []).filter(d => d.date_type === 'install');
    const dismantleDates = (datesData || []).filter(d => d.date_type === 'dismantle');

    // Format time from 24h to 12h (e.g., "14:00:00" -> "2 pm")
    const formatTime = (timeStr) => {
      if (!timeStr) return 'N/A';
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'pm' : 'am';
      const hour12 = hour % 12 || 12;
      if (minutes && minutes !== '00') {
        return `${hour12}:${minutes} ${ampm}`;
      }
      return `${hour12} ${ampm}`;
    };

    // Format date from YYYY-MM-DD to DD/MM/YYYY
    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Format installer/dismantler names from array
    const formatNames = (namesArray, otherName, otherEmail) => {
      if (!namesArray || !Array.isArray(namesArray) || namesArray.length === 0) {
        return 'N/A';
      }
      return namesArray.map((name, index) => {
        const num = index + 1;
        if (name.toLowerCase() === 'other') {
          const otherDetails = otherEmail ? `${otherName || 'N/A'} - ${otherEmail}` : (otherName || 'N/A');
          return ` ${num}. ${otherDetails}`;
        }
        return ` ${num}. ${name}`;
      }).join('\n          ');
    };

    // Format dates section (handles single or multiple dates)
    const formatDatesSection = (dates) => {
      if (!dates || dates.length === 0) {
        return `Date: N/A | From Time: N/A | To Time: N/A`;
      }

      if (dates.length === 1) {
        const d = dates[0];
        return `Date: ${formatDate(d.date_value)} | From: ${formatTime(d.from_time)} | To: ${formatTime(d.to_time)}`;
      }

      // Multiple dates
      return dates.map((d, idx) => {
        return `Date ${idx + 1}: ${formatDate(d.date_value)} | From: ${formatTime(d.from_time)} | To: ${formatTime(d.to_time)}`;
      }).join('\n');
    };

    // 1. Installer Details
    const installerDescription = `Installer Details 🔧
-----------------------------------------
Name: ${formatNames(installation?.install_installer, installation?.install_installer_other, installation?.install_installer_other_email)}

${formatDatesSection(installDates)}

Location: ${installation?.install_location || 'N/A'}

Special Instructions: ${installation?.install_special_instructions || 'None'}`;

    // 2. Dismantler Details
    const dismantlerDescription = `Dismantler Details 🔨
-----------------------------------------
Name: ${formatNames(installation?.dismantle_installer, installation?.dismantle_installer_other, installation?.dismantle_installer_other_email)}

${formatDatesSection(dismantleDates)}

Location: ${installation?.dismantle_location || 'N/A'}

Special Instructions: ${installation?.dismantle_special_instructions || 'None'}`;

    const data = {
      "project_id": getProjectId(),
      "installer_details": installerDescription,
      "dismantler_details": dismantlerDescription,
      "Task": "installation"
    };

    updateProjectTask(data);

  } catch (error) {
    console.error('Error generating installation description:', error);
    return { success: false, error: error.message };
  }
}

async function generateSoftwareDescription() {

  const urlParams = new URLSearchParams(window.location.search);
      await ensureSupabaseClient();
    //  showLoader("Loading event data...");
      const eventId = urlParams.get('event_id');
       // 1) core event
      const { data: ev, error: evErr } = await supabase
        .from("internal_booking_software")
        .select("*")
        .eq("event_id", eventId)
        .single();
      if (evErr) throw evErr;
      if (!ev) throw new Error("Event not found");

      const description = `Hi Abhijeet,
Please create a booking page with the details outlined below:

1. Booking Page 
Slug - 
Contact Details (footer) - 
Address - 
Pod address - 

2. Branding & Visuals
Banner Image: 

Color Palette / Brand Style Guide:

3. Calendar Availability:

4. Admin Access
Please provide admin access to: 

Let me know once the page is live or if you need anything further from my side.`

const graphics_links = ` Client Provided Graphics Folder Link: ${ev.client_graphics_folder_link || "N/A"}
Generated Graphics Folder Link: ${ev.generated_graphics_folder_link || "N/A"}`
  

      // Build the shape your UI expects
      const data = {
        "project_id": getProjectId(),
        "event_id": ev.event_id,
        "client_graphics_folder_link": ev.client_graphics_folder_link || "",
        "generated_graphics_folder_link": ev.generated_graphics_folder_link || "",
        "graphics_links": graphics_links || "",
        "booking_web_url": ev.booking_web_url || "",
        "descritpion": description || "",
        "note": ev.notes || "",
        "Task":"booking_software"
      };

      updateProjectTask(data);

}


async function updateProjectTask(data) {

  try{
        const MAKE_WEBHOOK_URL = 'https://hook.eu2.make.com/tfl2towp9ly3bxrce6qupd35ng4cg464';

        const response = await fetch(MAKE_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`Webhook failed: ${response.status}`);
        } 
        showToast('The Asana project has been updated successfully.', 'success');
        
  } catch (error) {
      showToast('Failed to update the Asana project.', 'error');
  }
      
}

function getProjectId() {
  if (typeof currentProjectId !== 'undefined' && currentProjectId) {
    console.log("currentProjectId 11", currentProjectId);
    return currentProjectId;
  }
}