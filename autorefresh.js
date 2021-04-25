class AutoRefresh {
  constructor({ game }) {
    this.game = game;
    this.reload = this.reload.bind(this);
    this.mousemove = this.mousemove.bind(this);
    this.keydown = this.keydown.bind(this);
    this.draw = this.draw.bind(this);
  }

  enable() {
    this.timeout = setTimeout(this.reload, 3000);
    this.game.once("keydown", this.keydown);
    this.game.once("mousemove", this.mousemove);
    this.game.chains.draw.unshift(this.draw);
  }

  reload() {
    document.location.reload(true);
  }

  keydown() {
    this.disable();
  }

  mousemove() {
    this.disable();
  }

  draw(g, next) {
    next(g);

    g.fillStyle("#ff0000");
    g.fillCircle(this.game.width, 0, 30);
    g.fillStyle("black");
  }

  disable() {
    clearTimeout(this.timeout);
    game.chains.draw.remove(this.draw);
  }
}

export default AutoRefresh;
