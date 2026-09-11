// Register Service Worker untuk PWA Offline Capability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('Service Worker Registered'))
      .catch(err => console.error('Service Worker Error:', err));
  });
}

// Inisialisasi Data Storage
let appData = JSON.parse(localStorage.getItem('APP_PROJECT_DATA')) || {
  activeProjectIndex: 0,
  cloudUrl: "",
  projects: [
    {
      name: "Default Project",
      folder: "C:\\Projects\\MyDefaultApp",
      hostingUrl: "https://myproject.github.io",
      urls: "https://github.com\nhttps://google.com",
      notes: "Catatan kendala awal project..."
    }
  ]
};

// Fungsi Render & Load Initial Data
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
  document.getElementById('projectFolder').value = proj.folder || '';
  document.getElementById('projectHostingUrl').value = proj.hostingUrl || '';
  document.getElementById('projectUrls').value = proj.urls || '';
  document.getElementById('projectNotes').value = proj.notes || '';
}

function updateProjectData() {
  const idx = appData.activeProjectIndex;
  appData.projects[idx] = {
    name: document.getElementById('projectName').value,
    folder: document.getElementById('projectFolder').value,
    hostingUrl: document.getElementById('projectHostingUrl').value,
    urls: document.getElementById('projectUrls').value,
    notes: document.getElementById('projectNotes').value
  };
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
    folder: "",
    hostingUrl: "",
    urls: "",
    notes: ""
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

// Buka URL
function openUrl(elementId) {
  const url = document.getElementById(elementId).value;
  if (url) window.open(url, '_blank');
}

function openAllUrls() {
  const urlsText = document.getElementById('projectUrls').value;
  const urls = urlsText.split('\n').map(u => u.trim()).filter(u => u.length > 0);
  
  if (urls.length === 0) {
    alert("Tidak ada URL untuk dibuka.");
    return;
  }

  urls.forEach(url => {
    let validUrl = url.startsWith('http://') || url.startsWith('https://') ? url : 'https://' + url;
    window.open(validUrl, '_blank');
  });
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
