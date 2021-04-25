"use strict";

class DIntrusiveList {
  static DELETE = Symbol("DELETE");
  static BREAK = Symbol("BREAK");

  constructor(name) {
    this.root = null;
    this.tail = null;
    this._nextProp = Symbol("_next" + name);
    this._prevProp = Symbol("_prev" + name);
    this.listeners = {
      added: [],
      removed: [],
    };
  }

  get first() {
    return this.root;
  }

  push(o) {
    if (this._nextProp in o) {
      throw (
        typeof o + " " + o.constructor + " already in list " + this._nextProp
      );
    }
    const next = this.root;
    if (next) {
      next[this._prevProp] = o;
    }
    o[this._nextProp] = next;
    o[this._prevProp] = null;
    this.root = o;
    if (!this.tail) {
      this.tail = o;
    }
    this.each(function (o) {
      if (o[this._nextProp] === o) {
        throw "koek";
      }
    });
    for (const listener of this.listeners.added) {
      listener(o);
    }
  }
  pop() {
    this.remove(this.root);
  }
  remove(o) {
    if (!(this._nextProp in o)) {
      throw typeof o + " " + o.constructor + " not in list " + this._nextProp;
    }
    const prev = o[this._prevProp];
    const next = o[this._nextProp];
    if (this.root === o) {
      this.root = next;
    } else {
      prev[this._nextProp] = next;
    }
    if (next) {
      this.tail = prev;
      next[this._prevProp] = prev;
    }
    delete o[this._nextProp];
    delete o[this._prevProp];
    for (const listener of this.listeners.removed) {
      listener(o);
    }
  }
  each(f) {
    let o = this.root;
    if (!o) {
      return;
    }
    let next;
    while (o) {
      next = o[this._nextProp];
      const r = f.call(this, o, DIntrusiveList.BREAK, DIntrusiveList.DELETE);
      if (r === DIntrusiveList.DELETE) {
        this.remove(o);
        o = next;
        continue;
      } else if (r === DIntrusiveList.BREAK) {
        break;
      } else {
        o = next;
      }
    }
  }
  *iterate() {
    let o = this.root;
    if (!o) {
      return;
    }
    let next;
    while (o) {
      next = o[this._nextProp];
      yield o;
      o = next;
    }
  }
  [Symbol.iterator]() {
    return this.iterate();
  }
  eachReverse(f) {
    let o = this.tail;
    if (!o) {
      return;
    }
    let prev;
    while (o) {
      prev = o[this._prevProp];
      const r = f(o, DIntrusiveList.BREAK, DIntrusiveList.DELETE);
      if (r === DIntrusiveList.DELETE) {
        this.remove(o);
        o = prev;
        continue;
      } else if (r === DIntrusiveList.BREAK) {
        break;
      } else {
        o = prev;
      }
    }
  }
  insertBefore(after, o) {
    const prev = after && after[this._prevProp];
    const next = after;
    o[this._nextProp] = next;
    o[this._prevProp] = prev;
    if (next) {
      next[this._prevProp] = o;
    }
    if (prev) {
      prev[this._nextProp] = o;
    } else {
      this.root = o;
    }
    for (const listener of this.listeners.added) {
      listener(o);
    }
  }
}
export default DIntrusiveList;
