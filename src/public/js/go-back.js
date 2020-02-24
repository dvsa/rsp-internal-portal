(() => {
  const link = document.getElementById('confirmation-go-back');

  if (link !== null) {
    link.onclick = (event) => {
      event.preventDefault();
      window.history.back();
    };
  }
})();
