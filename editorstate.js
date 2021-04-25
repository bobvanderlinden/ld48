"use strict";
import Vector from "./vector.js";

class EditorState {
  items = [];
  item = null;
  leveldef = [];
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
    this.game.chains.draw.push(this.draw);
    this.game.on("mousedown", this.mousedown);
    this.game.on("keydown", this.keydown);
    this.game.chains.update.push(this.update);
    this.game.chains.update.remove(this.game.chains.update.camera);
    this.game.chains.update.remove(this.game.chains.update.objects);
  }

  disable() {
    console.log("disable editor");
    this.game.chains.draw.remove(this.draw);
    this.game.removeListener("mousedown", this.mousedown);
    this.game.removeListener("keydown", this.keydown);
    this.game.chains.update.remove(this.update);
    this.game.chains.update.push(this.game.chains.update.camera);
    this.game.chains.update.push(this.game.chains.update.objects);
  }

  update(dt, next) {
    const movement = new Vector(
      (this.game.keys.right ? 1 : 0) - (this.game.keys.left ? 1 : 0),
      (this.game.keys.up ? 1 : 0) - (this.game.keys.down ? 1 : 0)
    );
    this.game.camera.x += movement.x * dt * 10;
    this.game.camera.y += movement.y * dt * 10;
    this.game.objects.handlePending();
    next(dt);
  }

  createLevel() {
    return {
      name: "level",
      objects: this.leveldef.map(
        ([item, x, y]) =>
          new item({
            x,
            y,
          })
      ),
      clone: this.createLevel.bind(this),
      nextLevel: this.createLevel.bind(this),
    };
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
    this.leveldef.push([this.item, p.x, p.y]);
    this.game.objects.add(
      new this.item({
        x: p.x,
        y: p.y,
      })
    );
  }

  deleteItem() {
    var p = this.getPosition();
    const obj = this.getCell(p.x, p.y);
    obj.forEach((o) => o.destroy());
    this.leveldef = this.leveldef.filter(([, x, y]) => x !== p.x || y !== p.y);
  }

  load() {
    this.leveldef = [];
    for (const obj of this.game.objects.lists.export) {
      this.leveldef.push([obj.constructor, obj.position.x, obj.position.y]);
    }
  }

  save() {
    let str = this.leveldef
      .map(([item, x, y]) => `new ${item.name}({ x: ${x}, y: ${y}}),`)
      .join("\n");
    str += "\nnew Start({ x: 0, y: 0 })";
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

  keydown(key) {
    if (key === "p") {
      this.save();
    } else if (key === "i") {
      this.load();
    } else if (key === "e") {
      this.game.changeState(this.gameplayState);
    } else if (key === "r") {
      this.game.changeLevel(this.createLevel());
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
      this.item.prototype.drawForeground.call(
        {
          position: {
            x: p.x,
            y: p.y,
          },
          velocity: {
            x: 0,
            y: 0,
          },
          image: this.item.image,
        },
        g
      );
      g.context.globalAlpha = 1;
    }
  }
}

export default EditorState;
