import {
  db, auth, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, orderBy, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "./firebase.js";

/* ---------------- AUTH ---------------- */
const loginShell = document.getElementById('loginShell');
const adminShell = document.getElementById('adminShell');
const loginForm = document.getElementById('loginForm');
const loginMsg = document.getElementById('loginMsg');
const loginBtn = document.getElementById('loginBtn');

loginForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  loginMsg.style.display = 'none';
  loginBtn.disabled = true;
  loginBtn.textContent = 'Giriş yapılıyor…';
  try{
    await signInWithEmailAndPassword(auth, document.getElementById('loginEmail').value.trim(), document.getElementById('loginPass').value);
  }catch(err){
    loginMsg.textContent = 'Giriş başarısız. E-posta / şifreyi kontrol et.';
    loginMsg.className = 'form-msg err';
    loginMsg.style.display = 'block';
  }
  loginBtn.disabled = false;
  loginBtn.textContent = 'Giriş Yap';
});

document.getElementById('logoutBtn').addEventListener('click', ()=> signOut(auth));

onAuthStateChanged(auth, (user)=>{
  if(user){
    loginShell.style.display = 'none';
    adminShell.style.display = 'flex';
    bootDashboard();
  }else{
    loginShell.style.display = 'flex';
    adminShell.style.display = 'none';
  }
});

/* ---------------- TAB NAV ---------------- */
document.querySelectorAll('.nav-btn[data-tab]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.nav-btn[data-tab]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    ['overview','demos','feedback'].forEach(t=>{
      document.getElementById('tab-'+t).style.display = (t === btn.dataset.tab) ? 'block' : 'none';
    });
  });
});

/* ---------------- STATE ---------------- */
let allDemos = [];
let allFeedback = [];
let charts = {};
let bootedOnce = false;

async function bootDashboard(){
  await refreshAll();
  if(!bootedOnce){
    bootedOnce = true;
  }
}

async function refreshAll(){
  await Promise.all([loadDemos(), loadFeedback()]);
  renderOverview();
  renderDemosTable();
  populateFeedbackDemoSelect();
}

async function loadDemos(){
  const snap = await getDocs(query(collection(db, 'demos'), orderBy('order', 'asc')));
  allDemos = [];
  snap.forEach(d => allDemos.push({ id: d.id, ...d.data() }));
}

async function loadFeedback(){
  const snap = await getDocs(collection(db, 'feedback'));
  allFeedback = [];
  snap.forEach(d => allFeedback.push({ id: d.id, ...d.data() }));
}

/* ---------------- OVERVIEW ---------------- */
function renderOverview(){
  const totalDemos = allDemos.length;
  const totalFeedback = allFeedback.length;
  const avgAll = average(allFeedback.map(f=>f.replayScore).filter(n=>typeof n === 'number'));

  document.getElementById('overviewStats').innerHTML = `
    <div class="stat-card"><div class="num">${totalDemos}</div><div class="lbl">Toplam Demo</div></div>
    <div class="stat-card"><div class="num">${totalFeedback}</div><div class="lbl">Toplam Yanıt</div></div>
    <div class="stat-card"><div class="num">${avgAll ? avgAll.toFixed(1) : '—'}</div><div class="lbl">Ort. Tekrar Puanı</div></div>
  `;

  const rows = allDemos.map(d=>{
    const fb = allFeedback.filter(f=>f.demoId === d.id);
    const avg = average(fb.map(f=>f.replayScore).filter(n=>typeof n === 'number'));
    return `<tr>
      <td>${escapeHtml(d.songName || d.displayName || d.id)}<br><span class="mono muted" style="font-size:11px;">${escapeHtml(d.id)}</span></td>
      <td>${fb.length}</td>
      <td>${avg ? avg.toFixed(1) : '—'}</td>
      <td>${badge(d.active !== false)}</td>
    </tr>`;
  }).join('');
  document.getElementById('overviewTableBody').innerHTML = rows || `<tr><td colspan="4" class="muted">Henüz demo eklenmedi.</td></tr>`;
}

/* ---------------- DEMOS CRUD ---------------- */
const demoModalBackdrop = document.getElementById('demoModalBackdrop');
const demoForm = document.getElementById('demoForm');
const demoModalTitle = document.getElementById('demoModalTitle');
const demoIdInput = document.getElementById('demoIdInput');
const songNameInput = document.getElementById('songNameInput');
const soundcloudInput = document.getElementById('soundcloudInput');
const orderInput = document.getElementById('orderInput');
const activeInput = document.getElementById('activeInput');
let editingDemoId = null;

document.getElementById('newDemoBtn').addEventListener('click', ()=> openDemoModal(null));
document.getElementById('demoModalCancel').addEventListener('click', closeDemoModal);

