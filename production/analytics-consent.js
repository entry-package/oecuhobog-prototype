/* Basic consent: no analytics request until the visitor opts in. */
(() => {
  'use strict';
  if (location.origin !== 'https://www.oecuhobog.org') return;
  const key = 'oecuhobog.analytics.v1', id = 'G-NXBW4Y326R';
  const denied = {analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'};
  let loaded = false, choice;
  try { choice = localStorage.getItem(key); } catch (_) {}
  window['ga-disable-' + id] = choice !== 'allow';
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', denied);
  function clearAnalyticsCookies() {
    for (const entry of document.cookie.split(';')) {
      const name = entry.split('=')[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) continue;
      for (const domain of ['', location.hostname, '.oecuhobog.org']) {
        document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax' + (domain ? '; domain=' + domain : '');
      }
    }
  }
  function apply(value) {
    choice = value;
    window['ga-disable-' + id] = value !== 'allow';
    window.gtag('consent', 'update', {...denied, analytics_storage:value === 'allow' ? 'granted' : 'denied'});
    if (value !== 'allow') { clearAnalyticsCookies(); return; }
    if (loaded) return;
    loaded = true;
    window.gtag('js', new Date());
    window.gtag('config', id, {
      allow_google_signals:false, allow_ad_personalization_signals:false,
      page_location:location.origin + location.pathname,
      page_referrer:document.referrer ? new URL(document.referrer).origin : '',
      send_page_view:true
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.append(script);
  }
  function show(focus) {
    let panel = document.querySelector('.analytics-banner');
    if (panel) { if (focus) panel.querySelector('button').focus(); return; }
    panel = document.createElement('section');
    panel.className = 'analytics-banner'; panel.setAttribute('aria-label', 'アクセス解析の設定');
    const text = document.createElement('p');
    text.textContent = 'サイトの改善のため、アクセス解析にCookieを使用してよいですか。同意しなくてもサイトを利用できます。';
    const policy = document.createElement('a');
    policy.href = '/pages/cookie-policy/'; policy.textContent = '個人情報・Cookieについて';
    const actions = document.createElement('div'); actions.className = 'analytics-actions';
    for (const [value,label] of [['deny','同意しない'],['allow','同意する']]) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'button muted'; button.textContent = label;
      button.addEventListener('click', () => {
        try { localStorage.setItem(key, value); } catch (_) {}
        apply(value); panel.remove();
        if (focus) document.querySelector('.analytics-settings')?.focus();
      });
      actions.append(button);
    }
    panel.append(text, policy, actions); document.body.append(panel);
    if (focus) actions.querySelector('button').focus();
  }
  const settings = document.createElement('button');
  settings.type = 'button'; settings.className = 'analytics-settings'; settings.textContent = 'アクセス解析の設定';
  settings.addEventListener('click', () => show(true));
  document.querySelector('footer')?.append(settings);
  if (choice === 'allow' || choice === 'deny') apply(choice); else show(false);
})();
