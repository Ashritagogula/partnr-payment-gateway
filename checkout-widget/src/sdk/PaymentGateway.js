import { openModal } from './modal';
import './styles.css';

function open(options) {
  openModal(`
    <h3>Checkout Initialized</h3>
    <p>SDK loaded successfully.</p>
    <p>Next step: payment creation</p>
  `);
}

window.PartnrCheckout = {
  open
};
