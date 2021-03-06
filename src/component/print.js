/* global window document */
import {
  h
} from './element';
import {
  cssPrefix,
  dpr
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

const PAGER_ALIGNS = ['left', 'center', 'right'];

function inches2px(inc) {
  return parseInt(96 * inc, 10);
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
  this.sheet.table.resetData(this.data);
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
  this.sheet.table.resetData(this.data);
  this.preview();
}

function pageAlignChange(evt) {
  const {
    paper
  } = this;
  const {
    value
  } = evt.target;
  const v = PAGER_ALIGNS[value];
  paper.align = v;
  this.preview();
}

export default class Print {
  constructor(sheet) {
    this.paper = {
      w: inches2px(PAGER_SIZES[1][1]),
      h: inches2px(PAGER_SIZES[1][2]),
      padding: 0,
      orientation: PAGER_ORIENTATIONS[1],
      align: PAGER_ALIGNS[0],
      get width() {
        return this.orientation === 'landscape' ? this.h : this.w;
      },
      get height() {
        return this.orientation === 'landscape' ? this.w : this.h;
      },
    };
    this.sheet = sheet;
    this.data = sheet.data;
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
              this.alignEl = h('fieldset', '').children(
                h('label', '').child(`${t('print.align')}`),
                h('select', '').children(
                  ...PAGER_ALIGNS.map((it, index) => {
                    const option = h('option', '').attr('value', index).attr('selected', index == 0 ? 'selected' : null);
                    option.el.selected = (index == 0);
                    option.child(`${t('print.aligns')[index]}`);
                    return option;
                  }),
                ).on('change', pageAlignChange.bind(this))
              )
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
    const iwidth = (width - padding * 2) / dpr;
    let scale = iwidth / cr.w;
    const iheight = (height - padding * 2) / dpr;
    let left = padding / dpr;
    const top = padding / dpr;

    if (scale > 1) {
      scale = 1;
      this.alignEl.show();
      if (paper.align === 'center') {
        left += (iwidth - cr.w * scale) / 2;
      } else if (paper.align === 'right') {
        left = (width - padding) / dpr - cr.w * scale;
      }
    } else {
      scale = 1;
      this.alignEl.hide();
    }

    const pages = parseInt(cr.h * scale / iheight, 10) + 1;
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
    const renderPage = (left, consumed, total) => {
      let sumWidth = true;
      if (total == null) {
        total = 0;
      } else {
        sumWidth = false;
      }
      const cache = {
        ri,
        yoffset
      };
      let th = data.freezeTotalHeight() * scale;
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
      for (; ri <= cr.eri; ri += 1) {
        const rh = data.rows.getHeight(ri) * scale;
        let merge = 0;
        let extra = 0;
        const row = data.rows.get(`${ri}`);
        if (row != null) {
          const cells = row.cells;
          const cols = Object.keys(cells);
          if (sumWidth) {
            const w = data.cols.sumWidth(0, cols[cols.length - 1]);
            if (w > total) {
              total = w;
            }
          }
          for (const ci of cols) {
            const cell = cells[ci];
            if (cell.merge && cell.merge[0] > merge) {
              merge = cell.merge[0];
            }
          }
          for (let i = 0; i < merge; i++) {
            extra += data.rows.getHeight(ri + i + 1) * scale;
          }
        }
        th += rh;
        if (th + extra <= iheight) {
          for (let ci = 0; ci <= cr.eci; ci += 1) {
            renderCell(draw, data, ri, ci, yoffset);
            mViewRange.eci = ci;
          }
        } else {
          yo = -(th - rh) / scale + data.freezeTotalHeight();
          break;
        }
      }
      mViewRange.eri = ri - 1;
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
      // freeze-cell
      for (let hri = 0; hri < data.freeze[0]; hri += 1) {
        for (let ci = 0; ci <= cr.eci; ci += 1) {
          renderCell(draw, data, hri, ci, 0);
        }
      }
      data.eachMergesInView({
        sri: 0,
        sci: 0,
        eri: data.freeze[0],
        eci: cr.eci,
      }, ({
        sri,
        sci
      }) => {
        renderCell(draw, data, sri, sci, 0);
      });
      draw.restore();
      // clear
      draw.save();
      draw.clearRect(0, 0, padding, paper.height);
      draw.clearRect(paper.width - padding, 0, padding, paper.height);
      draw.restore();

      mViewRange.sri = mViewRange.eri;
      //mViewRange.sci = mViewRange.eci;
      yoffset += yo;
      this.contentEl.child(h('div', `${cssPrefix}-canvas-card-wraper`).child(wrap.child(canvas)));
      if (consumed == null) {
        consumed = iwidth;
      }
      if (consumed < total) {
        ri = cache.ri;
        yoffset = cache.yoffset;
        renderPage(left - iwidth, consumed + iwidth, total);
      }
    };
    for (let i = 0; i < pages; i += 1) {
      renderPage(left);
    }
    this.el.show();
  }

  toPrint() {
    this.el.hide();
    const {
      paper
    } = this;
    if (this.iframes == null) {
      this.iframes = [];
    } else {
      while (this.iframes.length > 0) {
        window.document.body.removeChild(this.iframes.shift());
      }
    }
    const iframe = h('iframe', '').hide();
    const {
      el
    } = iframe;
    window.document.body.appendChild(el);
    this.iframes.push(el);
    const {
      contentWindow
    } = el;
    const idoc = contentWindow.document;
    const style = idoc.createElement('style');
    style.innerHTML = `
      @page { size: ${paper.width - 2}px ${paper.height - 2}px; };
      canvas {
        page-break-before: auto;        
        page-break-after: always;
      };
    `;
    idoc.head.appendChild(style);
    idoc.body.style.marginTop = '0px';
    idoc.body.style.marginRight = '0px';
    idoc.body.style.marginBottom = '0px';
    idoc.body.style.marginLeft = '0px';
    this.canvases.forEach((it) => {
      const cn = it.cloneNode();
      cn.getContext('2d').drawImage(it, 0, 0);
      idoc.body.appendChild(cn);
    });
    contentWindow.print();
  }
}