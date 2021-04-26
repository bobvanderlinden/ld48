"use strict";
import Vector from "./vector.js";

class EditorState {
  items = [];
  item = null;
  constructor({ game, items, gameplayState }) {
    this.game = game;
    this.items = items;
    this.item = items[0];
    this.gameplayState = gameplayState;

    this.draw = this.draw.bind(this);
    this.mousedown = this.mousedown.bind(this);
    this.keydown = this.keydown.bind(this);
    this.update = this.update.bind(this);
  }

  enable() {
    console.log("enable editor");
    this.game.levelSystem.restartLevel();

    this.game.chains.draw.push(this.draw);
    this.game.on("mousedown", this.mousedown);
    this.game.on("keydown", this.keydown);
    this.game.chains.update.unshift(this.update);
  }

  disable() {
    console.log("disable editor");
    this.game.chains.draw.remove(this.draw);
    this.game.removeListener("mousedown", this.mousedown);
    this.game.removeListener("keydown", this.keydown);
    this.game.chains.update.remove(this.update);
  }

  update(dt, next) {
    const movement = new Vector(
      (this.game.keys.right ? 1 : 0) - (this.game.keys.left ? 1 : 0),
      (this.game.keys.down ? 1 : 0) - (this.game.keys.up ? 1 : 0)
    );
    // this.game.camera.x += movement.x * dt * 500;
    this.game.camera.y += movement.y * dt * 2000;
    this.game.objects.handlePending();

    // Stop updating rest of game.
    // next(dt);
  }

  getPosition() {
    var tmp = new Vector();
    this.game.camera.screenToWorld(this.game.mouse, tmp);
    tmp.x = Math.round(tmp.x);
    tmp.y = Math.round(tmp.y);
    return tmp;
  }

  place() {
    var p = this.getPosition();
    this.game.objects.add(
      new this.item({
        x: p.x,
        y: p.y,
      })
    );
  }

  deleteItem() {
    const position = this.getPosition();
    const closest = [...this.game.objects.lists.export].reduce(
      (closest, current) => {
        return !current ||
          position.distanceToV(current.position) <
            position.distanceToV(closest.position)
          ? current
          : closest;
      }
    );
    this.game.objects.remove(closest);
  }

  save() {
    let str = [...this.game.objects.lists.export]
      .map(
        ({ constructor, position }) =>
          `new ${constructor.name}({ x: ${position.x}, y: ${position.y}}),`
      )
      .join("\n");
    window.navigator.clipboard.writeText(str).then(() => {
      console.log("level copied to clipboard");
    });
  }

  mousedown(button) {
    if (button === 0) {
      this.place();
    } else if (button === 2) {
      this.deleteItem();
    }
  }

  play() {
    const levelObjects = [...this.game.objects.lists.export].map((object) => ({
      constructor: object.constructor,
      x: object.position.x,
      y: object.position.y,
    }));
    function createLevel() {
      return {
        name: "level",
        objects: levelObjects.map(
          ({ constructor, x, y }) =>
            new constructor({
              x,
              y,
            })
        ),
        clone: createLevel,
        nextLevel: createLevel,
      };
    }
    this.game.levelSystem.changeLevel(createLevel());
    this.game.changeState(this.gameplayState);
  }

  keydown(key) {
    if (key === "p") {
      this.save();
    } else if (key === "e") {
      this.play();
    } else if (key === "r") {
      this.game.levelSystem.restartLevel();
    } else if (key === "d") {
      this.deleteItem();
    }

    var d = (key === "]" ? 1 : 0) - (key === "[" ? 1 : 0);
    this.item = this.items[
      (this.items.indexOf(this.item) + d + this.items.length) %
        this.items.length
    ];
  }

  draw(g, next) {
    next(g);
    for (const o of this.game.objects.lists.editorVisible) {
      o.drawForeground(g);
    }
    const leftTop = new Vector();
    this.game.camera.screenToWorld(Vector.zero, leftTop);
    const rightBottom = new Vector();
    this.game.camera.screenToWorld(
      new Vector(this.game.width, this.game.height),
      rightBottom
    );
    leftTop.x = Math.floor(leftTop.x);
    leftTop.y = Math.floor(leftTop.y);
    rightBottom.x = Math.ceil(rightBottom.x);
    rightBottom.y = Math.ceil(rightBottom.y);
    g.context.globalAlpha = 0.1;
    g.strokeStyle("black");

    g.context.globalAlpha = 1;
    var p = this.getPosition();
    g.fillStyle("black");
    g.fillCircle(p.x, p.y, 0.1);

    if (this.item) {
      g.context.globalAlpha = 0.5;
      const tmp = new this.item({ x: p.x, y: p.y });
      if (tmp.drawBackground) {
        tmp.drawBackground(g);
      }
      if (tmp.drawForeground) {
        tmp.drawForeground(g);
      }
      g.context.globalAlpha = 1;
    }
  }
}

export default EditorState;
