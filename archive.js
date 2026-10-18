document.querySelector('#article-search')?.addEventListener('input', event => {
  const query = event.target.value.trim().normalize('NFKC').toLocaleLowerCase('ja');
  let count = 0;
  document.querySelectorAll('.archive-card[data-search]').forEach(card => {
    card.hidden = !card.dataset.search.normalize('NFKC').toLocaleLowerCase('ja').includes(query);
    if (!card.hidden) count++;
  });
  document.querySelector('#search-count').textContent = `${count}件のお知らせ`;
  document.querySelector('#search-empty').hidden = count !== 0;
});
document.querySelectorAll('.site-form').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (location.origin === 'https://www.oecuhobog.org' && form.dataset.productionEnabled === 'true') {
      if (window.OecuhobogReceiver) void window.OecuhobogReceiver.submitElement(form);
      else form.querySelector('.form-status').textContent = '受付機能を読み込めませんでした。入力内容を保存して再読み込みするか、事務局へメールでご連絡ください。';
      return;
    }
    form.querySelector('.form-status').textContent = '確認用サイトのため、このフォームからは送信できません。';
  });
});
