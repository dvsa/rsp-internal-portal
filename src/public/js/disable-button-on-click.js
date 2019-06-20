{
  const button = document.getElementById('confirm-payment-button');

  button.addEventListener('click', function() {
    window.setTimeout(() => {
      button.className = button.className + ' disabled';
      button.setAttribute('disabled', true);
    }, 0);
  });
}
