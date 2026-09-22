/* Editor behavior is unchanged; sourced from the last pre-theme commit. */
(function loadEditor() {
  const src = 'https://raw.githubusercontent.com/T-arg/ESCD-Level-Editor/11e826960f3c6d79d81f57e027b9851670b037b2/index.html';
  fetch(src)
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var start = html.indexOf('<script>');
      var end = html.lastIndexOf('</script>');
      if (start < 0 || end < 0) throw new Error('editor script not found');
      var code = html.slice(start + 8, end);
      (0, eval)(code);
    })
    .catch(function (err) {
      console.error(err);
      document.body.insertAdjacentHTML(
        'beforeend',
        '<p style="padding:12px;color:#c0392b">Failed to load editor.js logic.</p>'
      );
    });
})();
