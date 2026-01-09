document.addEventListener("DOMContentLoaded", () => {
    loadEventData();

    const woBtn = document.getElementById("generateWarehouseOrderBtn");
    if (woBtn) {
      woBtn.addEventListener("click", async () => {
        // base data from DB loader (jsonData) or freshly loaded
        const base = jsonData || await loadEventData();
        if (!base) return;
        // Merge current form values so user inputs (packing_deadline, etc.) are included
        const formValues = (typeof getAllFormData === 'function') ? getAllFormData() : {};
        const data = Object.assign({}, base, formValues);
        const wo = buildWarehouseWorkOrderPayload(data);
        const key = "wo_" + Date.now();
        localStorage.setItem(key, JSON.stringify(wo));
        window.open(`warehouse_work_order.html?woKey=${encodeURIComponent(key)}`, "_blank");
      });
    }

    const bolBtn = document.getElementById("generateBolBtn");
    if (bolBtn) {
      bolBtn.addEventListener("click", async () => {
        const base = jsonData || await loadEventData();
        if (!base) return;
        const formValues = (typeof getAllFormData === 'function') ? getAllFormData() : {};
        const data = Object.assign({}, base, formValues);
        const bol = buildBolPayload(data);
        const key = "bol_" + Date.now();
        localStorage.setItem(key, JSON.stringify(bol));
        window.open(`bol_form.html?bolKey=${encodeURIComponent(key)}`, "_blank");
      });
    }
  });

let jsonData;
  
  let isBookingInfoAvailable = false;

async function loadEventData() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      await ensureSupabaseClient();
    //  showLoader("Loading event data...");
      const eventId = urlParams.get('event_id');// '4718866000034408037';
      console.log("Loading data for event:", eventId);
  
  
      // 1) core event
      const { data: ev, error: evErr } = await supabase
        .from("events")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();
      if (evErr) throw evErr;
      if (!ev) throw new Error("Event not found");
  
      console.log("Loading data for event:", ev);
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
      console.log("Event data:", data);

      fetchEventFolderLinks(ev.event_name || "", ev.event_start_at);
      
      
      // 2) Branding items
      const { data: branding, error: bErr } = await supabase
        .from("branding_items")
        .select("product_type, product_id, branding_name, file_upload, drive_link")
        .eq("event_id", eventId)
        .order("id", { ascending: true });
      if (bErr) throw bErr;
      data.Branding = (branding || []).map(r => ({
        Product_Type: r.product_type, Product: r.product_id, Branding_Name: r.branding_name, file: r.file_upload || r.drive_link || ""
      }));
      console.log("Branding data:", data.Branding);

      // 3) Booking app addons (bookables)
      const { data: bookables, error: bkErr } = await supabase
        .from("booking_app_addons")
        .select("product_type, product, bookable")
        .eq("event_id", eventId)
        .order("id", { ascending: true });
      if (bkErr) throw bkErr;
      data.BookingApp = (bookables || []).map(r => ({ Product_Type: r.product_type, Product: r.product, Bookable: !!r.bookable }));
      console.log("Booking app data:", data.BookingApp);


      // 4) Monitor usage (old simple per product usage)
      const { data: mon, error: mErr } = await supabase
        .from("ov_monitor_usage")
        .select("product_type, product, usage_type")
        .eq("event_id", eventId)
        .order("id", { ascending: true });
      if (mErr) throw mErr;
      data.MonitorUse = (mon || []).map(r => ({ Product_Type: r.product_type, Product: r.product, MonitorUse: r.usage_type }));
      console.log("Monitor usage data:", data.MonitorUse);


      // 5) pods_booked
      const { data: pods, error: pErr } = await supabase
        .from("pods_booked")
        .select("pod_type, quantity, pod_ids, warehouse")
        .eq("event_id", eventId)
        .order("id", { ascending: true });
      if (pErr) throw pErr;
      data.podsBooked = (pods || []).map(r => ({
        name: r.pod_type,
        podNames: (r.pod_ids || "").split(",").map(s => s.trim()).filter(Boolean),
        warehouse: (r.warehouse || "").split(",").map(s => s.trim()).filter(Boolean),
        quantity: r.quantity || 0
      }));
      console.log("Pods booked data:", data.podsBooked);


      // 6) invoice_details
      const { data: invoices, error: invErr } = await supabase
        .from("invoice_details")
        .select("invoice_number, percent, due_date")
        .eq("event_id", eventId)
        .order("id", { ascending: true });
      if (invErr) throw invErr;
      data.invoiceDetail = (invoices || []).map(r => ({
        invoiceNumber: r.invoice_number,
        percentage: String(r.percent ?? ""),
        dueDate: r.due_date || ""
      }));
      console.log("Invoice details data:", data.invoiceDetail);


      // 7) additional_items
      const { data: adds, error: addErr } = await supabase
        .from("additional_items")
        .select("description, quantity")
        .eq("event_id", eventId)
        .order("id", { ascending: true });
      if (addErr) throw addErr;
      data.additionalItemList = (adds || []).map(r => ({
        additionalItemDescription: r.description, additionalItemQuantity: r.quantity, additionalItemPrice: "", additionalItemTotalPrice: ""
      }));
      console.log("Additional items data:", data.additionalItemList);   
      // Render
      jsonData = data;
    //  renderOrderSummary(data);
      // Fill common inputs
      populateHeaderData(data);
      populateOnboardingLink(data);
  
      // Fetch and populate folder links
      if (ev.event_name && ev.event_start_at) {
        const folderLinks = await fetchEventFolderLinks(ev.event_name, ev.event_start_at);
        if (folderLinks) {
          populateFolderLinks(folderLinks);
        }
      }
  
      // Build Availability calendar from BookingApp
      const anyBookable = (data.BookingApp || []).some(x => !!x.Bookable);
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


  function populateHeaderData(data) {
    console.log("Populating header data:", data);
    setText("event-name-detail", data["event-name-detail"]);
    setText("display-address", data["display-address"]);
    setText("start-date", data["start-date"]);
    setText("end-date", data["end-date"]);
  }

