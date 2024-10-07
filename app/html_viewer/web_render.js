const codeInput = document.getElementById('code-input');
const previewBtn = document.getElementById('preview-btn');
const previewContainer = document.getElementById('preview-container');
previewBtn.addEventListener('click', () => {
  const code = codeInput.value;
  const iframe = document.createElement('iframe');
  iframe.frameBorder = '0';
  iframe.width = '100%';
  iframe.height = '100%';

  iframe.srcdoc = `<html><body>${code}</body></html>`;

  previewContainer.innerHTML = '';
  previewContainer.appendChild(iframe);
});
