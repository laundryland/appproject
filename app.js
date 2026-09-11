// Register Service Worker untuk kemampuan PWA Offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('Service Worker Registered'))
      .catch(err => console.error('Service Worker Error:', err));
  });
}

// Inisialisasi & Default Storage Structure
let appData = JSON.parse(localStorage.getItem('APP_PROJECT_DATA')) || {
  activeProjectIndex: 0,
  cloudUrl: "",
  projects: [
    {
      name: "Project Utama",
      items: [
        { label: "Github Repo", type: "url", value: "https://github.com" },
        { label: "Folder Local", type: "folder", value: "C:\\Projects\\MyApp" },
        { label: "Catatan Bahan", type: "text", value: "Catatan kebutuhan project..." }
      ]
    }
  ]
};

// Fungsi Sanitasi Data untuk mencegah error struktur data lama
function sanitizeData() {
  if (!appData.projects || !Array.isArray(appData.projects) || appData.projects.length === 0) {
    appData.projects = [{ name: "Project Utama", items: [] }];
  }
  
  if (appData.activeProjectIndex === undefined || appData.activeProjectIndex >= appData.projects.length) {
    appData.activeProjectIndex = 0;
  }

  appData.projects.forEach(proj => {
    if (!Array.isArray(proj.items)) {
      proj.items = [];
    }
  });
}

// Inisialisasi saat Halaman Selesai Dimuat
document.addEventListener('DOMContentLoaded', () => {
  sanitizeData();
  renderProjectDropdown();
  loadCurrentProjectData();
  
  const cloudUrlInput = document.getElementById('cloudUrl');
  if (cloudUrlInput) {
    cloudUrlInput.value = appData.cloudUrl || "";
  }
});

// Simpan Data ke LocalStorage
function saveData() {
  localStorage.setItem('APP_PROJECT_DATA', JSON.stringify(appData));
}

// Render Pilihan Project di Dropdown Header
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

// Load Data Project Aktif ke Tampilan
function loadCurrentProjectData() {
  sanitizeData();
  const proj = appData.projects[appData.activeProjectIndex];
  if (!proj) return;
  
  const projectNameInput = document.getElementById('projectName');
  if (projectNameInput) {
    projectNameInput.value = proj.name || '';
  }
  
  renderDynamicItems();
}

// Update Nama Project Saat Diubah
function updateProjectName() {
  const idx = appData.activeProjectIndex;
  const nameVal = document.getElementById('projectName').value;
  appData.projects[idx].name = nameVal;
  saveData();
  renderProjectDropdown();
}

// Ganti Project Aktif dari Dropdown
function switchProject() {
  const select = document.getElementById('projectSelect');
  appData.activeProjectIndex = parseInt(select.value) || 0;
  saveData();
  loadCurrentProjectData();
}

// Tambah Workspace Project Baru
function createNewProject() {
  sanitizeData();
  const newProj = {
    name: "Project Baru " + (appData.projects.length + 1),
    items: [
      { label: "Link URL", type: "url", value: "" },
      { label: "Path Folder", type: "folder", value: "" }
    ]
  };
  appData.projects.push(newProj);
  appData.activeProjectIndex = appData.projects.length - 1;
  saveData();
  renderProjectDropdown();
  loadCurrentProjectData();
}

// Hapus Project Aktif
function deleteCurrentProject() {
  sanitizeData();
  if (appData.projects.length <= 1) {
    alert("Minimal harus ada 1 project.");
    return;
  }
  if (confirm("Apakah Anda yakin ingin menghapus project ini?")) {
    appData.projects.splice(appData.activeProjectIndex, 1);
    appData.activeProjectIndex = 0;
    saveData();
    renderProjectDropdown();
    loadCurrentProjectData();
  }
}

// Render Seluruh Kolom Dinamis & Tombol Eksekusi
function renderDynamicItems() {
  sanitizeData();
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
      valueControlHtml = `<textarea placeholder="Isi catatan / bahan..." oninput="updateItemValue(${index}, this.value)" rows="2">${item.value}</textarea>`;
      actionBtnHtml = `<button class="btn btn-secondary btn-sm" onclick="executeSingleItem(${index})">▶️ Salin Teks</button>`;
    } else if (item.type === 'folder') {
      valueControlHtml = `<input type="text" value="${item.value}" placeholder="Path Folder (contoh: C:\\Projects\\App)" oninput="updateItemValue(${index}, this.value)">`;
      actionBtnHtml = `<button class="btn btn-secondary btn-sm" onclick="executeSingleItem(${index})">▶️ Salin Path</button>`;
    } else { // type === 'url'
      valueControlHtml = `<input type="url" value="${item.value}" placeholder="https://..." oninput="updateItemValue(${index}, this.value)">`;
      actionBtnHtml = `<button class="btn btn-info btn-sm" onclick="executeSingleItem(${index})">▶️ Buka Link</button>`;
    }

    row.innerHTML = `
      <div class="item-row-header">
        <input type="text" value="${item.label}" placeholder="Label Kolom..." oninput="updateItemLabel(${index}, this.value)">
        <select onchange="updateItemType(${index}, this.value)">
          <option value="url" ${item.type === 'url' ? 'selected' : ''}>Link URL</option>
          <option value="folder" ${item.type === 'folder' ? 'selected' : ''}>Path Folder</option>
          <option value="text" ${item.type === 'text' ? 'selected' : ''}>Teks / Catatan</option>
        </select>
        <button class="btn btn-danger btn-sm" onclick="deleteItem(${index})">🗑️ Hapus</button>
      </div>
      <div class="item-row-body">
        ${valueControlHtml}
        ${actionBtnHtml}
      </div>
    `;

    container.appendChild(row);
  });
}

