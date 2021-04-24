class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }
  add(x, y) {
    this.x += x;
    this.y += y;
    return this;
  }
  substract(x, y) {
    this.x -= x;
    this.y -= y;
    return this;
  }
  multiply(f) {
    this.x *= f;
    this.y *= f;
    return this;
  }
  divide(f) {
    this.x /= f;
    this.y /= f;
    return this;
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  length2() {
    return this.x * this.x + this.y * this.y;
  }
  distanceTo(x, y) {
    var dx = this.x - x;
    dx *= dx;
    var dy = this.y - y;
    dy *= dy;
    //console.log(dy);
    return Math.sqrt(dx + dy);
  }
  normalize() {
    var l = this.length();
    if (l === 0.0) {
      throw "Normalizing 0!";
    }
    this.x /= l;
    this.y /= l;
    return this;
  }
  normalizeOr(x, y) {
    var l = this.length();
    if (l === 0.0) {
      this.x = x;
      this.y = y;
      return this;
    }
    this.x /= l;
    this.y /= l;
    return this;
  }
  normalizeOrZero() {
    return this.normalizeOr(0, 0);
  }
  dot(x, y) {
    return this.x * x + this.y * y;
  }
  negate() {
    this.x = -this.x;
    this.y = -this.y;
    return this;
  }
  normalRight() {
    var tmp = this.x;
    this.x = -this.y;
    this.y = tmp;
    return this;
  }
  normalLeft() {
    var tmp = this.x;
    this.x = this.y;
    this.y = -tmp;
    return this;
  }
  equals(x, y) {
    return this.x === x && this.y === y;
  }
  toString() {
    return "Vector(" + this.x + "," + this.y + ")";
  }
  rotate(r) {
    var l = this.length();
    var nr = Math.atan2(this.y, this.x) + r;
    this.x = Math.cos(nr) * l;
    this.y = Math.sin(nr) * l;
    return this;
  }
  angleToward(x, y) {
    var a1 = Math.atan2(this.y, this.x);
    var a2 = Math.atan2(y, x);

    if (a1 < -Math.PI / 2 && a2 > Math.PI / 2) a1 += Math.PI * 2;
    if (a2 < -Math.PI / 2 && a1 > Math.PI / 2) a2 += Math.PI * 2;

    return a2 - a1;
  }
  angle() {
    return Math.atan2(this.y, this.x);
  }
  clone() {
    return new Vector(this.x, this.y);
  }

  setV(v) {
    return this.set(v.x, v.y);
  }
  addV(v) {
    return this.add(v.x, v.y);
  }
  substractV(v) {
    return this.substract(v.x, v.y);
  }
  multiplyV(v) {
    return this.multiply(v.x, v.y);
  }
  divideV(v) {
    return this.divide(v.x, v.y);
  }
  normalizeOrV(v) {
    return this.normalizeOr(v.x, v.y);
  }
  dotV(v) {
    return this.dot(v.x, v.y);
  }
  equalsV(v) {
    return this.equals(v.x, v.y);
  }
  distanceToV(v) {
    return this.distanceTo(v.x, v.y);
  }
  angleTowardV(v) {
    return this.angleToward(v.x, v.y);
  }

  static distance(x1, y1, x2, y2) {
    var dx = x1 - x2;
    dx *= dx;
    var dy = y1 - y2;
    dy *= dy;
    return Math.sqrt(dx + dy);
  }

  static zero = new Vector(0, 0);
  static xaxis = new Vector(1, 0);
  static yaxis = new Vector(0, 1);
}

export default Vector;