function openDemoModal(demo){
  editingDemoId = demo ? demo.id : null;
  demoModalTitle.textContent = demo ? `Düzenle: ${demo.id}` : 'Yeni Demo';
  demoIdInput.value = demo ? demo.id : nextDemoId();
  demoIdInput.disabled = !!demo;
  songNameInput.value = demo?.songName || '';
  soundcloudInput.value = demo?.soundcloudUrl || '';
  orderInput.value = demo?.order || (allDemos.length + 1);
  activeInput.checked = demo ? demo.active !== false : true;
  demoModalBackdrop.style.display = 'flex';
}
function closeDemoModal(){ demoModalBackdrop.style.display = 'none'; }

function nextDemoId(){
  let n = allDemos.length + 1;
  while(allDemos.some(d => d.id === `demo${n}`)) n++;
  return `demo${n}`;
}

demoForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const id = demoIdInput.value.trim();
  const data = {
    songName: songNameInput.value.trim(),
    displayName: songNameInput.value.trim() || id,
    soundcloudUrl: soundcloudInput.value.trim(),
    order: Number(orderInput.value) || 1,
    active: activeInput.checked,
  };
  try{
    await setDoc(doc(db, 'demos', id), data, { merge: true });
    closeDemoModal();
    await refreshAll();
  }catch(err){
    alert('Kaydedilirken hata oluştu: ' + err.message);
  }
});

function renderDemosTable(){
  const rows = allDemos.map(d=>`
    <tr>
      <td>${d.order ?? '—'}</td>
      <td class="mono">${escapeHtml(d.id)}</td>
      <td>${escapeHtml(d.songName || d.displayName || '—')}</td>
      <td>${d.soundcloudUrl ? '<span class="tag-chip">bağlandı</span>' : '<span class="tag-chip">yok</span>'}</td>
      <td>${badge(d.active !== false)}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-sm btn-ghost" data-edit="${escapeAttr(d.id)}">Düzenle</button>
        <button class="btn btn-sm btn-danger" data-del="${escapeAttr(d.id)}">Sil</button>
      </td>
    </tr>
  `).join('');
  document.getElementById('demosTableBody').innerHTML = rows || `<tr><td colspan="6" class="muted">Henüz demo eklenmedi.</td></tr>`;

  document.querySelectorAll('[data-edit]').forEach(btn=>{
    btn.addEventListener('click', ()=> openDemoModal(allDemos.find(d=>d.id === btn.dataset.edit)));
  });
  document.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if(!confirm(`"${btn.dataset.del}" silinsin mi? Bu demoya ait geri bildirimler panelde kalır.`)) return;
      await deleteDoc(doc(db, 'demos', btn.dataset.del));
      await refreshAll();
    });
  });
}

/* ---------------- FEEDBACK PANEL ---------------- */
const feedbackDemoSelect = document.getElementById('feedbackDemoSelect');
feedbackDemoSelect.addEventListener('change', ()=> renderFeedbackForDemo(feedbackDemoSelect.value));

function populateFeedbackDemoSelect(){
  const prev = feedbackDemoSelect.value;
  feedbackDemoSelect.innerHTML = allDemos.map(d=>`<option value="${escapeAttr(d.id)}">${escapeHtml(d.songName || d.displayName || d.id)} (${escapeHtml(d.id)})</option>`).join('');
  if(allDemos.length === 0){
    feedbackDemoSelect.innerHTML = '<option value="">Demo yok</option>';
  }
  const target = prev && allDemos.some(d=>d.id===prev) ? prev : allDemos[0]?.id;
  if(target){ feedbackDemoSelect.value = target; renderFeedbackForDemo(target); }
  else{ clearFeedbackPanel(); }
}

function clearFeedbackPanel(){
  document.getElementById('feedbackStats').innerHTML = '';
  document.getElementById('feedbackTableBody').innerHTML = `<tr><td colspan="11" class="muted">Gösterilecek veri yok.</td></tr>`;
  Object.values(charts).forEach(c=>c?.destroy());
}

const COLOR_HEX = {
  'Siyah':'#111214','Lacivert':'#1c2b52','Kırmızı':'#c23b3b','Amber':'#e8a33d',
  'Gri':'#9aa0ab','Beyaz':'#f2f0ea','Yeşil':'#4c8a5e','Mor':'#7a5ac2','Diğer':'#5b5f6a'
};

