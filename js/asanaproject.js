

let eventData1 = null;

const createProjectBtn = document.getElementById('createProjectBtn');
if (createProjectBtn) {
    createProjectBtn.addEventListener('click', () => {
      createAsanaProjectFromForm();
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
     
  
  
      // 1) core event
      const { data: ev, error: evErr } = await supabase
        .from("events")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();
      if (evErr) throw evErr;
      if (!ev) throw new Error("Event not found");
  
    
      // Build the shape your UI expects
      const data = {
        "deal-id": ev.event_id,
        "event-name-detail": ev.event_name || "",
        "contact-name": ev.contact_name || "",
        "contact-email": ev.contact_email || "",
        "start-date": ev.event_start_at ? formatEventDate(ev.event_start_at) : "",
        "end-date": ev.event_end_at ? formatEventDate(ev.event_end_at) : "",
        "address-line1": ev.address_line1 || "",
        "address-line2": ev.address_line2 || "",
        "display-address": ev.display_address || "",
        "city": ev.city || "",
        "state": ev.state || "",
        "postal-code": ev.postal_code || "",
        "country": ev.country || "",
        "main_onboarding_sheet_link": ev.main_onboarding_sheet_link || ""
      };
      

      
      

      // 3) Booking app addons (bookables)
      const { data: bookables, error: bkErr } = await supabase
        .from("booking_app_addons")
        .select("product_type, product, bookable")
        .eq("event_id", eventId)
        .order("id", { ascending: true });
      if (bkErr) throw bkErr;
      data.BookingApp = (bookables || []).map(r => ({ Product_Type: r.product_type, Product: r.product, Bookable: !!r.bookable }));
     

      return data;
      
  
    //  hideLoader();
    } catch (err) {
      console.error("loadEventData error:", err);
      document.getElementById("not-found-message")?.classList.remove("d-none");
      document.getElementById("form-wrapper")?.classList.add("d-none");
    return null;
    //  hideLoader();
    }
  }