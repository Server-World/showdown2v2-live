(() => {
  'use strict';

  const CHANNEL = 'supersonicshowdownleague';
  const PARENT = 'showdown2v2.live';
  const status = document.getElementById('twitch-status');
  const dot = document.getElementById('twitch-live-dot');
  let playTracked = false;

  function push(event, detail = {}) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, page_path: window.location.pathname, twitch_channel: CHANNEL, ...detail });
  }

  function setStatus(text, live = false) {
    if (status) status.textContent = text;
    if (dot) dot.classList.toggle('live', live);
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
      const player = new Twitch.Player('twitch-player', {
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

  push('view_twitch_hub', { destination: 'embedded_player' });
  loadPlayer();
})();
