import DropdownItem from './dropdown_item';
import DropdownFont from '../dropdown_font';
import {
  baseFonts
} from '../../core/font';

export default class Font extends DropdownItem {
  constructor() {
    super('font-name');
  }

  getValue(it) {
    return it.key;
  }

  dropdown() {
    return new DropdownFont();
  }

  setState(v) {
    if (v) {
      this.value = v;
      const font = baseFonts.find(baseFont => baseFont.key === v);
      this.dd.setTitle(font ? font.title : v);
    }
  }
}