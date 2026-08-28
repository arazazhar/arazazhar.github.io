const val = id => { const el = document.getElementById(id); return el ? el.value : ''; };
const setVal = (id, v) => { const el = document.getElementById(id); if(el) el.value = v || ''; };

let fullData = null;
const creditRoles = ["Söz", "Müzik", "Prodüktör", "Aranje", "Mix", "Mastering", "Yönetmen", "Görüntü Yönetmeni", "Kurgu / Edit", "Color", "Kapak Tasarım"];

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Login
    document.getElementById('login-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        fetch('/api/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username: val('login-user'), password: val('login-pass')}) })
        .then(r => r.json()).then(d => {
            if(d.success) {
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('admin-dashboard-sidebar').style.display = 'flex';
                document.getElementById('admin-dashboard-main').style.display = 'block';
                loadData();
            } else alert('Hatalı giriş!');
        });
    });

    document.getElementById('logout-btn')?.addEventListener('click', () => { fetch('/api/logout', {method:'POST'}).then(() => location.reload()); });

    // Nav / Tabs
    const navItems = document.querySelectorAll('.admin-nav-item');
    const panes = document.querySelectorAll('.admin-pane');
    navItems.forEach(t => {
        t.addEventListener('click', () => {
            navItems.forEach(x => x.classList.remove('active')); panes.forEach(x => x.classList.remove('active'));
            t.classList.add('active'); document.getElementById(t.dataset.target).classList.add('active');
        });
    });

    // Track Form
    document.getElementById('track-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = val('t-type');
        
        let trackData = {
            id: val('t-id'), type: type, title: val('t-title'), cover: val('t-cover'),
            spotify: val('t-spotify'), apple: val('t-apple')
        };

        if(type === 'single') {
            const credits = [];
            document.querySelectorAll('#credit-container .credit-row').forEach(row => {
                const r = row.querySelector('select').value; const n = row.querySelector('input').value; if(n) credits.push({role: r, name: n});
            });
            trackData.credits = credits;
            trackData.lyrics = val('t-lyrics');
        } else {
            const albumTracks = [];
            document.querySelectorAll('.album-track-form').forEach((row, idx) => {
                const tTitle = row.querySelector('.at-title').value;
                const tLyrics = row.querySelector('.at-lyrics').value;
                const credits = [];
                row.querySelectorAll('.at-credit-row').forEach(cr => {
                    const r = cr.querySelector('select').value; const n = cr.querySelector('input').value; if(n) credits.push({role: r, name: n});
                });
                if(tTitle) albumTracks.push({ title: tTitle, lyrics: tLyrics, credits: credits });
            });
            trackData.album_tracks = albumTracks;
        }

        fetch('/api/tracks', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(trackData) })
        .then(r => r.json()).then(d => { if(d.success) { alert('Kaydedildi!'); resetTrackForm(); loadData(); } });
    });
});

function checkAuth() {
    fetch('/api/check-auth').then(r => r.json()).then(d => {
        if(d.authenticated) {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('admin-dashboard-sidebar').style.display = 'flex';
            document.getElementById('admin-dashboard-main').style.display = 'block';
            loadData();
        }
    });
}

function loadData() {
    fetch('/api/data').then(r => r.json()).then(data => {
        fullData = data;
        if(data.settings) {
            setVal('site-theme', data.settings.theme || 'dark');
            // Bakım modunun veritabanındaki durumunu admin panelindeki seçeneğe aktarıyoruz:
            setVal('site-maintenance', data.settings.maintenanceMode ? 'true' : 'false');
        }
        if(data.hero) { setVal('hero-bg', data.hero.bg_image); setVal('hero-title', data.hero.title); setVal('hero-sub', data.hero.subtitle); }
        if(data.about) { setVal('about-text', data.about.text); setVal('about-img', data.about.image || ''); }
        if(data.contact) {
            setVal('c-email', data.contact.email);
            if(data.contact.socials) {
                setVal('c-spotify', data.contact.socials.spotify); setVal('c-apple', data.contact.socials.apple);
                setVal('c-youtube', data.contact.socials.youtube); setVal('c-instagram', data.contact.socials.instagram);
            }
        }
        if(data.tracks) renderAdminTracks(data.tracks);
        if(data.visuals) { renderAdminVideos(data.visuals.videos || []); renderAdminPhotos(data.visuals.photos || []); }
    });
}

function apiCall(endpoint, data, successMsg) {
    fetch(endpoint, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) })
    .then(r => r.json()).then(d => { if(d.success) { alert(successMsg); loadData(); } });
}

