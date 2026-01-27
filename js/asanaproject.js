

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
      loadEventData1();
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
      eventData1 = await loadEventData1(); // Ensure data is loaded before collecting form data
        
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


async function loadEventData1() {
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

async function getPrePlanData() {
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