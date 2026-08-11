(() => {
  'use strict';

  const CHANNEL = 'supersonicshowdownleague';
  const PARENT = 'showdown2v2.live';
  const MEDIA_PATH = '/data/media.json';
  const status = document.getElementById('twitch-status');
  const dot = document.getElementById('twitch-live-dot');
  let player = null;
  let playTracked = false;
  let media = { videos: [], highlights: [] };
  let activeFilter = 'all';

  function push(event, detail = {}) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, page_path: window.location.pathname, twitch_channel: CHANNEL, ...detail });
  }

  function setStatus(text, live = false) {
    if (status) status.textContent = text;
    if (dot) dot.classList.toggle('live', live);
  }

  function dateLabel(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function safe(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function loadPlayer() {
    if (!document.getElementById('twitch-player')) return;
    const script = document.createElement('script');
    script.src = 'https://player.twitch.tv/js/embed/v1.js';
    script.async = true;
    script.onload = () => {
      if (!window.Twitch?.Player) {
        setStatus('Open the channel on Twitch');
        return;
      }
      player = new Twitch.Player('twitch-player', {
        channel: CHANNEL,
        parent: [PARENT],
        width: '100%',
        height: '100%',
        autoplay: false,
        muted: false
      });
      player.addEventListener(Twitch.Player.READY, () => push('twitch_embed_ready'));
      player.addEventListener(Twitch.Player.ONLINE, () => {
        setStatus('LIVE NOW on Twitch', true);
        push('twitch_stream_online');
      });
      player.addEventListener(Twitch.Player.OFFLINE, () => {
        setStatus('Currently offline · next official stream Saturday 9:30 PM ET', false);
        push('twitch_stream_offline');
      });
      player.addEventListener(Twitch.Player.PLAYING, () => {
        if (playTracked) return;
        playTracked = true;
        push('twitch_embed_play');
      });
    };
    script.onerror = () => setStatus('Twitch player unavailable · open the channel directly');
    document.head.appendChild(script);
  }

  function playVod(video, offset = 0) {
    if (!player || !window.Twitch?.Player) {
      window.open(video.url, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      player.setVideo(String(video.id), Number(offset) || 0);
      player.setMuted(false);
      player.play();
      document.getElementById('twitch-player-shell')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setStatus(`Playing: ${video.title}`, false);
      push('media_play_in_embed', { media_type: 'broadcast', media_id: video.id, title: video.title });
    } catch {
      window.open(video.url, '_blank', 'noopener,noreferrer');
    }
  }

  function broadcastCard(video) {
    return `<article class="card media-card" data-kind="broadcast">
      <a class="media-thumb" href="${safe(video.url)}" target="_blank" rel="noopener noreferrer">
        <img src="${safe(video.thumbnail)}" alt="" loading="lazy" decoding="async">
        <span class="media-badge">Broadcast</span><span class="media-duration">${safe(video.duration)}</span>
      </a>
      <div class="media-card-body">
        <span class="eyebrow">${safe(dateLabel(video.published_at))}</span>
        <h3>${safe(video.title)}</h3>
        <p>${safe(video.view_count)} Twitch views · ${safe((video.tags || []).join(' · '))}</p>
        <div class="media-card-actions"><button type="button" data-play-vod="${safe(video.id)}">Play here</button><a href="${safe(video.url)}" target="_blank" rel="noopener noreferrer">Open on Twitch →</a></div>
      </div>
    </article>`;
  }

  function highlightCard(clip) {
    return `<article class="card media-card" data-kind="highlight">
      <a class="media-thumb" href="${safe(clip.url)}" target="_blank" rel="noopener noreferrer">
        <img src="${safe(clip.thumbnail)}" alt="" loading="lazy" decoding="async">
        <span class="media-badge">Highlight</span><span class="media-duration">${safe(clip.duration)}</span>
      </a>
      <div class="media-card-body">
        <span class="eyebrow">${safe(dateLabel(clip.published_at))}</span>
        <h3>${safe(clip.title)}</h3>
        <p>${safe(clip.view_count)} Twitch views${clip.featured ? ' · Featured' : ''}</p>
        <div class="media-card-actions">${clip.video_id ? `<button type="button" data-play-highlight="${safe(clip.id)}">Play here</button>` : ''}<a href="${safe(clip.url)}" target="_blank" rel="noopener noreferrer">Open clip →</a></div>
      </div>
    </article>`;
  }

  function renderLibrary() {
    const broadcasts = document.getElementById('broadcast-grid');
    const highlights = document.getElementById('highlight-grid');
    const showBroadcasts = activeFilter === 'all' || activeFilter === 'broadcast';
    const showHighlights = activeFilter === 'all' || activeFilter === 'highlight';

    const broadcastSection = document.getElementById('broadcasts');
    const highlightSection = document.getElementById('highlights');
    if (broadcastSection) broadcastSection.hidden = !showBroadcasts;
    if (highlightSection) highlightSection.hidden = !showHighlights;

    if (broadcasts) broadcasts.innerHTML = media.videos?.length ? media.videos.map(broadcastCard).join('') : '<div class="media-empty">No archived broadcasts are published yet.</div>';
    if (highlights) highlights.innerHTML = media.highlights?.length ? media.highlights.map(highlightCard).join('') : '<div class="media-empty">No curated highlights are published yet.</div>';
  }

  async function loadLibrary() {
    try {
      const response = await fetch(MEDIA_PATH, { cache: 'no-store' });
      if (!response.ok) throw new Error('catalog unavailable');
      media = await response.json();
      renderLibrary();
      const updated = document.getElementById('media-updated');
      if (updated) updated.textContent = `Curated ${dateLabel(media.updated_at)}`;
    } catch {
      for (const id of ['broadcast-grid', 'highlight-grid']) {
        const grid = document.getElementById(id);
        if (grid) grid.innerHTML = '<div class="media-empty">The SSL media catalog is temporarily unavailable. Open Twitch for the latest videos.</div>';
      }
    }
  }

  document.addEventListener('click', event => {
    const filter = event.target.closest('[data-media-filter]');
    if (filter) {
      activeFilter = filter.dataset.mediaFilter || 'all';
      document.querySelectorAll('[data-media-filter]').forEach(button => button.setAttribute('aria-pressed', String(button === filter)));
      renderLibrary();
      push('media_filter', { filter: activeFilter });
      return;
    }

    const vodButton = event.target.closest('[data-play-vod]');
    if (vodButton) {
      const item = media.videos?.find(video => String(video.id) === vodButton.dataset.playVod);
      if (item) playVod(item);
      return;
    }

    const clipButton = event.target.closest('[data-play-highlight]');
    if (clipButton) {
      const item = media.highlights?.find(clip => clip.id === clipButton.dataset.playHighlight);
      if (item?.video_id) {
        const vod = { id: item.video_id, title: item.title, url: item.url };
        playVod(vod, item.vod_offset_seconds || 0);
        push('media_play_in_embed', { media_type: 'highlight', media_id: item.id, title: item.title });
      }
    }
  });

  push('view_twitch_hub', { destination: 'embedded_player' });
  loadPlayer();
  loadLibrary();
})();