function renderFeedbackForDemo(demoId){
  const fb = allFeedback.filter(f=>f.demoId === demoId).sort((a,b)=> (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
  const avg = average(fb.map(f=>f.replayScore).filter(n=>typeof n === 'number'));

  document.getElementById('feedbackStats').innerHTML = `
    <div class="stat-card"><div class="num">${fb.length}</div><div class="lbl">Toplam Yanıt</div></div>
    <div class="stat-card"><div class="num">${avg ? avg.toFixed(1) : '—'}</div><div class="lbl">Ort. Tekrar Puanı</div></div>
    <div class="stat-card"><div class="num">${fb.length ? topValue(fb.map(f=>f.color)) : '—'}</div><div class="lbl">En Sık Renk</div></div>
    <div class="stat-card"><div class="num">${fb.length ? topValue(fb.map(f=>f.favoritePart)) : '—'}</div><div class="lbl">En Etkileyici Bölüm</div></div>
  `;

  renderCharts(fb);
  renderFeedbackTable(fb);
}

function renderCharts(fb){
  Object.values(charts).forEach(c=>c?.destroy());

  const colorCounts = countBy(fb.map(f=>f.color).filter(Boolean));
  charts.color = new Chart(document.getElementById('chartColor'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(colorCounts),
      datasets: [{ data: Object.values(colorCounts), backgroundColor: Object.keys(colorCounts).map(k=>COLOR_HEX[k]||'#8a8f9c'), borderColor: '#1b1e27', borderWidth: 2 }]
    },
    options: chartOpts('Renk Dağılımı', true)
  });

  const locCounts = countBy(fb.flatMap(f=>f.locations||[]));
  charts.locations = new Chart(document.getElementById('chartLocations'), {
    type: 'bar',
    data: { labels: Object.keys(locCounts), datasets: [{ data: Object.values(locCounts), backgroundColor: '#3fa9a0' }] },
    options: chartOpts('Dinleme Ortamı', false)
  });

  const charCounts = countBy(fb.flatMap(f=>f.character||[]));
  charts.character = new Chart(document.getElementById('chartCharacter'), {
    type: 'bar',
    data: { labels: Object.keys(charCounts), datasets: [{ data: Object.values(charCounts), backgroundColor: '#e8a33d' }] },
    options: { ...chartOpts('Şarkının Karakteri', false), indexAxis: 'y' }
  });

  const replayBuckets = {};
  for(let i=1;i<=10;i++) replayBuckets[i] = 0;
  fb.forEach(f=>{ if(typeof f.replayScore === 'number') replayBuckets[f.replayScore] = (replayBuckets[f.replayScore]||0)+1; });
  charts.replay = new Chart(document.getElementById('chartReplay'), {
    type: 'bar',
    data: { labels: Object.keys(replayBuckets), datasets: [{ data: Object.values(replayBuckets), backgroundColor: '#3fa9a0' }] },
    options: chartOpts('Tekrar Dinleme Puanı (1-10)', false)
  });
}

function chartOpts(title, legend){
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: title, color: '#edeae2', font: { family: 'IBM Plex Mono', size: 12 } },
      legend: { display: legend, labels: { color: '#b7b4ac', font: { size: 11 } } }
    },
    scales: (title.includes('Dağılım') || title === 'Renk Dağılımı') ? {} : {
      x: { ticks: { color: '#8a8f9c', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#8a8f9c', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
    }
  };
}

function renderFeedbackTable(fb){
  const rows = fb.map(f=>`
    <tr>
      <td class="mono" style="font-size:11px;">${formatDate(f.createdAt)}</td>
      <td>${escapeHtml((f.words||[]).filter(Boolean).join(', '))}</td>
      <td class="wrap-cell">${escapeHtml(f.sentence||'')}</td>
      <td>${escapeHtml(f.color||'')}${f.colorOther ? ' — '+escapeHtml(f.colorOther) : ''}</td>
      <td>${(f.locations||[]).map(l=>`<span class="tag-chip">${escapeHtml(l)}</span>`).join('')}</td>
      <td>${(f.character||[]).map(c=>`<span class="tag-chip">${escapeHtml(c)}</span>`).join('')}</td>
      <td>${escapeHtml(f.favoritePart||'')}</td>
      <td class="mono" style="font-size:14px; color:var(--amber); font-weight:600;">${f.replayScore ?? '—'}</td>
      <td class="wrap-cell">${escapeHtml(f.reason||'')}</td>
      <td class="wrap-cell">${escapeHtml(f.freeText||'')}</td>
      <td>${escapeHtml(f.songNameSuggestion||'')}</td>
    </tr>
  `).join('');
  document.getElementById('feedbackTableBody').innerHTML = rows || `<tr><td colspan="11" class="muted">Bu demo için henüz yanıt yok.</td></tr>`;
}

/* ---------------- HELPERS ---------------- */
function average(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
function countBy(arr){ const o={}; arr.forEach(v=>{ o[v]=(o[v]||0)+1; }); return o; }
function topValue(arr){ const c = countBy(arr.filter(Boolean)); const keys = Object.keys(c); if(!keys.length) return '—'; return keys.sort((a,b)=>c[b]-c[a])[0]; }
function badge(isActive){ return isActive ? '<span class="badge on">Yayında</span>' : '<span class="badge off">Kapalı</span>'; }
function formatDate(ts){ if(!ts?.seconds) return '—'; return new Date(ts.seconds*1000).toLocaleString('tr-TR', { dateStyle:'short', timeStyle:'short' }); }
function escapeHtml(str){ return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(str){ return escapeHtml(str); }
