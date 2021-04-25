import Vector from "./vector.js";

class Camera extends Vector {
  zoom = 1;
  worldWidth = 2048;

  constructor({ game }) {
    super(0, 0);
    this.game = game;
    this.draw = this.draw.bind(this);

    this.game.chains.draw.camera = this.draw;
    this.game.chains.draw.insertBefore(
      this.draw,
      this.game.chains.draw.objects
    );
  }

  screenToWorld(screenV, out) {
    var ptm = this.getPixelsPerMeter();
    out.x = (screenV.x - this.game.width * 0.5) / ptm + this.game.camera.x;
    out.y = (screenV.y - this.game.height * 0.5) / ptm + this.game.camera.y;
  }

  getPixelsPerMeter() {
    const worldWidth = this.worldWidth;
    const screenWidth = this.game.width;
    const fraction = screenWidth / worldWidth;
    return fraction / this.game.camera.zoom;
  }

  reset() {
    this.x = 0;
    this.y = 0;
  }

  draw(g, next) {
    var ptm = this.getPixelsPerMeter();

    g.fillStyle("gray");
    g.fillRectangle(0, 0, this.game.width, this.game.height);

    // Transform viewport to match camera.
    g.save();
    g.context.scale(ptm, ptm);
    g.context.lineWidth /= ptm;
    g.context.translate(
      (this.game.width / ptm) * 0.5,
      (this.game.height / ptm) * 0.5
    );

    g.context.translate(this.x, -this.y);

    g.strokeStyle("green");
    g.strokeRectangle(-512, 0, 1024, 1024);

    next(g);

    g.restore();
  }
}

export default Camera;