function populateOnboardingLink(data) {
  const linkEl = document.getElementById("main-onboarding-link");
  if (!linkEl) return;
  const href = data["main_onboarding_sheet_link"] || "";
  if (href) {
    linkEl.href = href;
    linkEl.style.display = "inline-block";
  } else {
    linkEl.style.display = "none";
  }
}

function populateFolderLinks(folderLinks) {
  const container = document.getElementById("foldersListContainer");
  const noMessage = document.getElementById("noFoldersMessage");
  const loader = document.getElementById("foldersLoader");
  
  if (!container) return;
  
  // Hide loader
  if (loader) loader.style.display = "none";
  
  // Clear existing content
  container.innerHTML = "";
  
  if (!folderLinks || !folderLinks.subfoldersList || folderLinks.subfoldersList.length === 0) {
    if (noMessage) noMessage.style.display = "flex";
    return;
  }
  
  if (noMessage) noMessage.style.display = "none";
  if (container) container.style.display = "grid";
  
  // Create folder items from subfoldersList
  folderLinks.subfoldersList.forEach(folder => {
    const folderItem = document.createElement("div");
    folderItem.className = "folder-item";
    folderItem.innerHTML = `
      <div class="folder-item-header">
        <div class="folder-item-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <div class="folder-item-name" title="${folder.name || ''}">${folder.name || 'Untitled Folder'}</div>
      </div>
      <div class="folder-item-actions">
        <button type="button" class="folder-item-copy-btn" data-url="${folder.url || ''}" title="Copy folder link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
        <a href="${folder.url || '#'}" target="_blank" rel="noopener noreferrer" class="folder-item-link">
          <span>Open Folder</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
      </div>
    `;
    container.appendChild(folderItem);
    
    // Add copy button event listener
    const copyBtn = folderItem.querySelector(".folder-item-copy-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const url = copyBtn.getAttribute("data-url");
        if (url) {
          navigator.clipboard.writeText(url).then(() => {
            showToast("Folder link copied to clipboard!", "success");
            // Visual feedback on button
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            setTimeout(() => {
              copyBtn.innerHTML = originalHTML;
            }, 2000);
          }).catch(() => {
            showToast("Failed to copy link", "error");
          });
        }
      });
    }
  });
}

  function setText(id, value) {
    const el = document.getElementById(id);
    console.log("Setting text for:", id, value);
  if (!el) return;
  const text = value == null ? "" : String(value);
  if ("value" in el) {
    el.value = text;
    if (el.tagName === "TEXTAREA") {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
      el.style.overflow = "hidden";
    }
  } else {
    el.textContent = text;
  }
  }


/* ============================================================
   Warehouse Work Order launcher + payload mapper
   - Stores payload in localStorage and opens warehouse_work_order.html
   ============================================================ */

function getSelectedWarehouseAddress() {
  const selected = document.querySelector('input[name="warehouse_address"]:checked');
  if (!selected) return "";
  // include the address title (e.g. "NYC Warehouse") along with details
  const label = selected.closest(".address-option");
  const title = label?.querySelector(".address-title")?.textContent?.trim() || "";
  if (selected.value === "other") {
    const ta = document.querySelector('textarea[name="warehouse_address_other"]');
    const other = (ta?.value || "").trim();
    // For custom 'Other' addresses we return only the entered text (no title)
    return other;
  }
  // get text from the selected option card
  const details = label?.querySelector(".address-details")?.textContent || "";
  return title ? `${title} — ${details.trim()}` : details.trim();
}

