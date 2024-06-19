import ensLogo from '../../../assets/ens-logo.png';
import verifiedMark from '../../../assets/verified-mark.png';
import { IUser } from '../types';

export const getRegularUserCursor = (user: IUser) => {
  const cursor = document.createElement('span');
  cursor.classList.add('collaboration-cursor__caret');
  cursor.setAttribute('style', `border-color: ${user.color}`);

  const label = document.createElement('div');
  label.classList.add('collaboration-cursor__label');
  label.setAttribute('style', `background-color: ${user.color}`);
  label.insertBefore(document.createTextNode(user.name), null);

  cursor.insertBefore(label, null);
  return cursor;
};

export const getEnsUserCursor = (user: IUser) => {
  const cursor = document.createElement('span');
  cursor.classList.add('custom-cursor__caret');

  cursor.setAttribute('style', `border-color: ${user.color}`);

  const labelContainer = document.createElement('div');
  labelContainer.classList.add('custom-cursor__label-container');
  labelContainer.setAttribute('style', `border: 1px solid ${user.color}`);

  const icon = document.createElement('img');
  icon.src = ensLogo;
  icon.classList.add('custom-cursor__icon');

  const label = document.createElement('div');
  label.classList.add('custom-cursor__label');

  const text = document.createElement('span');
  text.classList.add('custom-cursor__text');
  text.textContent = user.name;

  const badge = document.createElement('img');
  badge.src = verifiedMark;
  badge.classList.add('custom-cursor__badge');

  label.appendChild(text);
  labelContainer.appendChild(icon);
  labelContainer.appendChild(label);
  labelContainer.appendChild(badge);

  cursor.appendChild(labelContainer);
  return cursor;
};

export const getCursor = (user: IUser) => {
  return user.isEns ? getEnsUserCursor(user) : getRegularUserCursor(user);
};
