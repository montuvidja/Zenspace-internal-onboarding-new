

let eventData1 = null;

const createProjectBtn = document.getElementById('updateArtworkProjectBtn');
if (createProjectBtn) {
    createProjectBtn.addEventListener('click', () => {
      loadArtWorkAndBranding();
    });
  }

const updatePrintingProjectBtn = document.getElementById('updatePrintingProjectBtn');
if (updatePrintingProjectBtn) {
    updatePrintingProjectBtn.addEventListener('click', () => {
      getInternalPrintingData();
    });
  }


const updatePrePlanBtn = document.getElementById('updatePrePlanBtn');
if (updatePrePlanBtn) {
    updatePrePlanBtn.addEventListener('click', () => {
      getPrePlanData();
    });
  }

const updateTruckingProjectBtn = document.getElementById('updateTruckingProjectBtn');
if (updateTruckingProjectBtn) {
    updateTruckingProjectBtn.addEventListener('click', () => {
    generateTruckingDescription();
    });
  }

const updatePostEventProjectBtn = document.getElementById('updatePostEventProjectBtn');
if (updatePostEventProjectBtn) {
    updatePostEventProjectBtn.addEventListener('click', () => {
    generatePostEventDescription();
    });

  }

const updateInstallerProjectBtn = document.getElementById('updateInstallerProjectBtn');
if (updateInstallerProjectBtn) {
    updateInstallerProjectBtn.addEventListener('click', () => {
    generateInstallationDescription();
    });
  }
  
const updateSoftwareProjectBtn = document.getElementById('updateSoftwareProjectBtn');
if (updateSoftwareProjectBtn) {
    updateSoftwareProjectBtn.addEventListener('click', () => {
    generateSoftwareDescription();
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
    const description = `Event Overview

          Event Name: ${event?.event_name || event?.deal_name || 'N/A'}

          Event Address: ${event?.display_address || [event?.address_line1, event?.city, event?.state, event?.postal_code, event?.country].filter(Boolean).join(', ') || 'N/A'}

          Event Start Date & Time: ${formatDate(event?.event_start_at)} | ${formatTime(event?.event_start_at)}
          Event End Date & Time: ${formatDate(event?.event_end_at)} | ${formatTime(event?.event_end_at)}

          Load-In: ${formatDate(event?.load_in_date)} | ${formatTime(event?.load_in_date)}
          Load-Out: ${formatDate(event?.load_out_date)} | ${formatTime(event?.load_out_date)}

          Event Organiser's Contact: 

               Name: ${contactName}
               Phone: ${contactPhone}
               Email: ${contactEmail}

          GC's Contact: 

               Name: ${gc_contactName}
               Phone: ${gc_contactPhone}
               Email: ${gc_contactEmail}

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
      
}

function getProjectId() {
  if (typeof currentProjectId !== 'undefined' && currentProjectId) {
    console.log("currentProjectId 11", currentProjectId);
    return currentProjectId;
  }
}