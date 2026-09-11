// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('Service Worker Registered'))
      .catch(err => console.error('Service Worker Error:', err));
  });
}

// Default Storage Structure
let appData = JSON.parse(localStorage.getItem('APP_PROJECT_DATA')) || {
  activeProjectIndex: 0,
  cloudUrl: "",
  projects: [
    {
      name: "Project Sample",
      items: [
        { label: "Github Repo", type: "url", value: "https://github.com" },
        { label: "Figma Design", type: "url", value: "https://figma.com" },
        { label: "Folder Source Code", type: "folder", value: "D:\\Projects\\MyApp" },
        { label: "Catatan Kendala", type: "text", value: "Perlu perbaikan modul login" }
      ]
    }
  ]
};

// DOM Load
document.addEventListener('DOMContentLoaded', () => {
  renderProjectDropdown();
  loadCurrentProjectData();
  document.getElementById('cloudUrl').value = appData.cloudUrl || "";
});

function saveData() {
  localStorage.setItem('APP_PROJECT_DATA', JSON.stringify(appData));
}

function renderProjectDropdown() {
  const select = document.getElementById('projectSelect');
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
  const proj = appData.projects[appData.activeProjectIndex];
  if (!proj) return;
  
  document.getElementById('projectName').value = proj.name || '';
  renderDynamicItems();
}

function updateProjectName() {
  const idx = appData.activeProjectIndex;
  appData.projects[idx].name = document.getElementById('projectName').value;
  saveData();
  renderProjectDropdown();
}

function switchProject() {
  const select = document.getElementById('projectSelect');
  appData.activeProjectIndex = parseInt(select.value);
  saveData();
  loadCurrentProjectData();
}

function createNewProject() {
  const newProj = {
    name: "Project Baru " + (appData.projects.length + 1),
    items: [
      { label: "URL Website", type: "url", value: "" },
      { label: "Folder Project", type: "folder", value: "" }
    ]
  };
  appData.projects.push(newProj);
  appData.activeProjectIndex = appData.projects.length - 1;
  saveData();
  renderProjectDropdown();
  loadCurrentProjectData();
}

function deleteCurrentProject() {
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

// Render Dynamic Item Rows
function renderDynamicItems() {
  const container = document.getElementById('dynamicItemsContainer');
  container.innerHTML = '';
  
  const currentItems = appData.projects[appData.activeProjectIndex].items || [];

  currentItems.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'item-row';

    let valueControlHtml = '';
    let actionBtnHtml = '';

    if (item.type === 'text') {
      valueControlHtml = `<textarea placeholder="Isi catatan atau bahan..." oninput="updateItemValue(${index}, this.value)" rows="2">${item.value}</textarea>`;
      actionBtnHtml = `<button class="btn btn-secondary btn-sm" onclick="copyToClipboard('${index}')">📋 Copy Teks</button>`;
    } else if (item.type === 'folder') {
      valueControlHtml = `<input type="text" value="${item.value}" placeholder="Path Folder (Contoh: C:\\Projects\\App)" oninput="updateItemValue(${index}, this.value)">`;
      actionBtnHtml = `<button class="btn btn-secondary btn-sm" onclick="copyToClipboard('${index}')">📋 Copy Path</button>`;
    } else { // URL
      valueControlHtml = `<input type="url" value="${item.value}" placeholder="https://..." oninput="updateItemValue(${index}, this.value)">`;
      actionBtnHtml = `<button class="btn btn-info btn-sm" onclick="openSingleUrl('${item.value}')">🔗 Buka Tab</button>`;
    }

    row.innerHTML = `
      <div class="item-row-header">
        <input type="text" value="${item.label}" placeholder="Label Kolom (misal: GitHub, Figma, Path...)" oninput="updateItemLabel(${index}, this.value)">
        <select onchange="updateItemType(${index}, this.value)">
          <option value="url" ${item.type === 'url' ? 'selected' : ''}>Link URL</option>
          <option value="folder" ${item.type === 'folder' ? 'selected' : ''}>Path Folder</option>
          <option value="text" ${item.type === 'text' ? 'selected' : ''}>Teks / Catatan</option>
        </select>
        <button class="btn btn-danger btn-sm" onclick="deleteItem(${index})">🗑️</button>
      </div>
      <div class="item-row-body">
        ${valueControlHtml}
        ${actionBtnHtml}
      </div>
    `;

    container.appendChild(row);
  });
}

function addDynamicItem() {
  const currentItems = appData.projects[appData.activeProjectIndex].items;
  currentItems.push({ label: "Kolom Baru", type: "url", value: "" });
  saveData();
  renderDynamicItems();
}

function deleteItem(index) {
  const currentItems = appData.projects[appData.activeProjectIndex].items;
  currentItems.splice(index, 1);
  saveData();
  renderDynamicItems();
}

function updateItemLabel(index, val) {
  appData.projects[appData.activeProjectIndex].items[index].label = val;
  saveData();
}

function updateItemValue(index, val) {
  appData.projects[appData.activeProjectIndex].items[index].value = val;
  saveData();
}

function updateItemType(index, typeVal) {
  appData.projects[appData.activeProjectIndex].items[index].type = typeVal;
  saveData();
  renderDynamicItems();
}

// Execution Functions
function openSingleUrl(url) {
  if (!url) return alert("URL masih kosong!");
  let validUrl = url.startsWith('http://') || url.startsWith('https://') ? url : 'https://' + url;
  window.open(validUrl, '_blank');
}

function copyToClipboard(itemIndex) {
  const item = appData.projects[appData.activeProjectIndex].items[itemIndex];
  if (!item.value) return alert("Isi kolom masih kosong!");
  navigator.clipboard.writeText(item.value).then(() => {
    alert(`Berhasil di-copy: ${item.value}`);
  });
}

// Buka Semua Tab URL Serentak
function executeAllUrls() {
  const currentItems = appData.projects[appData.activeProjectIndex].items || [];
  const urlItems = currentItems.filter(item => item.type === 'url' && item.value.trim() !== '');

  if (urlItems.length === 0) {
    alert("Tidak ada item ber-tipe Link URL yang terisi.");
    return;
  }

  urlItems.forEach(item => {
    let validUrl = item.value.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }
    window.open(validUrl, '_blank');
  });

  alert(`Mencoba membuka ${urlItems.length} tab URL.\n\nCatatan: Jika hanya 1 tab yang terbuka, pastikan izin 'Pop-up and Redirects' di browser Anda sudah di-ALLOW untuk web ini.`);
}

// Backup & Cloud Operations
function saveCloudUrlData() {
  appData.cloudUrl = document.getElementById('cloudUrl').value;
  saveData();
}

function exportLocalBackup() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `APP_PROJECT_BACKUP_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importLocalBackup(event) {
  const fileReader = new FileReader();
  fileReader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      if (importedData.projects) {
        appData = importedData;
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
  fileReader.readAsText(event.target.files[0]);
}

function syncToCloud() {
  const cloudUrl = appData.cloudUrl;
  if (!cloudUrl) {
    alert("Silakan masukkan URL Cloud Backup terlebih dahulu!");
    return;
  }

  fetch(cloudUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appData)
  })
  .then(res => {
    if (res.ok) alert("Data berhasil di-backup ke Cloud!");
    else alert("Gagal mengunggah ke Cloud. Status: " + res.status);
  })
  .catch(err => alert("Error koneksi Cloud: " + err.message));
}