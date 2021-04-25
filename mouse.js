import Vector from "./vector.js";

class Mouse extends Vector {
  over = false;
  buttons = {};
  constructor({ game }) {
    super(0, 0);
    this.game = game;

    this.mouseup = this.mouseup.bind(this);
    this.mousedown = this.mousedown.bind(this);
    this.mousemove = this.mousemove.bind(this);
    this.mousewheel = this.mousewheel.bind(this);
    this.DOMMouseScroll = this.DOMMouseScroll.bind(this);

    this.game.canvas.addEventListener("mouseup", this.mouseup, true);
    this.game.canvas.addEventListener("mousedown", this.mousedown, true);
    this.game.canvas.addEventListener("mousemove", this.mousemove, true);
    this.game.canvas.addEventListener("mousewheel", this.mousewheel, true);
    this.game.canvas.addEventListener(
      "DOMMouseScroll",
      this.DOMMouseScroll,
      true
    );
  }

  getMousePosition(event) {
    const boundingRect = this.game.canvas.getBoundingClientRect();
    return new Vector(
      event.pageX - boundingRect.x,
      event.pageY - boundingRect.y
    );
  }

  mouseup(event) {
    if (this.game.mouse.buttons[event.button]) {
      this.setV(this.getMousePosition(event));

      delete this.buttons[event.button];
      this.game.emit("mouseup", event.button, this.x, this.y);
    }
    return false;
  }

  mousedown(event) {
    if (!this.buttons[event.button]) {
      this.setV(this.getMousePosition(event));

      this.buttons[event.button] = true;
      this.game.emit("mousedown", event.button, this.x, this.y);
    }
    return false;
  }

  mousemove(event) {
    this.setV(this.getMousePosition(event));

    this.game.emit("mousemove", this.x, this.y);
  }

  mousewheel(event) {
    this.setV(this.getMousePosition(event));

    this.game.emit("mousewheel", event.deltaY, this.x, this.y);
  }

  DOMMouseScroll(event) {
    this.setV(this.getMousePosition(event));

    this.game.emit("mousewheel", -event.detail);
  }
}

export default Mouse;
