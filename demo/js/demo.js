import { db, collection, doc, getDoc, addDoc, serverTimestamp } from "./firebase.js";

const params = new URLSearchParams(location.search);
const demoId = params.get('id');

const loadingState = document.getElementById('loadingState');
const demoContent = document.getElementById('demoContent');
const playerHolder = document.getElementById('playerHolder');
const demoTitleLabel = document.getElementById('demoTitleLabel');
const form = document.getElementById('feedbackForm');
const formMsg = document.getElementById('formMsg');
const submitBtn = document.getElementById('submitBtn');

const COLORS = [
  { key: 'Siyah', hex: '#111214' },
  { key: 'Lacivert', hex: '#1c2b52' },
  { key: 'Kırmızı', hex: '#c23b3b' },
  { key: 'Amber', hex: '#e8a33d' },
  { key: 'Gri', hex: '#9aa0ab' },
  { key: 'Beyaz', hex: '#f2f0ea' },
  { key: 'Yeşil', hex: '#4c8a5e' },
  { key: 'Mor', hex: '#7a5ac2' },
];
const LOCATIONS = ['Gece yürürken','Arabada','Evde','Kulaklıkla yalnız','Spor yaparken','İşe giderken','Arkadaş ortamında'];
const CHARACTERS = ['Asi','Dürüst','Yalnız','Umutlu','Sinirli','Bilge','Soğuk','Sıcakkanlı','Özgüvenli','Kırılgan','Gizemli','İnatçı'];
const PARTS = ['Intro','Verse 1','Nakarat','Verse 2','Bridge','Outro'];

