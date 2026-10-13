/* 受付の保存結果を確認し、フォーム内に表示する。 */
(() => {
  'use strict';
  const endpoint = 'https://script.google.com/macros/s/AKfycbwzWJG-N5DHydBzOLgXtcJFS85qNCgtdX2Gs-0H8k9SSNfVtpysYQZGamRxNilWTz2m/exec';
  const requests = new WeakMap();
  function status(el, text, state) {
    let note = el.querySelector('[role="status"]');
    if (!note) { note = document.createElement('p'); note.setAttribute('role','status'); el.append(note); }
    note.className = 'receiver-status';
    note.dataset.state = state;
    note.textContent = text;
  }
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const receiptNote = ' 現在、受付完了メールの自動送信を停止しています。受付番号をお控えください。';
  function completeMessage(baseMessage, result) {
    return (result.underReview ? '受付内容を保存しました。内容を確認してから対応します。' : baseMessage) +
      (result.receiptPolicy === 'disabled' ? receiptNote :
        result.confirmationSent ? ' ご入力のメールアドレスへ受付完了メールを送信しました。' : ' メール通知を確認できていません。') +
      ' 受付番号：' + result.receipt;
  }
  async function finishDelivery(el, pending, baseMessage, email) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method:'POST', credentials:'omit', redirect:'follow', keepalive:true,
          body:new URLSearchParams({action:'notify', requestId:pending.requestId, email, format:'json'}),
        });
        if (!response.ok) throw new Error('unconfirmed');
        const result = await response.json();
        if (!result.saved || result.receipt !== pending.requestId ||
          !(result.underReview || result.notified && (result.confirmationSent || result.receiptPolicy === 'disabled'))) throw new Error('unconfirmed');
        pending.message = completeMessage(baseMessage, result);
        pending.state = 'success'; status(el, pending.message, pending.state); return;
      } catch (_) {
        if (attempt < 2) await delay(700 * (attempt + 1));
      }
    }
    pending.message = baseMessage + ' 受付内容は保存されていますが、メール通知を確認できていません。お急ぎの場合は info@package-inc.com へご連絡ください。 受付番号：' + pending.requestId;
    pending.state = 'warning'; status(el, pending.message, pending.state);
  }
  async function submitElement(el) {
    const value = selector => el.querySelector(selector)?.value?.trim() || '';
    const kind = el.matches('.s-email-form') ? 'contact' : el.matches('.s-blog-subscription') ? 'subscription' : 'comment';
    if (kind === 'subscription' && !el.querySelector('[name="readerConsent"]:checked')) {
      status(el, '読者登録申請への同意にチェックしてください。', 'error'); return;
    }
    const fields = {
      kind,
      name: kind === 'contact' ? value('[aria-label="お名前"]') : value('[name="name"]'),
      email: kind === 'contact' ? value('[aria-label="メールアドレス"]') : kind === 'subscription' ? value('.s-blog-subscription-email') : value('[name="email"]'),
      phone: kind === 'contact' ? value('[aria-label="電話番号"]') : '',
      message: kind === 'contact' ? value('[aria-label="本文"]') : value('[name="content"]'),
      page: document.querySelector('link[rel="canonical"]').href,
      consent: kind === 'subscription' ? 'yes' : '',
      website: value('[name="website"]'),
    };
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(fields.email) || (kind !== 'subscription' && (!fields.name || !fields.message))) {
      status(el, 'お名前・メールアドレス・本文を確認してください。', 'error'); return;
    }
    const fingerprint = JSON.stringify(fields);
    let pending = requests.get(el);
    if (!pending || pending.fingerprint !== fingerprint) {
      pending = {fingerprint, requestId: crypto.randomUUID()}; requests.set(el, pending);
    }
    if (pending.inFlight) { status(el, pending.message, pending.state); return; }
    if (pending.completed) { status(el, pending.message, pending.state); return; }
    pending.inFlight = true;
    pending.message = '送信操作を受け付けました。受付番号を確認しています。';
    pending.state = 'sending';
    el.setAttribute('aria-busy', 'true');
    status(el, pending.message, pending.state);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(endpoint, {
        method:'POST', credentials:'omit', redirect:'follow', signal:controller.signal, keepalive:true,
        body:new URLSearchParams({...fields, action:'save', requestId:pending.requestId, format:'json'}),
      });
      if (!response.ok) throw new Error('unconfirmed');
      const result = await response.json();
      if (!result.saved || result.receipt !== pending.requestId || result.kind !== kind || typeof result.notified !== 'boolean' || typeof result.confirmationSent !== 'boolean' || typeof result.deliveryPending !== 'boolean') throw new Error('unconfirmed');
      const baseMessage = kind === 'comment' ? 'コメントを受け付けました。内容確認後に掲載します。' :
        kind === 'subscription' ? '読者登録の申請を受け付けました。配信開始までに確認が必要です。' :
          'お問い合わせを受け付けました。内容を確認のうえ、担当者からご連絡します。';
      pending.completed = true;
      if (result.deliveryPending) {
        pending.message = baseMessage + (result.receiptPolicy === 'disabled' ? ' 担当者への通知を確認しています。' : ' 受付完了メールを送信しています。') + ' 受付番号：' + result.receipt;
        pending.state = 'success'; status(el, pending.message, pending.state);
        void finishDelivery(el, pending, baseMessage, fields.email);
      } else {
        pending.message = completeMessage(baseMessage, result);
        pending.state = result.underReview || result.notified && (result.confirmationSent || result.receiptPolicy === 'disabled') ? 'success' : 'warning'; status(el, pending.message, pending.state);
      }
    } catch (_) {
      status(el, '受付結果を確認できませんでした。入力内容は残っています。そのまま再度送信してください。お急ぎの場合は info@package-inc.com へご連絡ください。', 'error');
    } finally {
      clearTimeout(timer);
      pending.inFlight = false;
      el.setAttribute('aria-busy', 'false');
    }
  }
  window.OecuhobogReceiver = Object.freeze({submitElement});
})();
