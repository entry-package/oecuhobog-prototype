/* Enable the new form markup only on the production origin. */
(() => {
  'use strict';
  if (location.origin !== 'https://www.oecuhobog.org') return;
  document.querySelectorAll('.site-form').forEach(form => {
    const kind = form.dataset.intakeKind;
    form.classList.add(kind === 'subscription' ? 's-blog-subscription' : kind === 'comment' ? 's-blog-comment-form' : 's-email-form');
    if (kind === 'subscription') form.querySelector('[name="email"]').classList.add('s-blog-subscription-email');
    form.querySelectorAll(':disabled').forEach(field => field.disabled = false);
    form.dataset.productionEnabled = 'true';
    const note = form.querySelector('.form-note');
    note.textContent = kind === 'subscription' ?
      '確認メールのリンクを48時間以内に開くと登録が完了します。' :
      kind === 'comment' ? 'コメントは内容を確認した後に掲載します。お名前と本文が公開されます。' :
      '受付番号が表示されるまでこの画面を閉じないでください。';
    form.querySelector('.review-contact-link')?.remove();
  });
})();