function el(html){
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function buildRadioGrid(container, name, options, opts = {}){
  options.forEach((label, i) => {
    const id = `${name}_${i}`;
    const wrap = el(`
      <div class="choice-pill ${opts.colorMode ? 'color' : ''}">
        <input type="radio" name="${name}" id="${id}" value="${label}" ${opts.required ? 'required' : ''}>
        <label for="${id}" ${opts.colorMode ? `style="--swatch:${opts.hexes[i]}"` : ''}>${label}</label>
      </div>
    `);
    container.appendChild(wrap);
  });
}

function buildCheckboxGrid(container, name, options, opts = {}){
  options.forEach((label, i) => {
    const id = `${name}_${i}`;
    const wrap = el(`
      <div class="choice-pill">
        <input type="checkbox" name="${name}" id="${id}" value="${label}">
        <label for="${id}">${label}</label>
      </div>
    `);
    container.appendChild(wrap);
  });
}

function soundcloudEmbedInfo(raw){
  const value = raw.trim();
  // Admin panelden SoundCloud'un ürettiği tam <iframe> embed kodu yapıştırıldıysa,
  // içindeki src="..." değerini birebir kullan — private track'ler için gerekli
  // olan özel api.soundcloud.com formatı bu şekilde korunmuş olur. Yükseklik de
  // SoundCloud'un kendi kodundan alınır; mobilde küçük yükseklik "Play on
  // SoundCloud" uygulama yönlendirme kutusuna yol açabildiği için önemli.
  const srcMatch = value.match(/src=["']([^"']+)["']/i);
  const heightMatch = value.match(/height=["']?(\d+)["']?/i);
  if(srcMatch){
    return { src: srcMatch[1], height: heightMatch ? Number(heightMatch[1]) : 300 };
  }
  // Aksi halde düz bir paylaşım linki varsayılır (genelde sadece public track'lerde çalışır).
  const encoded = encodeURIComponent(value);
  return {
    src: `https://w.soundcloud.com/player/?url=${encoded}&color=%23e8a33d&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false`,
    height: 300
  };
}

async function init(){
  if(!demoId){
    loadingState.textContent = 'Demo bulunamadı. Lütfen linki kontrol edin.';
    return;
  }
  try{
    const snap = await getDoc(doc(db, 'demos', demoId));
    if(!snap.exists() || snap.data().active === false){
      loadingState.textContent = 'Bu demo şu anda dinlemeye açık değil.';
      return;
    }
    const demo = snap.data();
    const title = demo.songName || demo.displayName || demoId;
    document.title = `${title} — ArazLab`;
    demoTitleLabel.textContent = title;

    if(demo.soundcloudUrl){
      const { src, height } = soundcloudEmbedInfo(demo.soundcloudUrl);
      const iframe = document.createElement('iframe');
      iframe.width = '100%';
      iframe.height = String(height);
      iframe.allow = 'autoplay';
      iframe.src = src;
      playerHolder.appendChild(iframe);
    }else{
      playerHolder.innerHTML = '<p class="muted">Bu demo için henüz bir ses linki eklenmemiş.</p>';
    }

    // grids
    buildRadioGrid(document.getElementById('colorGrid'), 'color', COLORS.map(c=>c.key), { required:true, colorMode:true, hexes: COLORS.map(c=>c.hex) });
    document.getElementById('colorGrid').appendChild(el(`
      <div class="choice-pill">
        <input type="radio" name="color" id="color_other" value="Diğer">
        <label for="color_other">Diğer</label>
      </div>
    `));
    buildCheckboxGrid(document.getElementById('locationGrid'), 'locations', LOCATIONS);
    buildCheckboxGrid(document.getElementById('characterGrid'), 'character', CHARACTERS);
    buildRadioGrid(document.getElementById('partGrid'), 'favoritePart', PARTS, { required:true });

    const scaleRow = document.getElementById('scaleRow');
    for(let i=1;i<=10;i++){
      scaleRow.appendChild(el(`
        <div class="scale-pill">
          <input type="radio" name="replayScore" id="scale_${i}" value="${i}" required>
          <label for="scale_${i}">${i}</label>
        </div>
      `));
    }

    // "Diğer" renk seçilince metin alanı göster
    document.getElementById('colorGrid').addEventListener('change', (e)=>{
      if(e.target.name === 'color'){
        document.getElementById('colorOtherWrap').style.display = e.target.value === 'Diğer' ? 'block' : 'none';
      }
    });

    // karakter seçimini en fazla 3 ile sınırla (en eski seçilen otomatik çıkar,
    // az önce tıklanan her zaman seçili kalır — DOM sırasına göre değil,
    // gerçek seçim sırasına göre çalışır)
    const charGrid = document.getElementById('characterGrid');
    const charHint = document.getElementById('characterLimitHint');
    let charSelectionOrder = [];
    charGrid.addEventListener('change', (e)=>{
      const cb = e.target;
      if(cb.checked){
        charSelectionOrder.push(cb);
        if(charSelectionOrder.length > 3){
          const oldest = charSelectionOrder.shift();
          oldest.checked = false;
        }
      }else{
        charSelectionOrder = charSelectionOrder.filter(el => el !== cb);
      }
      charHint.textContent = `${charSelectionOrder.length} / 3 seçildi`;
    });

    loadingState.style.display = 'none';
    demoContent.style.display = 'block';
  }catch(err){
    console.error(err);
    loadingState.textContent = 'Demo yüklenirken bir sorun oluştu. Lütfen Firebase yapılandırmasını kontrol edin.';
  }
}

form?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  formMsg.className = 'form-msg';
  formMsg.style.display = 'none';

  const fd = new FormData(form);
  const character = fd.getAll('character');
  if(character.length === 0 || character.length > 3){
    formMsg.textContent = 'Lütfen şarkının karakteri için 1 ile 3 arasında seçim yap.';
    formMsg.className = 'form-msg err';
    return;
  }
  const color = fd.get('color');
  if(color === 'Diğer' && !fd.get('colorOther')?.trim()){
    formMsg.textContent = 'Lütfen "Diğer" için rengi kısaca tarif et.';
    formMsg.className = 'form-msg err';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Gönderiliyor…';

  const payload = {
    demoId,
    words: [fd.get('word1')?.trim(), fd.get('word2')?.trim(), fd.get('word3')?.trim()],
    sentence: fd.get('sentence')?.trim() || '',
    color: color || '',
    colorOther: fd.get('colorOther')?.trim() || '',
    locations: fd.getAll('locations'),
    character,
    favoritePart: fd.get('favoritePart') || '',
    replayScore: Number(fd.get('replayScore')) || null,
    reason: fd.get('reason')?.trim() || '',
    freeText: fd.get('freeText')?.trim() || '',
    songNameSuggestion: fd.get('songNameSuggestion')?.trim() || '',
    createdAt: serverTimestamp(),
  };

  try{
    await addDoc(collection(db, 'feedback'), payload);
    form.style.display = 'none';
    document.getElementById('thanksModal').style.display = 'flex';
  }catch(err){
    console.error(err);
    formMsg.textContent = 'Gönderilirken bir sorun oluştu, lütfen tekrar dene.';
    formMsg.className = 'form-msg err';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Geri Bildirimi Gönder';
  }
});

init();
