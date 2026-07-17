import { db, collection, getDocs, query, orderBy } from "./firebase.js";

const listEl = document.getElementById('demoList');

async function loadDemos(){
  try{
    const q = query(collection(db, 'demos'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    const demos = [];
    snap.forEach(d => demos.push({ id: d.id, ...d.data() }));
    const active = demos.filter(d => d.active !== false);

    if(active.length === 0){
      listEl.innerHTML = '<div class="empty-state">Şu anda dinlemeye açık demo yok. Yakında burada olacak.</div>';
      return;
    }

    listEl.innerHTML = `<div class="demo-carousel">${active.map((d, i) => `
      <a class="demo-card" href="demo.html?id=${encodeURIComponent(d.id)}">
        <span class="chnum">CH.${String(i+1).padStart(2,'0')}</span>
        <span class="chinfo">
          <strong>${escapeHtml(d.songName || d.displayName || d.id)}</strong>
        </span>
        <span class="chgo">Dinle →</span>
      </a>
    `).join('')}</div>`;
  }catch(err){
    console.error(err);
    listEl.innerHTML = '<div class="empty-state">Demolar yüklenirken bir sorun oluştu. Lütfen Firebase yapılandırmanızı kontrol edin (js/firebase-config.js).</div>';
  }
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

loadDemos();
