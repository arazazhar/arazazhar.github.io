document.addEventListener('DOMContentLoaded', () => {
    let siteData = null;
    let currentMediaArray = [];
    let currentMediaIndex = 0;

    // Fetch Data (Önbelleğe takılmaması için zaman damgası eklendi)
    fetch('/api/data?t=' + Date.now())
        .then(res => res.json())
        .then(data => {
            siteData = data;
            renderSite();
        });

    function renderSite() {
        // Hero
        const hero = document.getElementById('hero');
        if(siteData.hero && siteData.hero.bg_image) {
            hero.style.backgroundImage = `url('${siteData.hero.bg_image}')`;
        }
        if(document.getElementById('h-title')) document.getElementById('h-title').textContent = siteData.hero.title || '';
        if(document.getElementById('h-subtitle')) document.getElementById('h-subtitle').textContent = siteData.hero.subtitle || '';
        if(document.getElementById('h-label')) document.getElementById('h-label').textContent = siteData.hero.label || '';

        // About (Satır başlarının HTML <br> olarak düzgün görünmesi sağlandı)
        if(siteData.about && siteData.about.text) {
            const formattedText = siteData.about.text.replace(/\\n/g, '<br>');
            document.getElementById('about-content').innerHTML = formattedText;
        }

        // Contact
        if(siteData.contact) {
            const emailEl = document.getElementById('contact-email');
            if(emailEl) {
                emailEl.href = `mailto:${siteData.contact.email}`;
                emailEl.textContent = siteData.contact.email;
            }
            if(siteData.contact.socials) {
                if(document.getElementById('s-spotify')) document.getElementById('s-spotify').href = siteData.contact.socials.spotify || '#';
                if(document.getElementById('s-apple')) document.getElementById('s-apple').href = siteData.contact.socials.apple || '#';
                if(document.getElementById('s-youtube')) document.getElementById('s-youtube').href = siteData.contact.socials.youtube || '#';
                if(document.getElementById('s-instagram')) document.getElementById('s-instagram').href = siteData.contact.socials.instagram || '#';
            }
        }

        // Discography
        const discoGrid = document.getElementById('disco-grid');
        if(discoGrid && siteData.tracks) {
            discoGrid.innerHTML = '';
            const sortedTracks = siteData.tracks.sort((a, b) => (a.order || 0) - (b.order || 0));
            
            sortedTracks.forEach(track => {
                const div = document.createElement('div');
                div.className = 'track-cover-item';
                div.innerHTML = `
                    <img src="${track.cover}" alt="${track.title}">
                    <div class="track-cover-overlay">
                        <span class="track-cover-title">${track.title}</span>
                    </div>
                `;
                div.addEventListener('click', () => openTrackModal(track));
                discoGrid.appendChild(div);
            });
        }

        // Visuals - Videos
        const videosGrid = document.getElementById('videos-grid');
        if(videosGrid && siteData.visuals && siteData.visuals.videos) {
            videosGrid.innerHTML = '';
            siteData.visuals.videos.forEach((vid, index) => {
                const div = document.createElement('div');
                div.className = 'visual-item';
                div.innerHTML = `
                    <img src="https://img.youtube.com/vi/${vid.youtube_id}/maxresdefault.jpg" alt="${vid.title}">
                    <div class="play-icon"></div>
                `;
                div.addEventListener('click', () => openMediaModal('video', index));
                videosGrid.appendChild(div);
            });
        }

        // Visuals - Photos
        const photosGrid = document.getElementById('photos-grid');
        if(photosGrid && siteData.visuals && siteData.visuals.photos) {
            photosGrid.innerHTML = '';
            siteData.visuals.photos.forEach((photo, index) => {
                const div = document.createElement('div');
                div.className = 'visual-item';
                div.innerHTML = `<img src="${photo.url}" alt="Gallery Photo">`;
                div.addEventListener('click', () => openMediaModal('photo', index));
                photosGrid.appendChild(div);
            });
        }
    }

    // Menu Logic
    const menuBtn = document.getElementById('menu-btn');
    const menuOverlay = document.getElementById('menu-overlay');
    if(menuBtn && menuOverlay) {
        document.querySelectorAll('.menu-link, #menu-btn').forEach(el => {
            el.addEventListener('click', () => {
                if(el.id === 'menu-btn') menuOverlay.classList.toggle('active');
                else menuOverlay.classList.remove('active');
                menuBtn.textContent = menuOverlay.classList.contains('active') ? 'KAPAT' : '+ MENÜ';
            });
        });
    }

    // Visuals Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const panes = document.querySelectorAll('.visuals-pane');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const targetPane = document.getElementById(btn.dataset.target);
            if(targetPane) targetPane.classList.add('active');
        });
    });

    // Track Modal
    const trackModal = document.getElementById('track-modal');
    function openTrackModal(track) {
        document.getElementById('m-cover').src = track.cover;
        document.getElementById('m-title').textContent = track.title;
        
        const creditsDiv = document.getElementById('m-credits');
        creditsDiv.innerHTML = '';
        if(track.credits && Array.isArray(track.credits)){
            track.credits.forEach(c => {
                creditsDiv.innerHTML += `<div class="credit-item"><span>${c.role}</span><span style="color:#fff;">${c.name}</span></div>`;
            });
        }
        
        document.getElementById('m-lyrics').textContent = track.lyrics || '';
        document.getElementById('m-spotify').href = track.spotify || '#';
        document.getElementById('m-apple').href = track.apple || '#';
        if(trackModal) trackModal.classList.add('active');
    }

    const closeTrackBtn = document.getElementById('modal-close-track');
    if(closeTrackBtn) {
        closeTrackBtn.addEventListener('click', () => trackModal.classList.remove('active'));
    }
    if(trackModal) {
        trackModal.addEventListener('click', (e) => { if(e.target === trackModal) trackModal.classList.remove('active'); });
    }

    // Media Modal
    const mediaModal = document.getElementById('media-modal');
    const mediaContent = document.getElementById('media-content');
    
    function openMediaModal(type, startIndex) {
        currentMediaArray = type === 'video' ? siteData.visuals.videos : siteData.visuals.photos;
        currentMediaIndex = startIndex;
        currentMediaType = type;
        updateMediaContent();
        if(mediaModal) mediaModal.classList.add('active');
    }

    function updateMediaContent() {
        if(currentMediaArray.length === 0) return;
        const item = currentMediaArray[currentMediaIndex];
        
        if(currentMediaType === 'video') {
            mediaContent.innerHTML = `<iframe width="100%" height="600" src="https://www.youtube.com/embed/${item.youtube_id}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        } else {
            mediaContent.innerHTML = `<img src="${item.url}" alt="Photo">`;
        }
    }

    const prevBtn = document.getElementById('media-prev');
    if(prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentMediaIndex = (currentMediaIndex - 1 + currentMediaArray.length) % currentMediaArray.length;
            updateMediaContent();
        });
    }

    const nextBtn = document.getElementById('media-next');
    if(nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentMediaIndex = (currentMediaIndex + 1) % currentMediaArray.length;
            updateMediaContent();
        });
    }

    const closeMediaBtn = document.getElementById('modal-close-media');
    if(closeMediaBtn) {
        closeMediaBtn.addEventListener('click', () => {
            if(mediaModal) mediaModal.classList.remove('active');
            if(mediaContent) mediaContent.innerHTML = '';
        });
    }
    
    if(mediaModal) {
        mediaModal.addEventListener('click', (e) => { 
            if(e.target === mediaModal) {
                mediaModal.classList.remove('active');
                if(mediaContent) mediaContent.innerHTML = '';
            }
        });
    }
});