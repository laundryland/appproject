
// === IndexedDB Wrapper ===
const DB_NAME = 'APP_PROJECT_DB_V2';
const STORE_NAME = 'projects_store';
let db;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE_NAME)) {
        d.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = e => reject(e.target.error);
  });
}

async function saveDataIDB() {
  if (!db) await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ id: 'main', data: appData, ts: Date.now() });
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function loadDataIDB() {
  if (!db) await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get('main');
    req.onsuccess = () => res(req.result ? req.result.data : null);
    req.onerror = () => rej(req.error);
  });
}

// === App State ===
let appData = {
  activeProjectIndex: 0,
  cloudUrl: "",
  projects: [{ name: "Project Utama", items: [{ label: "Github Repo", type: "url", value: "https://github.com" }] }]
};

function sanitizeData() {
  if (!appData.projects || !Array.isArray(appData.projects) || appData.projects.length === 0) {
    appData.projects = [{ name: "Project Utama", items: [] }];
  }
  if (appData.activeProjectIndex === undefined || appData.activeProjectIndex >= appData.projects.length) {
    appData.activeProjectIndex = 0;
  }
  appData.projects.forEach(p => { if (!Array.isArray(p.items)) p.items = []; });
}

// Escape HTML anti-XSS
function esc(str){ const d=document.createElement('div'); d.textContent=str||''; return d.innerHTML; }

document.addEventListener('DOMContentLoaded', async () => {
  // Migrasi dari localStorage lama jika ada
  const legacy = localStorage.getItem('APP_PROJECT_DATA');
  const idbData = await loadDataIDB();
  if (idbData) {
    appData = idbData;
  } else if (legacy) {
    try { appData = JSON.parse(legacy); } catch {}
  }
  sanitizeData();
  renderProjectDropdown();
  loadCurrentProjectData();
  const cloudUrlInput = document.getElementById('cloudUrl');
  if (cloudUrlInput) cloudUrlInput.value = appData.cloudUrl || "";
  // Register SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
});

async function saveData() {
  sanitizeData();
  await saveDataIDB();
  // backup ke localStorage juga sebagai fallback
  localStorage.setItem('APP_PROJECT_DATA', JSON.stringify(appData));
}

// --- UI Logic (sama, tapi saveData async) ---
function renderProjectDropdown() {
  const select = document.getElementById('projectSelect');
  if (!select) return;
  select.innerHTML = '';
  appData.projects.forEach((proj, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = proj.name || `Project ${idx + 1}`;
    if (idx === appData.activeProjectIndex) opt.selected = true;
    select.appendChild(opt);
  });
}
function loadCurrentProjectData() {
  sanitizeData();
  const proj = appData.projects[appData.activeProjectIndex];
  if (!proj) return;
  document.getElementById('projectName').value = proj.name || '';
  renderDynamicItems();
}
async function updateProjectName() {
  appData.projects[appData.activeProjectIndex].name = document.getElementById('projectName').value;
  await saveData(); renderProjectDropdown();
}
async function switchProject() {
  appData.activeProjectIndex = parseInt(document.getElementById('projectSelect').value) || 0;
  await saveData(); loadCurrentProjectData();
}
async function createNewProject() {
  sanitizeData();
  appData.projects.push({ name: "Project Baru " + (appData.projects.length + 1), items: [{ label: "Link URL", type: "url", value: "" }] });
  appData.activeProjectIndex = appData.projects.length - 1;
  await saveData(); renderProjectDropdown(); loadCurrentProjectData();
}
async function deleteCurrentProject() {
  sanitizeData();
  if (appData.projects.length <= 1) { alert("Minimal 1 project."); return; }
  if (confirm("Hapus project ini?")) {
    appData.projects.splice(appData.activeProjectIndex, 1);
    appData.activeProjectIndex = 0;
    await saveData(); renderProjectDropdown(); loadCurrentProjectData();
  }
}
function renderDynamicItems() {
  const container = document.getElementById('dynamicItemsContainer');
  if (!container) return;
  container.innerHTML = '';
  const currentItems = appData.projects[appData.activeProjectIndex].items;
  currentItems.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    let valueControlHtml = '';
    let actionBtnHtml = '';
    if (item.type === 'text') {
      valueControlHtml = `<textarea placeholder="Isi catatan..." oninput="updateItemValue(${index}, this.value)" rows="2">${esc(item.value)}</textarea>`;
      actionBtnHtml = `<button class="btn btn-secondary btn-sm" onclick="executeSingleItem(${index})">Salin Teks</button>`;
    } else if (item.type === 'folder') {
      valueControlHtml = `<input type="text" value="${esc(item.value)}" placeholder="Path Folder" oninput="updateItemValue(${index}, this.value)">`;
      actionBtnHtml = `<button class="btn btn-secondary btn-sm" onclick="executeSingleItem(${index})">Salin Path</button>`;
    } else {
      valueControlHtml = `<input type="url" value="${esc(item.value)}" placeholder="https://..." oninput="updateItemValue(${index}, this.value)">`;
      actionBtnHtml = `<button class="btn btn-info btn-sm" onclick="executeSingleItem(${index})">Buka Link</button>`;
    }
    row.innerHTML = `
      <div class="item-row-header">
        <input type="text" value="${esc(item.label)}" placeholder="Label" oninput="updateItemLabel(${index}, this.value)">
        <select onchange="updateItemType(${index}, this.value)">
          <option value="url" ${item.type==='url'?'selected':''}>Link URL</option>
          <option value="folder" ${item.type==='folder'?'selected':''}>Path Folder</option>
          <option value="text" ${item.type==='text'?'selected':''}>Teks</option>
        </select>
        <button class="btn btn-danger btn-sm" onclick="deleteItem(${index})">Hapus</button>
      </div>
      <div class="item-row-body">${valueControlHtml}${actionBtnHtml}</div>`;
    container.appendChild(row);
  });
}
async function addDynamicItem() {
  appData.projects[appData.activeProjectIndex].items.push({ label: "Kolom Baru", type: "url", value: "" });
  await saveData(); renderDynamicItems();
}
async function deleteItem(index) {
  appData.projects[appData.activeProjectIndex].items.splice(index, 1);
  await saveData(); renderDynamicItems();
}
async function updateItemLabel(index, val) { appData.projects[appData.activeProjectIndex].items[index].label = val; await saveData(); }
async function updateItemValue(index, val) { appData.projects[appData.activeProjectIndex].items[index].value = val; await saveData(); }
async function updateItemType(index, typeVal) { appData.projects[appData.activeProjectIndex].items[index].type = typeVal; await saveData(); renderDynamicItems(); }
function executeSingleItem(index) {
  const item = appData.projects[appData.activeProjectIndex].items[index];
  if (!item || !item.value.trim()) { alert("Kosong!"); return; }
  if (item.type === 'url') {
    let u = item.value.trim(); if (!u.startsWith('http')) u='https://'+u; window.open(u,'_blank');
  } else {
    navigator.clipboard.writeText(item.value).then(()=>alert("Disalin:\n"+item.value));
  }
}
function executeAllUrls() {
  const urls = appData.projects[appData.activeProjectIndex].items.filter(i=>i.type==='url' && i.value.trim());
  if(!urls.length){ alert("Tidak ada URL"); return; }
  urls.forEach(i=>{ let u=i.value.trim(); if(!u.startsWith('http')) u='https://'+u; window.open(u,'_blank'); });
}

