{
  const form = document.getElementsByTagName('form')[0];
  const button = document.getElementById('confirm-payment-button');

  form.onsubmit = () => {
    window.setTimeout(() => {
      button.className = button.className + ' disabled';
      button.setAttribute('disabled', true);
    }, 0);
  };
}
