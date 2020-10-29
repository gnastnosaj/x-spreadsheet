import {
    h
} from './element';
import {
    cssPrefix
} from '../config';

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

        this.tl.setData(data);
        this.t.setData(data);
        this.l.setData(data);
        this.br.setData(data);

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