// === BACKUP BARU: IndexedDB + CSV + PNG + JSON ===
function saveCloudUrlData(){ appData.cloudUrl=document.getElementById('cloudUrl').value.trim(); saveData(); }

// 1. EXPORT JSON (dump IndexedDB paling paten untuk restore)
function exportJSON() {
  const blob = new Blob([JSON.stringify(appData,null,2)], {type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`APP_PROJECT_${new Date().toISOString().slice(0,10)}.json`; a.click();
}

// 2. EXPORT CSV (bisa dibuka Excel, bisa di-restore)
function exportCSV() {
  let rows = [["project_name","label","type","value"]];
  appData.projects.forEach(p=>{
    p.items.forEach(it=>{
      // escape double quote
      const v = (it.value||'').replace(/"/g,'""');
      const l = (it.label||'').replace(/"/g,'""');
      const pn = (p.name||'').replace(/"/g,'""');
      rows.push([`"${pn}"`,`"${l}"`,`"${it.type}"`,`"${v}"`]);
    });
  });
  const csv = rows.map(r=>r.join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`APP_PROJECT_${new Date().toISOString().slice(0,10)}.csv`; a.click();
}

// 3. EXPORT PNG (Visual backup + data tersembunyi di dalam PNG untuk restore)
function exportPNG() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 1200;
  const rowH = 28;
  const totalRows = appData.projects.reduce((s,p)=>s+p.items.length,0) + appData.projects.length + 5;
  canvas.height = Math.max(400, totalRows*rowH + 100);
  
  // bg
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#2563eb'; ctx.fillRect(0,0,canvas.width,70);
  ctx.fillStyle='#fff'; ctx.font='bold 28px Segoe UI'; ctx.fillText('APP PROJECT - BACKUP PNG', 20, 45);
  ctx.fillStyle='#000'; ctx.font='14px monospace';
  let y=90;
  ctx.fillText(`Tanggal: ${new Date().toLocaleString()} | Total Project: ${appData.projects.length}`,20,y); y+=30;
  
  appData.projects.forEach((p,pi)=>{
    ctx.fillStyle='#111827'; ctx.font='bold 16px Segoe UI'; ctx.fillText(`[${pi+1}] ${p.name}`,20,y); y+=24;
    ctx.fillStyle='#374151'; ctx.font='13px Segoe UI';
    p.items.forEach(it=>{
      const txt = `${it.label} (${it.type}) : ${it.value}`.slice(0,110);
      ctx.fillText(`- ${txt}`,40,y); y+=rowH;
      if(y>canvas.height-30){ /* stop overflow */ }
    });
    y+=10;
  });
  
  // SIMPAN JSON di dalam PNG sebagai tEXt chunk (cara simpel: taruh di localStorage untuk demo, tapi kita juga embed di dataURL via canvas? Untuk restore kita pakai file JSON terpisah yang di-encode base64 di akhir PNG)
  // Trik paten: kita simpan data backup di name file, dan saat restore PNG kita baca via FileReader + extract hidden JSON dari localStorage cache
  // Untuk implementasi 100% restoreable, kita akan pakai: PNG visual + file JSON terkompresi di dalam drag-drop (lihat importPNG)
  
  // Simpan mapping data ke global untuk importPNG
  canvas._backupData = JSON.stringify(appData);
  
  canvas.toBlob(blob=>{
    // Sisipkan JSON sebagai metadata dengan membuat file baru: PNG + append JSON marker
    const reader = new FileReader();
    reader.onload = ()=>{
      const pngBuffer = reader.result;
      const jsonStr = JSON.stringify(appData);
      const marker = new TextEncoder().encode("||BACKUP_JSON||"+jsonStr);
      const combined = new Uint8Array(pngBuffer.byteLength + marker.byteLength);
      combined.set(new Uint8Array(pngBuffer),0);
      combined.set(marker,pngBuffer.byteLength);
      const finalBlob = new Blob([combined], {type:'image/png'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(finalBlob);
      a.download=`APP_PROJECT_${new Date().toISOString().slice(0,10)}.png`; a.click();
      // Simpan juga ke indexedDB log
      localStorage.setItem('_last_png_backup', jsonStr);
    };
    reader.readAsArrayBuffer(blob);
  });
}

// === IMPORT / RESTORE ===
function importJSON(event){
  const f=event.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      if(!data.projects) throw new Error();
      appData=data; sanitizeData(); saveData(); renderProjectDropdown(); loadCurrentProjectData();
      document.getElementById('cloudUrl').value=appData.cloudUrl||""; alert("Restore JSON berhasil! (IndexedDB updated)");
    }catch{ alert("Format JSON tidak valid"); }
  }; r.readAsText(f);
}

function importCSV(event){
  const f=event.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=e=>{
    try{
      const lines=e.target.result.split('\n').filter(l=>l.trim());
      const header=lines.shift();
      const map={};
      lines.forEach(line=>{
        // simple CSV parse quoted
        const m=line.match(/"([^"]*(?:""[^"]*)*)"|"([^,]+)"|([^,]+)/g);
        // fallback naive split
        let cols=[];
        let cur=''; let inQ=false;
        for(let c of line){
          if(c=='"'){ inQ=!inQ; cur+=c; }
          else if(c==',' && !inQ){ cols.push(cur); cur=''; }
          else cur+=c;
        }
        cols.push(cur);
        const clean = s=>s.replace(/^"|"$/g,'').replace(/""/g,'"');
        const pn=clean(cols[0]||''), label=clean(cols[1]||''), type=clean(cols[2]||'url'), value=clean(cols[3]||'');
        if(!map[pn]) map[pn]={name:pn, items:[]};
        map[pn].items.push({label,type,value});
      });
      const newProjects=Object.values(map);
      if(newProjects.length===0) throw new Error();
      if(confirm(`CSV terdeteksi ${newProjects.length} project. Timpa data sekarang?`)){
        appData.projects=newProjects; appData.activeProjectIndex=0; sanitizeData(); saveData(); renderProjectDropdown(); loadCurrentProjectData();
        alert("Restore CSV berhasil!");
      }
    }catch(err){ alert("Gagal baca CSV: "+err.message); }
  }; r.readAsText(f);
}

// Restore dari PNG yang kita export (yang ada marker ||BACKUP_JSON||)
function importPNG(event){
  const f=event.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=e=>{
    try{
      const buf=e.target.result;
      const text=new TextDecoder().decode(new Uint8Array(buf));
      const idx=text.indexOf("||BACKUP_JSON||");
      if(idx===-1){
        // fallback: coba pakai cache terakhir
        const cached=localStorage.getItem('_last_png_backup');
        if(cached){ appData=JSON.parse(cached); sanitizeData(); saveData(); renderProjectDropdown(); loadCurrentProjectData(); alert("Restore PNG (dari cache) berhasil!"); return; }
        alert("PNG ini tidak mengandung data backup. Gunakan PNG hasil Export PNG dari app ini.");
        return;
      }
      const jsonStr=text.slice(idx+15);
      const data=JSON.parse(jsonStr);
      appData=data; sanitizeData(); saveData(); renderProjectDropdown(); loadCurrentProjectData();
      document.getElementById('cloudUrl').value=appData.cloudUrl||""; alert("Restore PNG berhasil! Data tersembunyi di dalam PNG ditemukan.");
    }catch(err){ alert("Gagal restore PNG: "+err.message); }
  }; r.readAsArrayBuffer(f);
}

function syncToCloud(){
  const url=appData.cloudUrl; if(!url){ alert("Isi URL Cloud dulu"); return; }
  fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify(appData)})
  .then(()=>alert("Backup Cloud dikirim (cek Drive)")).catch(e=>alert(e.message));
}
