import {
    h
} from './element';
import {
    cssPrefix
} from '../config';
import {
    CellRange
} from '../core/cell_range';

let startZIndex = 10;

class OverlayerElement {
    constructor() {
        this.el = h('div', `${cssPrefix}-overlayer-external`)
            .css('z-index', `${startZIndex}`)
            .child(this.overlayerElement = h('overlayer-element'))
            .hide();
    }

    setData(data) {
        this.overlayerElement.el.data = data;
    }

    hide() {
        this.el.hide();
        return this;
    }

    setOffset(v) {
        this.overlayerElement.el.offset = v;
        this.el.offset(v).show();
        return this;
    }
}

export default class Overlayer {
    constructor(data) {
        this.data = data;

        this.tl = new OverlayerElement();
        this.t = new OverlayerElement();
        this.l = new OverlayerElement();
        this.br = new OverlayerElement();

        this.el = h('div', `${cssPrefix}-overlayers`)
            .children(
                this.tl.el,
                this.t.el,
                this.l.el,
                this.br.el,
            ).hide();
    }

    resetData(data) {
        this.data = data;

        const {
            freeze,
            rows,
            cols
        } = data;
        const [fri, fci] = freeze;

        this.tl.setData({
            dataProxy: data,
            cellRange: new CellRange(0, 0, fri, fci)
        });
        this.t.setData({
            dataProxy: data,
            cellRange: new CellRange(0, fci, fri, cols.len)
        });
        this.l.setData({
            dataProxy: data,
            cellRange: new CellRange(fri, 0, rows.len, fci)
        });
        this.br.setData({
            dataProxy: data,
            cellRange: new CellRange(fri, fci, rows.len, cols.len)
        });

        this.resetOffset();
    }

    hide() {
        this.el.hide();
    }

    resetOffset() {
        const {
            data,
            tl,
            t,
            l,
            br,
        } = this;
        const freezeHeight = data.freezeTotalHeight();
        const freezeWidth = data.freezeTotalWidth();
        if (freezeHeight > 0 || freezeWidth > 0) {
            tl.setOffset({
                width: freezeWidth,
                height: freezeHeight
            });
            t.setOffset({
                left: freezeWidth,
                height: freezeHeight
            });
            l.setOffset({
                top: freezeHeight,
                width: freezeWidth
            });
            br.setOffset({
                left: freezeWidth,
                top: freezeHeight
            });
        } else {
            tl.hide();
            t.hide();
            l.hide();
            br.setOffset({
                left: 0,
                top: 0
            });
        }

        this.el.show();
    }
}