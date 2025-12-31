(function(){
  const URL = window.SUPABASE_URL || "https://dzctvxbqixqipuymgidr.supabase.co";
  const KEY = window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6Y3R2eGJxaXhxaXB1eW1naWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NjExNTIsImV4cCI6MjA3NzEzNzE1Mn0.bP-LbBmpiov-lrbRB1B9Rk-V-V11m6Yhzx6t5ss-oQs";


  // Promise anyone can await to ensure client is ready
  let _resolver;
  window.__supabaseReady = new Promise(res => { _resolver = res; });

  function init() {
    try {
      // If CDN library not present yet, retry shortly
      if (!window.supabase || (typeof window.supabase.createClient !== "function")) {
        setTimeout(init, 20);
        return;
      }
      // Create client but DO NOT clobber the library object
      const client = window.supabase.createClient(URL, KEY, { auth: { persistSession: false } });

      // Expose in a consistent way
      window.sb = client;                 // preferred alias
      window.supabaseClient = client;     // alt alias
      window.supabase = client;           // backward compat: many files call supabase.from(...)

      // Tiny helpers
      window.sbUpsert = async (table, payload, onConflictCols) => {
        const opts = onConflictCols && onConflictCols.length ? { onConflict: onConflictCols.join(",") } : {};
        const { data, error } = await client.from(table).upsert(payload, opts).select();
        if (error) throw error;
        return data;
      };
      window.sbDeleteWhere = async (table, filterFn) => {
        let q = client.from(table).delete();
        q = filterFn(q);
        const { data, error } = await q;
        if (error) throw error;
        return data;
      };
      window.sbInsertMany = async (table, rows) => {
        const { data, error } = await client.from(table).insert(rows).select();
        if (error) throw error;
        return data;
      };

      // Signal ready
      window.dispatchEvent(new CustomEvent("supabase-ready"));
      if (_resolver) _resolver();
    } catch (e) {
      console.error("Supabase init failed:", e);
    }
  }

  // Start initialization after DOM starts parsing; retry until CDN library available.
  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }

  // Public helper to ensure the Supabase client is ready
  window.ensureSupabaseClient = async () => {
    if (window.supabase && typeof window.supabase.from === "function") return window.supabase;
    if (window.__supabaseReady) {
      await window.__supabaseReady;
      return window.supabase;
    }
    throw new Error("Supabase client not initialized");
  };
})();