// Tambah Baris Kolom Baru
function addDynamicItem() {
  sanitizeData();
  const currentItems = appData.projects[appData.activeProjectIndex].items;
  currentItems.push({ label: "Kolom Baru " + (currentItems.length + 1), type: "url", value: "" });
  saveData();
  renderDynamicItems();
}

// Hapus Baris Kolom
function deleteItem(index) {
  sanitizeData();
  const currentItems = appData.projects[appData.activeProjectIndex].items;
  currentItems.splice(index, 1);
  saveData();
  renderDynamicItems();
}

// Update Label Kolom
function updateItemLabel(index, val) {
  appData.projects[appData.activeProjectIndex].items[index].label = val;
  saveData();
}

// Update Isi Value Kolom
function updateItemValue(index, val) {
  appData.projects[appData.activeProjectIndex].items[index].value = val;
  saveData();
}

// Update Tipe Kolom (URL / Folder / Teks)
function updateItemType(index, typeVal) {
  appData.projects[appData.activeProjectIndex].items[index].type = typeVal;
  saveData();
  renderDynamicItems();
}

// Eksekusi Masing-Masing Kolom
function executeSingleItem(index) {
  sanitizeData();
  const item = appData.projects[appData.activeProjectIndex].items[index];
  if (!item || !item.value.trim()) {
    alert("Isi kolom masih kosong!");
    return;
  }

  if (item.type === 'url') {
    let validUrl = item.value.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }
    window.open(validUrl, '_blank');
  } else {
    // Tipe Folder atau Teks disalin ke Clipboard
    navigator.clipboard.writeText(item.value).then(() => {
      alert(`Berhasil disalin ke clipboard:\n${item.value}`);
    }).catch(() => {
      alert("Gagal menyalin otomatis. Silakan salin manual.");
    });
  }
}

// Eksekusi Semua URL Serentak di Multi-Tab
function executeAllUrls() {
  sanitizeData();
  const currentItems = appData.projects[appData.activeProjectIndex].items || [];
  const urlItems = currentItems.filter(item => item.type === 'url' && item.value.trim() !== '');

  if (urlItems.length === 0) {
    alert("Tidak ada kolom ber-tipe Link URL yang terisi.");
    return;
  }

  urlItems.forEach(item => {
    let validUrl = item.value.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }
    window.open(validUrl, '_blank');
  });

  alert(`Mencoba membuka ${urlItems.length} tab URL.\n\nCatatan: Jika hanya 1 tab yang terbuka, pastikan izin 'Pop-up and Redirects' di browser Anda sudah di-ALLOW.`);
}

// Simpan URL Endpoint Google Apps Script
function saveCloudUrlData() {
  appData.cloudUrl = document.getElementById('cloudUrl').value.trim();
  saveData();
}

// Export Backup File JSON Lokal
function exportLocalBackup() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `APP_PROJECT_BACKUP_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Restore Backup File JSON Lokal
function importLocalBackup(event) {
  const fileReader = new FileReader();
  fileReader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      if (importedData && importedData.projects) {
        appData = importedData;
        sanitizeData();
        saveData();
        renderProjectDropdown();
        loadCurrentProjectData();
        document.getElementById('cloudUrl').value = appData.cloudUrl || "";
        alert("Backup berhasil di-restore!");
      } else {
        alert("Format berkas backup tidak valid.");
      }
    } catch (err) {
      alert("Gagal membaca berkas JSON.");
    }
  };
  if (event.target.files[0]) {
    fileReader.readAsText(event.target.files[0]);
  }
}

// Sync Backup ke Google Drive via Google Apps Script (Anti-CORS)
function syncToCloud() {
  const cloudUrl = appData.cloudUrl;
  if (!cloudUrl) {
    alert("Silakan masukkan URL Cloud Backup terlebih dahulu!");
    return;
  }

  fetch(cloudUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(appData)
  })
  .then(() => {
    alert("Proses Backup ke Google Drive selesai!\nSilakan cek file JSON baru di Google Drive Anda.");
  })
  .catch(err => alert("Error koneksi Cloud: " + err.message));
}
