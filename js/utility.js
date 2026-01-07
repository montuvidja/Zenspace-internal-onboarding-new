function formatEventDate(dstr) {
    if (!dstr) return "";
    const date = new Date(dstr);
    if (isNaN(date)) return dstr; // if it's already formatted
    const day = String(date.getDate()).padStart(2, "0");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mon = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${day}-${mon}-${year} ${hh}:${mm}`;
  }

  function createFolderName(eventName, startDate) {
    if (!eventName) return "";
    const date = new Date(startDate);
    
    const day = String(date.getDate()).padStart(2, "0");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mon = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    eventName = eventName+"_"+`${day}-${mon}-${year}`;
    return eventName;
  }

  