function buildWarehouseWorkOrderPayload(data) {
  const eventAddress =
    data["display-address"] ||
    [
      data["address-line1"],
      data["address-line2"],
      data["city"],
      data["state"],
      data["postal-code"],
      data["country"]
    ].filter(Boolean).join(", ");

  const warehouseAddress = getSelectedWarehouseAddress();
  const packingDeadline = data["packing_deadline"] || "";

  return {
    dealName: data["event-name-detail"] || "",
    eventAddress,
    eventStartDate: data["start-date"] || "",
    eventEndDate: data["end-date"] || "",
    warehouseAddress,
    packingDeadline,
    podsBooked: (data.podsBooked || []).map(r => ({
      podType: r.name || "",
      quantity: r.quantity ?? "",
      podIds: Array.isArray(r.podNames) ? r.podNames.join(", ") : (r.podNames || ""),
      warehouse: Array.isArray(r.warehouse) ? r.warehouse.join(", ") : (r.warehouse || ""),
      warehouseAddress
    })),
    brandingAddOns: (data.Branding || []).map(r => ({
      podType: r.Product_Type || "",
      podId: r.Product || "",
      brandingName: r.Branding_Name || ""
    })),
    bookingAppAddOn: (data.BookingApp || []).map(r => ({
      podType: r.Product_Type || "",
      product: r.Product || "",
      bookable: r.Bookable ? "TRUE" : "FALSE"
    })),
    monitorUse: (data.MonitorUse || []).map(r => ({
      podType: r.Product_Type || "",
      product: r.Product || "",
      monitorUse: r.MonitorUse || ""
    }))
  };
}



function getSelectedWarehouseLocation() {
  const selected = document.querySelector('input[name="warehouse_address"]:checked');
  if (!selected) return { name: "", address: "" };

  const card = selected.closest(".address-option");
  const title = card?.querySelector(".address-title")?.textContent?.trim() || "";

  if (selected.value === "other") {
    const ta = document.querySelector('textarea[name="warehouse_address_other"]');
    const other = (ta?.value || "").trim();
    return { name: "", address: other };
  }

  const details = (card?.querySelector(".address-details")?.textContent || "").trim();
  return { name: title, address: details };
}

function toDatetimeLocal(value) {
  if (!value) return "";
  // Already in datetime-local format
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return value.slice(0,16);

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getFirstAvailable(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

/**
 * Build payload for bol_form.html
 * Requirements:
 * - 2 default stops: Pickup then Drop-off
 * - Pickup stop pulls warehouse address + pickup date/time + special instructions + items from podsBooked
 * - Drop-off stop includes items from podsBooked
 */
function buildBolPayload(data) {
  const eventAddress =
    data["display-address"] ||
    [
      data["address-line1"],
      data["address-line2"],
      data["city"],
      data["state"],
      data["postal-code"],
      data["country"]
    ].filter(Boolean).join(", ");

  const wh = getSelectedWarehouseLocation();

  const pickupDateTime = toDatetimeLocal(data["pickup_datetime_1"] || "");
  const specialInstructions = data["delivery_instructions_1"] || "";

  const contactName = getFirstAvailable(data, [
    "contact-name",
    "contactName",
    "contact_name",
    "Contact Name"
  ]);

  const contactNumber = getFirstAvailable(data, [
    "contact-number",
    "contactNumber",
    "contact_phone",
    "contact_phone_number",
    "phone",
    "Contact Number"
  ]);

  const items = (data.podsBooked || []).map(r => ({
    qty: r.quantity ?? "",
    itemName: Array.isArray(r.podNames) ? r.podNames.join(", ") : (r.podNames || ""),
    type: r.name || "",
    weight: "",
    hm: ""
  }));

  const dropoffDateTime = toDatetimeLocal(data["start-date"] || "");

  return {
    bolNumber: "",
    bolDate: "",
    eventName: data["event-name-detail"] || "",
    eventStartDate: data["start-date"] || "",
    eventEndDate: data["end-date"] || "",
    stops: [
      {
        type: "Pickup",
        locationName: wh.name || "Pickup",
        address: wh.address || "",
        dateTime: pickupDateTime,
        contactName: contactName || "",
        contactNumber: contactNumber || "",
        instructions: specialInstructions || "",
        pickupItems: items,
        dropoffItems: []
      },
      {
        type: "Drop-off",
        locationName: data["event-name-detail"] || "Drop-off",
        address: eventAddress || "",
        dateTime: dropoffDateTime,
        contactName: "",
        contactNumber: "",
        instructions: "",
        pickupItems: [],
        dropoffItems: items
      }
    ]
  };
}


async function fetchEventFolderLinks(eventName, startDate) {
  try {

    if(eventName && startDate) {
      eventName = createFolderName(eventName, startDate);
      currentEventName = eventName;
      console.log("Fetching folder links for event:", eventName);
      const url = "https://script.google.com/macros/s/AKfycby3cy0xKc_kft-dGPfQWFCTWbhze-9GG6-NzWdy5V4TlerPwq_a6vBfx1lVRHJk5UQb/exec";

    
      const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify({ eventName })
      });

      const result = await res.json();

      if (!result?.data?.ok) {
        console.warn("⚠️ Server error:", result?.data?.error || result);
        return null;
      }

    
      console.log("✅ Folder links:", result.data);

      return result.data;
    }
  } catch (err) {
    console.error("❌ fetchEventFolderLinks error:", err);
    return null;
  } finally {
    
  }
  
}

