// import helper from '../helper';

export default class History {
  constructor() {
    this.clear();
  }

  add(data) {
    this.clean = false;
    this.undoItems.push(JSON.stringify(data));
    this.redoItems = [];
  }

  canUndo() {
    return this.undoItems.length > 0;
  }

  canRedo() {
    return this.redoItems.length > 0;
  }

  undo(currentd, cb) {
    this.clean = false;
    const {
      undoItems,
      redoItems
    } = this;
    if (this.canUndo()) {
      redoItems.push(JSON.stringify(currentd));
      cb(JSON.parse(undoItems.pop()));
    }
  }

  redo(currentd, cb) {
    this.clean = false;
    const {
      undoItems,
      redoItems
    } = this;
    if (this.canRedo()) {
      undoItems.push(JSON.stringify(currentd));
      cb(JSON.parse(redoItems.pop()));
    }
  }

  clear() {
    this.clean = true;
    this.undoItems = [];
    this.redoItems = [];
  }
}