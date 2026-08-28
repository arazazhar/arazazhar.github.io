document.addEventListener('DOMContentLoaded', () => {
    let siteData = null;
    
    fetch('/api/data?t=' + Date.now()).then(res => res.json()).then(data => {
        siteData = data;
        renderSite();
    });

    function renderSite() {
        // Theme
        if (siteData.settings && siteData.settings.theme === 'light') {
            document.getElementById('site-body').classList.add('light-theme');
        } else {
            document.getElementById('site-body').classList.remove('light-theme');
        }

        // Hero
        if (siteData.hero) {
            const hero = document.getElementById('hero');
            if (hero && siteData.hero.bg_image) hero.style.backgroundImage = `url('${siteData.hero.bg_image}')`;
            if (document.getElementById('h-title')) document.getElementById('h-title').textContent = siteData.hero.title || 'araz azhar';
            if (document.getElementById('h-subtitle')) document.getElementById('h-subtitle').textContent = siteData.hero.subtitle || '';
            if (document.getElementById('h-label')) document.getElementById('h-label').textContent = siteData.hero.label || '';
        }

        // About
        if (siteData.about) {
            const aboutEl = document.getElementById('about-content');
            if (aboutEl && siteData.about.text) aboutEl.innerHTML = siteData.about.text.replace(/\n/g, '<br>');
            const aboutImg = document.getElementById('about-img');
            if(aboutImg && siteData.about.image) {
                aboutImg.src = siteData.about.image;
                aboutImg.style.display = 'block';
            }
        }

        // Contact
        if (siteData.contact) {
            const emailEl = document.getElementById('contact-email');
            if (emailEl && siteData.contact.email) {
                emailEl.href = `mailto:${siteData.contact.email}`; emailEl.textContent = siteData.contact.email;
            }
            if (siteData.contact.socials) {
                if (document.getElementById('s-spotify')) document.getElementById('s-spotify').href = siteData.contact.socials.spotify || '#';
                if (document.getElementById('s-apple')) document.getElementById('s-apple').href = siteData.contact.socials.apple || '#';
                if (document.getElementById('s-youtube')) document.getElementById('s-youtube').href = siteData.contact.socials.youtube || '#';
                if (document.getElementById('s-instagram')) document.getElementById('s-instagram').href = siteData.contact.socials.instagram || '#';
            }
        }

        // Marquee Generator Function
        function createMarquee(containerId, items, renderItemHTML, clickHandlerData = null) {
            const container = document.getElementById(containerId);
            if (!container || !items || items.length === 0) return;
            
            let innerHTML = '';
            items.forEach((item, index) => {
                innerHTML += renderItemHTML(item, index);
            });
            container.innerHTML = innerHTML + innerHTML + innerHTML + innerHTML;
            
            if(clickHandlerData) {
                const children = container.querySelectorAll(clickHandlerData.selector);
                children.forEach((child) => {
                    const idx = child.getAttribute('data-index');
                    child.addEventListener('click', () => clickHandlerData.fn(items[idx], idx));
                });
            }
        }

        // Discography
        if(siteData.tracks) {
            const sortedTracks = siteData.tracks.sort((a, b) => (a.order || 0) - (b.order || 0));
            createMarquee('disco-marquee', sortedTracks, (track, i) => `
                <div class="track-cover-item disco-item-click" data-index="${i}">
                    <img src="${track.cover}" alt="${track.title}">
                    <div class="track-cover-overlay"><span class="track-cover-title">${track.title}</span></div>
                </div>
            `, { selector: '.disco-item-click', fn: openTrackModal });
        }

        // Visuals - Videos
        if(siteData.visuals && siteData.visuals.videos) {
            const sortedVideos = siteData.visuals.videos.sort((a, b) => (a.order || 0) - (b.order || 0));
            createMarquee('videos-marquee', sortedVideos, (vid, i) => `
                <div class="visual-item video-format vid-item-click" data-index="${i}">
                    <img src="https://img.youtube.com/vi/${vid.youtube_id}/maxresdefault.jpg" alt="${vid.title}">
                    <div class="play-icon"></div>
                    <div class="track-cover-overlay"><span class="track-cover-title">${vid.title}</span></div>
                </div>
            `, { selector: '.vid-item-click', fn: (vid, i) => openMediaModal('video', sortedVideos, i) });
        }

        // Visuals - Photos
        if(siteData.visuals && siteData.visuals.photos) {
            const sortedPhotos = siteData.visuals.photos.sort((a, b) => (a.order || 0) - (b.order || 0));
            createMarquee('photos-marquee', sortedPhotos, (photo, i) => `
                <div class="visual-item photo-item-click" data-index="${i}">
                    <img src="${photo.url}" alt="${photo.title || 'Fotoğraf'}">
                    ${photo.title ? `<div class="track-cover-overlay"><span class="track-cover-title">${photo.title}</span></div>` : ''}
                </div>
            `, { selector: '.photo-item-click', fn: (photo, i) => openMediaModal('photo', sortedPhotos, i) });
        }
    }

    // Modal Logic for Tracks (Supports Single & Album)
    function openTrackModal(track) {
        document.getElementById('m-cover').src = track.cover;
        document.getElementById('m-title').textContent = track.title;
        
        const detailsContainer = document.getElementById('m-track-details');
        detailsContainer.innerHTML = '';
        
        if (track.type === 'album' && track.album_tracks) {
            track.album_tracks.forEach((t, index) => {
                let creditsHtml = '';
                if(t.credits) t.credits.forEach(c => creditsHtml += `<span>${c.role}: <strong>${c.name}</strong></span> `);
                
                detailsContainer.innerHTML += `
                    <div class="album-track">
                        <div class="album-track-title">${index + 1}. ${t.title}</div>
                        <div class="album-track-meta">${creditsHtml}</div>
                        ${t.lyrics ? `<div class="album-track-lyrics">${t.lyrics}</div>` : ''}
                    </div>
                `;
            });
        } else {
            // Single
            let creditsHtml = '<div class="credit-list">';
            if(track.credits) track.credits.forEach(c => creditsHtml += `<div class="credit-item"><span>${c.role}</span><span style="color:var(--text-main);">${c.name}</span></div>`);
            creditsHtml += '</div>';
            detailsContainer.innerHTML = creditsHtml;
            if(track.lyrics) detailsContainer.innerHTML += `<div class="modal-lyrics">${track.lyrics.replace(/\n/g, '<br>')}</div>`;
        }
        
        document.getElementById('m-spotify').href = track.spotify || '#';
        document.getElementById('m-apple').href = track.apple || '#';
        document.getElementById('track-modal').classList.add('active');
    }

    document.getElementById('modal-close-track')?.addEventListener('click', () => document.getElementById('track-modal').classList.remove('active'));

    // Media Modal Logic
    let currentMediaArray = [];
    let currentMediaIndex = 0;
    let currentMediaType = '';

    function openMediaModal(type, array, startIndex) {
        currentMediaArray = array; currentMediaIndex = parseInt(startIndex); currentMediaType = type;
        updateMediaContent(); document.getElementById('media-modal').classList.add('active');
    }

    function updateMediaContent() {
        if(currentMediaArray.length === 0) return;
        const item = currentMediaArray[currentMediaIndex];
        const mediaContent = document.getElementById('media-content');
        if(currentMediaType === 'video') mediaContent.innerHTML = `<iframe width="100%" height="600" src="https://www.youtube.com/embed/${item.youtube_id}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        else mediaContent.innerHTML = `<img src="${item.url}" alt="Photo">`;
    }

    document.getElementById('media-prev')?.addEventListener('click', () => { currentMediaIndex = (currentMediaIndex - 1 + currentMediaArray.length) % currentMediaArray.length; updateMediaContent(); });
    document.getElementById('media-next')?.addEventListener('click', () => { currentMediaIndex = (currentMediaIndex + 1) % currentMediaArray.length; updateMediaContent(); });
    document.getElementById('modal-close-media')?.addEventListener('click', () => { document.getElementById('media-modal').classList.remove('active'); document.getElementById('media-content').innerHTML = ''; });
    
    // UI Events
    const menuBtn = document.getElementById('menu-btn');
    const menuOverlay = document.getElementById('menu-overlay');
    document.querySelectorAll('.menu-link, #menu-btn').forEach(el => {
        el.addEventListener('click', () => {
            if(el.id === 'menu-btn') menuOverlay.classList.toggle('active');
            else menuOverlay.classList.remove('active');
            menuBtn.textContent = menuOverlay.classList.contains('active') ? 'KAPAT' : '+ MENÜ';
        });
    });

    const tabBtns = document.querySelectorAll('.tab-btn');
    const panes = document.querySelectorAll('.visuals-pane');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active')); panes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active'); document.getElementById(btn.dataset.target).classList.add('active');
        });
    });
});