function saveSettingsTab() {
    apiCall('/api/settings', { 
        section: 'settings', 
        data: { 
            theme: val('site-theme'),
            maintenanceMode: val('site-maintenance') === 'true'
        } 
    }, 'Ayarlar Kaydedildi.');
    setTimeout(() => {
        apiCall('/api/settings', { section: 'hero', data: { bg_image: val('hero-bg'), title: val('hero-title'), subtitle: val('hero-sub') } }, 'Hero Kaydedildi.');
    }, 500);
}
function saveAbout() { apiCall('/api/settings', { section: 'about', data: { text: val('about-text'), image: val('about-img') } }, 'Hakkımda Kaydedildi.'); }
function saveContact() {
    apiCall('/api/settings', { section: 'contact', data: { email: val('c-email'), socials: { spotify: val('c-spotify'), apple: val('c-apple'), youtube: val('c-youtube'), instagram: val('c-instagram') } } }, 'İletişim Kaydedildi.');
}

function uploadImage(inputId, targetId) {
    const fileInput = document.getElementById(inputId);
    if(!fileInput || fileInput.files.length === 0) return;
    const formData = new FormData(); formData.append('image', fileInput.files[0]);
    fetch('/api/upload', { method: 'POST', body: formData }).then(r => r.json()).then(d => {
        if(d.success) { setVal(targetId, d.url); alert('Yüklendi!'); fileInput.value = ''; }
    });
}

// Tracks
function renderAdminTracks(tracks) {
    const list = document.getElementById('admin-track-list'); if(!list) return;
    list.innerHTML = '';
    tracks.sort((a,b) => (a.order||0) - (b.order||0)).forEach(t => {
        const div = document.createElement('div'); div.className = 'track-item-admin'; div.dataset.id = t.id;
        div.innerHTML = `<div>&#9776; <strong>${t.title}</strong> <span style="color:#888;font-size:12px;">(${t.type==='album'?'Albüm':'Single'})</span></div>
        <div><button class="btn-secondary" onclick="editTrack('${t.id}')">Düzenle</button> <button class="btn-danger" onclick="deleteTrack('${t.id}')">Sil</button></div>`;
        list.appendChild(div);
    });
    if(typeof Sortable !== 'undefined') new Sortable(list, { animation: 150 });
}
function saveTrackOrder() {
    const ids = Array.from(document.getElementById('admin-track-list').children).map(el => el.dataset.id);
    apiCall('/api/tracks/reorder', {orderedIds: ids}, 'Sıralama Kaydedildi');
}
function deleteTrack(id) { if(confirm('Sil?')) fetch(`/api/tracks/${id}`, {method:'DELETE'}).then(()=>loadData()); }

function toggleTrackType() {
    const type = val('t-type');
    document.getElementById('single-fields').style.display = type === 'single' ? 'block' : 'none';
    document.getElementById('album-fields').style.display = type === 'album' ? 'block' : 'none';
}

function editTrack(id) {
    const track = fullData.tracks.find(t => t.id === id);
    if(!track) return;
    document.getElementById('track-form-title').textContent = 'Düzenle: ' + track.title;
    setVal('t-id', track.id); setVal('t-type', track.type || 'single'); setVal('t-title', track.title);
    setVal('t-cover', track.cover); setVal('t-spotify', track.spotify); setVal('t-apple', track.apple);
    
    toggleTrackType();
    
    document.getElementById('credit-container').innerHTML = '';
    document.getElementById('album-tracks-container').innerHTML = '';

    if(track.type === 'album') {
        if(track.album_tracks) track.album_tracks.forEach(at => addAlbumTrack(at));
    } else {
        if(track.credits) track.credits.forEach(c => addCreditRow('credit-container', c.role, c.name));
        else addCreditRow('credit-container');
        setVal('t-lyrics', track.lyrics);
    }
}
function resetTrackForm() {
    document.getElementById('track-form').reset(); setVal('t-id', ''); document.getElementById('track-form-title').textContent = 'Yeni Şarkı Ekle';
    document.getElementById('credit-container').innerHTML = ''; addCreditRow('credit-container');
    document.getElementById('album-tracks-container').innerHTML = '';
    setVal('t-type', 'single'); toggleTrackType();
}

function getOptionsHTML(sel) { return creditRoles.map(r => `<option value="${r}" ${r===sel?'selected':''}>${r}</option>`).join(''); }

function addCreditRow(containerId, role='', name='') {
    const container = document.getElementById(containerId) || containerId; // can pass element directly
    const div = document.createElement('div'); div.className = 'credit-row ' + (containerId==='credit-container' ? '' : 'at-credit-row');
    div.innerHTML = `<select class="admin-input" style="width:120px;">${getOptionsHTML(role)}</select>
    <input type="text" class="admin-input" placeholder="İsim" value="${name}">
    <button type="button" class="btn-danger" onclick="this.parentElement.remove()">X</button>`;
    if(typeof container === 'string') document.getElementById(container).appendChild(div);
    else container.appendChild(div);
}

