class IntrusiveList {
  static BREAK = Symbol("BREAK");
  static DELETE = Symbol("DELETE");

  constructor(name) {
    this.root = null;
    this._nextProp = Symbol("_next" + name);
  }

  push(o) {
    if (this._nextProp in o) {
      throw (
        typeof o + " " + o.constructor + " already in list " + this._nextProp
      );
    }
    o[this._nextProp] = this.root;
    this.root = o;
  }

  pop() {
    if (!(this._nextProp in o)) {
      throw typeof o + " " + o.constructor + " not in list " + this._nextProp;
    }
    const o = this.root;
    this.root = o[this._nextProp];
    return o;
  }

  each(f) {
    let o = this.root;
    if (!o) {
      return;
    }
    let prev = null;
    let next;
    while (o) {
      next = o[this._nextProp];
      const r = f(o, IntrusiveList.BREAK, IntrusiveList.DELETE);
      if (r === IntrusiveList.DELETE) {
        if (prev) {
          prev[this._nextProp] = next;
        } else {
          this.root = next;
        }
        delete o[this._nextProp];
        o = next;
        continue;
      } else if (r === IntrusiveList.BREAK) {
        break;
      }
      prev = o;
      o = next;
    }
  }

  *iterate() {
    let o = this.root;
    if (!o) {
      return;
    }
    let prev = null;
    let next;
    while (o) {
      next = o[this._nextProp];
      yield o;
      prev = o;
      o = next;
    }
  }

  [Symbol.iterator]() {
    return this.iterate();
  }

  contains(findElement) {
    let result = false;
    this.each((element, BREAK) => {
      if (element === findElement) {
        result = true;
        return BREAK;
      }
    });
    return result;
  }
}
export default IntrusiveList;
