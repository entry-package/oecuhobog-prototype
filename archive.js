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
    form.querySelector('.form-status').textContent = '確認用サイトのため、このフォームからは送信できません。';
  });
});