function addAlbumTrack(data = {title:'', lyrics:'', credits:[]}) {
    const c = document.getElementById('album-tracks-container');
    const div = document.createElement('div'); div.className = 'album-track-form';
    
    div.innerHTML = `<div class="form-group"><input type="text" class="admin-input at-title" placeholder="Parça Adı" value="${data.title}"></div>
    <div class="form-group"><label>Credits</label><div class="at-credits-wrapper"></div><button type="button" class="btn-secondary" style="font-size:11px;" onclick="addCreditRow(this.previousElementSibling)">+ Ekle</button></div>
    <div class="form-group"><textarea class="admin-input at-lyrics" rows="2" placeholder="Sözler">${data.lyrics}</textarea></div>
    <button type="button" class="btn-danger" onclick="this.parentElement.remove()">Parçayı Sil</button>`;
    c.appendChild(div);
    
    const wrapper = div.querySelector('.at-credits-wrapper');
    if(data.credits.length > 0) data.credits.forEach(cr => addCreditRow(wrapper, cr.role, cr.name));
    else addCreditRow(wrapper);
}

document.addEventListener('DOMContentLoaded', () => { if(document.getElementById('credit-container')) addCreditRow('credit-container'); });

// Visuals
function renderAdminVideos(videos) {
    const list = document.getElementById('admin-video-list'); if(!list) return; list.innerHTML = '';
    videos.forEach(v => {
        list.innerHTML += `<div class="track-item-admin"><div>${v.title}</div><button class="btn-danger" onclick="deleteVisual('videos', '${v.id}')">Sil</button></div>`;
    });
}
function renderAdminPhotos(photos) {
    const list = document.getElementById('admin-photo-list'); if(!list) return; list.innerHTML = '';
    photos.forEach(p => {
        list.innerHTML += `<div class="track-item-admin"><div><img src="${p.url}" style="height:30px;"></div><button class="btn-danger" onclick="deleteVisual('photos', '${p.id}')">Sil</button></div>`;
    });
}
function addVideo() {
    if(!val('v-title') || !val('v-id')) return alert('Boş alan bırakmayın.');
    apiCall('/api/visuals/videos', { title: val('v-title'), youtube_id: val('v-id') }, 'Video Eklendi');
}
function addPhoto() {
    const fileInput = document.getElementById('p-file'); if(!fileInput.files.length) return;
    const formData = new FormData(); formData.append('image', fileInput.files[0]);
    fetch('/api/upload', { method: 'POST', body: formData }).then(r => r.json()).then(d => {
        if(d.success) apiCall('/api/visuals/photos', {url: d.url}, 'Fotoğraf Eklendi');
    });
}
function deleteVisual(type, id) { if(confirm('Sil?')) fetch(`/api/visuals/${type}/${id}`, {method:'DELETE'}).then(()=>loadData()); }

function renderAdminVideos(videos) {
    const list = document.getElementById('admin-video-list'); if(!list) return; list.innerHTML = '';
    videos.sort((a,b)=>(a.order||0)-(b.order||0)).forEach(v => {
        list.innerHTML += `<div class="track-item-admin" data-id="${v.id}"><div>&#9776; <strong>${v.title}</strong></div><button class="btn-danger" onclick="deleteVisual('videos', '${v.id}')">Sil</button></div>`;
    });
    if(typeof Sortable !== 'undefined') new Sortable(list, { animation: 150 });
}

function renderAdminPhotos(photos) {
    const list = document.getElementById('admin-photo-list'); if(!list) return; list.innerHTML = '';
    photos.sort((a,b)=>(a.order||0)-(b.order||0)).forEach(p => {
        list.innerHTML += `<div class="track-item-admin" data-id="${p.id}"><div>&#9776; <img src="${p.url}" style="height:25px; vertical-align:middle; margin-left:10px;"> ${p.title || ''}</div><button class="btn-danger" onclick="deleteVisual('photos', '${p.id}')">Sil</button></div>`;
    });
    if(typeof Sortable !== 'undefined') new Sortable(list, { animation: 150 });
}

function saveVisualOrder(type) {
    const listEl = document.getElementById(type === 'videos' ? 'admin-video-list' : 'admin-photo-list');
    if(!listEl) return;
    const ids = Array.from(listEl.children).map(el => el.dataset.id);
    fetch(`/api/visuals/${type}/reorder`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({orderedIds: ids})
    }).then(r => r.json()).then(d => { if(d.success) { alert('Sıralama Kaydedildi!'); loadData(); } });
}

function addPhoto() {
    const fileInput = document.getElementById('p-file'); if(!fileInput.files.length) return alert('Dosya seçin.');
    const formData = new FormData(); formData.append('image', fileInput.files[0]);
    fetch('/api/upload', { method: 'POST', body: formData }).then(r => r.json()).then(d => {
        if(d.success) {
            apiCall('/api/visuals/photos', { url: d.url, title: val('p-title') }, 'Fotoğraf Eklendi');
            setVal('p-title', ''); fileInput.value = '';
        }
    });
}