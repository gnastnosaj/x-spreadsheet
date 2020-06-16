/* global window document */
import {
  h
} from './element';
import {
  cssPrefix
} from '../config';
import Button from './button';
import {
  Draw
} from '../canvas/draw';
import {
  renderCell
} from './table';
import {
  t
} from '../locale/locale';

// resolution: 72 => 595 x 842
// 150 => 1240 x 1754
// 200 => 1654 x 2339
// 300 => 2479 x 3508
// 96 * cm / 2.54 , 96 * cm / 2.54

const PAGER_SIZES = [
  ['A3', 11.69, 16.54],
  ['A4', 8.27, 11.69],
  ['A5', 5.83, 8.27],
  ['B4', 9.84, 13.90],
  ['B5', 6.93, 9.84],
];

const PAGER_ORIENTATIONS = ['landscape', 'portrait'];

function inches2px(inc) {
  return 96 * inc;
}

function btnClick(type) {
  if (type === 'cancel') {
    this.el.hide();
  } else {
    this.toPrint();
  }
}

function pagerSizeChange(evt) {
  const {
    paper
  } = this;
  const {
    value
  } = evt.target;
  const ps = PAGER_SIZES[value];
  paper.w = inches2px(ps[1]);
  paper.h = inches2px(ps[2]);
  // console.log('paper:', ps, paper);
  this.preview();
}

function pagerOrientationChange(evt) {
  const {
    paper
  } = this;
  const {
    value
  } = evt.target;
  const v = PAGER_ORIENTATIONS[value];
  paper.orientation = v;
  this.preview();
}

export default class Print {
  constructor(data) {
    this.paper = {
      w: inches2px(PAGER_SIZES[1][1]),
      h: inches2px(PAGER_SIZES[1][2]),
      padding: 50,
      orientation: PAGER_ORIENTATIONS[1],
      get width() {
        return this.orientation === 'landscape' ? this.h : this.w;
      },
      get height() {
        return this.orientation === 'landscape' ? this.w : this.h;
      },
    };
    this.data = data;
    this.el = h('div', `${cssPrefix}-print`)
      .children(
        h('div', `${cssPrefix}-print-bar`)
        .children(
          h('div', '-title').child(`${t('print.settings')}`),
          h('div', '-right').children(
            h('div', `${cssPrefix}-buttons`).children(
              new Button('cancel').on('click', btnClick.bind(this, 'cancel')),
              new Button('next', 'primary').on('click', btnClick.bind(this, 'next')),
            ),
          ),
        ),
        h('div', `${cssPrefix}-print-content`)
        .children(
          this.contentEl = h('div', '-content'),
          h('div', '-sider').child(
            h('form', '').children(
              h('fieldset', '').children(
                h('label', '').child(`${t('print.size')}`),
                h('select', '').children(
                  ...PAGER_SIZES.map((it, index) => {
                    const option = h('option', '').attr('value', index);
                    option.el.selected = (index == 1);
                    option.child(`${it[0]} ( ${it[1]}''x${it[2]}'' )`);
                    return option;
                  }),
                ).on('change', pagerSizeChange.bind(this)),
              ),
              h('fieldset', '').children(
                h('label', '').child(`${t('print.orientation')}`),
                h('select', '').children(
                  ...PAGER_ORIENTATIONS.map((it, index) => {
                    const option = h('option', '').attr('value', index).attr('selected', index == 1 ? 'selected' : null);
                    option.el.selected = (index == 1);
                    option.child(`${t('print.orientations')[index]}`);
                    return option;
                  }),
                ).on('change', pagerOrientationChange.bind(this)),
              ),
            ),
          ),
        ),
      ).hide();
  }

  resetData(data) {
    this.data = data;
  }

  preview() {
    const {
      data,
      paper
    } = this;
    const {
      width,
      height,
      padding
    } = paper;
    const cr = data.contentRange();
    cr.eci = data.cols.len;
    const iwidth = width - padding * 2;
    const scale = iwidth / cr.w;
    const iheight = height - padding * 2 - data.freezeTotalHeight() * scale;
    const pages = parseInt((cr.h - data.freezeTotalHeight()) * scale / iheight, 10) + 1;
    let left = padding;
    const top = padding;
    // if (scale > 1) {
    //   left += (iwidth - cr.w) / 2;
    // }
    let ri = data.freeze[0];
    let yoffset = 0;
    this.contentEl.html('');
    this.canvases = [];
    const mViewRange = {
      sri: 0,
      sci: 0,
      eri: 0,
      eci: 0,
    };
    for (let i = 0; i < pages; i += 1) {
      let th = 0;
      let yo = 0;
      const wrap = h('div', `${cssPrefix}-canvas-card`).css('height', `${height}px`).css('width', `${width}px`);
      const canvas = h('canvas', `${cssPrefix}-canvas`);
      this.canvases.push(canvas.el);
      const draw = new Draw(canvas.el, width, height);
      // cell-content
      draw.save();
      draw.translate(left, top);
      if (scale < 1) draw.scale(scale, scale);
      // console.log('ri:', ri, cr.eri, yoffset);
      for (let hri = 0; hri < data.freeze[0]; hri += 1) {
        for (let ci = 0; ci <= cr.eci; ci += 1) {
          renderCell(draw, data, hri, ci, 0);
          mViewRange.eci = ci;
        }
      }
      for (; ri <= cr.eri; ri += 1) {
        const rh = data.rows.getHeight(ri);
        th += rh;
        if (th * scale <= iheight) {
          for (let ci = 0; ci <= cr.eci; ci += 1) {
            renderCell(draw, data, ri, ci, yoffset);
            mViewRange.eci = ci;
          }
        } else {
          yo = -(th - rh);
          break;
        }
      }
      mViewRange.eri = ri;
      draw.restore();
      // merge-cell
      draw.save();
      draw.translate(left, top);
      if (scale < 1) draw.scale(scale, scale);
      const yof = yoffset;
      data.eachMergesInView(mViewRange, ({
        sri,
        sci
      }) => {
        renderCell(draw, data, sri, sci, yof);
      });
      draw.restore();

      mViewRange.sri = mViewRange.eri;
      mViewRange.sci = mViewRange.eci;
      yoffset += yo;
      this.contentEl.child(h('div', `${cssPrefix}-canvas-card-wraper`).child(wrap.child(canvas)));
    }
    this.el.show();
  }

  toPrint() {
    this.el.hide();
    const {
      paper
    } = this;
    const iframe = h('iframe', '').hide();
    const {
      el
    } = iframe;
    window.document.body.appendChild(el);
    const {
      contentWindow
    } = el;
    const idoc = contentWindow.document;
    const style = document.createElement('style');
    style.innerHTML = `
      @page { size: ${paper.width}px ${paper.height}px; };
      canvas {
        page-break-before: auto;        
        page-break-after: always;
      };
    `;
    idoc.head.appendChild(style);
    this.canvases.forEach((it) => {
      const cn = it.cloneNode();
      cn.getContext('2d').drawImage(it, 0, 0);
      idoc.body.appendChild(cn);
    });
    contentWindow.print();
  }
}