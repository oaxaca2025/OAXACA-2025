(function(){
  const DB_NAME = 'planner_inline_attachments_v4'; const STORE = 'files'; let dbPromise = null;
  function openDB(){ if(dbPromise) return dbPromise; dbPromise = new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME,1); req.onupgradeneeded = ()=>{ req.result.createObjectStore(STORE); };
    req.onsuccess = ()=>resolve(req.result); req.onerror = ()=>reject(req.error); }); return dbPromise; }
  async function put(key, blob){ const db = await openDB(); return new Promise((resolve,reject)=>{
    const tx = db.transaction(STORE,'readwrite'); tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = resolve; tx.onerror = ()=>reject(tx.error); }); }
  async function get(key){ const db = await openDB(); return new Promise((resolve,reject)=>{
    const tx = db.transaction(STORE,'readonly'); const req = tx.objectStore(STORE).get(key);
    req.onsuccess = ()=>resolve(req.result||null); req.onerror = ()=>reject(req.error); }); }
  window.AttachmentsDB = { put, get };
})();