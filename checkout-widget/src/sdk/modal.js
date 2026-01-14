export function openModal(html) {
  let overlay = document.getElementById('partnr-overlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'partnr-overlay';

    overlay.innerHTML = `
      <div id="partnr-modal">
        <div id="partnr-content"></div>
        <button id="partnr-close">Close</button>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('partnr-close').onclick = () => {
      overlay.remove();
    };
  }

  document.getElementById('partnr-content').innerHTML = html;
}
