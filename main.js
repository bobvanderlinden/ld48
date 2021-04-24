"use strict";

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  } else {
    obj[key] = value;
  }
  return obj;
}

import platform from "./platform.js";
import Game from "./game.js";
import Vector from "./vector.js";
import state from "./state.js";
import level from "./level.js";
import mouse from "./mouse.js";
import collision from "./collision.js";
import keyboard from "./keyboard.js";
import quake from "./quake.js";
import resources from "./resources.js";
var rs = {
  images: ["test", "clown", "submarine"],
  audio: ["test"],
};
var g, game;
platform.once("load", () => {
  var canvas = document.getElementById("main");
  game = g = new Game(startGame, canvas, [
    mouse,
    keyboard,
    resources(rs),
    state,
    level,
    collision,
    quake,
  ]);
  g.resources.status.on("changed", () => {
    g.graphics.context.clearRect(0, 0, game.width, game.height);
    g.graphics.context.fillStyle = "black";
    g.graphics.context.font = "arial";
    g.graphics.fillCenteredText(
      `Preloading ${g.resources.status.ready} / ${g.resources.status.total}...`,
      400,
      300
    );
  });
});

function startGame(err) {
  if (err) {
    console.error(err);
  }

  var images = g.resources.images;
  var audio = g.resources.audio;
  g.objects.lists.collidable = g.objects.createIndexList("collidable");
  g.objects.lists.start = g.objects.createIndexList("start");
  g.objects.lists.shadow = g.objects.createIndexList("shadow");
  g.objects.lists.background = g.objects.createIndexList("background");
  g.objects.lists.foreground = g.objects.createIndexList("foreground");
  g.objects.lists.grounded = g.objects.createIndexList("grounded");
  g.objects.lists.export = g.objects.createIndexList("export");
  g.objects.lists.cell = g.objects.createIndexList("cell");
  g.objects.lists.editorVisible = g.objects.createIndexList("editorVisible");

  function pickRandom(arr) {
    return arr[(arr.length * Math.random()) | 0];
  }

  // Auto-refresh
  (function () {
    var timeout = setTimeout(function () {
      document.location.reload(true);
    }, 3000);
    g.once("keydown", function () {
      disable();
    });
    g.once("mousemove", function () {
      disable();
    });
    g.chains.draw.unshift(draw);
    function draw(g, next) {
      g.fillStyle("#ff0000");
      g.fillCircle(game.width, 0, 30);
      g.fillStyle("black");
      next(g);
    }
    function disable() {
      clearTimeout(timeout);
      g.chains.draw.remove(draw);
    }
  })();

  // Camera

  (function () {
    game.camera = new Vector(0, 0);

    game.camera.zoom = 1;

    game.camera.screenToWorld = function (screenV, out) {
      var ptm = getPixelsPerMeter();
      out.x = (screenV.x - game.width * 0.5) / ptm + game.camera.x;
      out.y = (screenV.y - game.height * 0.5) / ptm + game.camera.y;
    };

    // Broken:
    // game.camera.worldToScreen = function(worldV, out) {
    //   var ptm = getPixelsPerMeter();
    //   out.x = (worldV.x - game.camera.x) * ptm;
    //   out.y = (worldV.y - game.camera.y) * ptm * -1;
    // };

    game.camera.getPixelsPerMeter = getPixelsPerMeter;

    function getPixelsPerMeter() {
      const worldWidth = 2048;
      const screenWidth = game.width;
      const fraction = screenWidth / worldWidth;
      return fraction / game.camera.zoom;
    }

    game.camera.reset = function () {
      updateCamera();
      game.camera.x = 0;
      game.camera.y = 0;
    };

    function drawCamera(g, next) {
      var ptm = getPixelsPerMeter();

      // Draw background.
      // if (!pattern) {
      //   pattern = g.context.createPattern(images.background, "repeat");
      // }
      g.fillStyle("gray");
      g.fillRectangle(0, 0, game.width, game.height);

      // g.save();
      // g.context.translate(-game.camera.x * ptm, game.camera.y * ptm);
      // g.fillStyle(pattern);
      // g.fillRectangle(
      //   game.camera.x * ptm,
      //   -game.camera.y * ptm,
      //   game.width,
      //   game.height
      // );
      // g.restore();

      // const debugPosition = game.mouse;

      // g.strokeStyle("yellow");
      // g.strokeCircle(debugPosition.x, debugPosition.y, 10);

      // Transform viewport to match camera.
      g.save();
      g.context.scale(ptm, ptm);
      g.context.lineWidth /= ptm;
      g.context.translate((game.width / ptm) * 0.5, (game.height / ptm) * 0.5);

      g.context.translate(game.camera.x, -game.camera.y);

      g.strokeStyle("green");
      g.strokeRectangle(-512, 0, 1024, 1024);

      // const a = new Vector(0, 0);
      // game.camera.screenToWorld(debugPosition, a);
      // g.fillStyle("green");
      // g.fillCircle(a.x, a.y, 20);

      next(g);
      g.restore();
    }

    function updateCamera() {}

    g.chains.update.push(
      (g.chains.update.camera = function (dt, next) {
        next(dt);
        updateCamera();
      })
    );
    g.chains.draw.camera = drawCamera;
    g.chains.draw.insertBefore(drawCamera, g.chains.draw.objects);
  })();

  // Touching
  (function () {
    g.objects.lists.touchable = g.objects.createIndexList("touchable");
    g.chains.update.insertBefore(function (dt, next) {
      next(dt);
      g.objects.lists.touchable.each(function (ta) {
        g.objects.lists.touchable.each(function (tb) {
          detectTouch(ta, tb);
        });
        if (ta.touching) {
          ta.touching.forEach(function (tb) {
            detectTouch(ta, tb);
          });
        }
      });
    }, g.chains.update.objects);

    function detectTouch(ta, tb) {
      if (ta === tb) {
        return;
      }
      var areTouching =
        ta._objectmanager &&
        tb._objectmanager &&
        ta.position.distanceToV(tb.position) <= ta.touchRadius + tb.touchRadius;
      handleTouch(ta, tb, areTouching);
      handleTouch(tb, ta, areTouching);
    }

    function handleTouch(o, other, areTouching) {
      if (!o.touching) {
        o.touching = new Set();
      }
      var wereTouching = o.touching.has(other);
      if (areTouching !== wereTouching) {
        if (areTouching) {
          o.touching.add(other);
          if (o.touch) {
            o.touch(other);
          }
        } else {
          o.touching.delete(other);
          if (o.untouch) {
            o.untouch(other);
          }
        }
      }
    }
  })();

  (function () {
    game.chains.draw.push((g, next) => {
      game.objects.lists.background.each((o) => {
        o.drawBackground(g);
      });
      game.objects.lists.foreground.each((o) => {
        o.drawForeground(g);
      });
      next(g);
    });
  })();

  // Draw debug objects
  game.chains.draw.push(function (g, next) {
    next(g);
    game.objects.lists.touchable.each((o) => {
      g.strokeStyle("red");
      g.strokeCircle(o.position.x, o.position.y, o.touchRadius);
    });
  });
  // (function() {
  //   game.chains.draw.insertAfter(function(g, next) {
  //     next(g);
  //     game.objects.objects.each(function(o) {
  //       g.strokeStyle("red");
  //       g.strokeCircle(o.position.x, o.position.y, o.touchRadius || 10);
  //     });
  //     for (let y = -10; y < 10; y++) {
  //       for (let x = -10; x < 10; x++) {
  //         g.strokeCircle(x, y, 0.5);
  //       }
  //     }
  //   }, game.chains.draw.camera);
  // })();
  //#gameobjects

  // Player

  class Start {
    constructor({ x, y }) {
      this.position = new Vector(x, y);
    }

    start() {
      if (this.spawned) {
        return;
      }

      player = new Player({
        x: this.position.x,
        y: this.position.y,
      });
      game.objects.add(player);
      this.spawned = true;
    }

    drawForeground(g) {
      g.fillStyle("red");
      g.fillCircle(this.position.x, this.position.y, 0.3);
    }
  }

  _defineProperty(Start, "editorVisible", true);

  (function () {
    g.on("levelchanged", () => {
      game.objects.objects.each((o) => {
        if (o.start) {
          o.start();
        }
      });
    });
  })();

  class GameObject {
    constructor({ x, y }) {
      this.position = new Vector(x, y);
    }
  }

  class Player extends GameObject {
    sinkRate = 200;
    touchable = true;
    touchRadius = 150;

    constructor() {
      super({ x: 0, y: 0 });
      this.image = images["submarine"];
      this.velocity = new Vector(0, 0);
      this.flipped = false;
    }

    drawForeground(g) {
      g.save();
      g.context.translate(this.position.x, this.position.y);
      g.context.scale(this.flipped ? -1 : 1, 1);
      g.drawCenteredImage(this.image, 0, 0);
      g.restore();
    }

    update(dt) {
      const mousePosition = new Vector(0, 0);
      game.camera.screenToWorld(game.mouse, mousePosition);

      if (this.position.x !== mousePosition.x) {
        this.flipped = this.position.x > mousePosition.x;
      }

      this.position.x = mousePosition.x;
      this.position.y += dt * this.sinkRate;
    }

    touch(other) {
      console.log("touch");
      if (other instanceof Fish) {
        game.changeState(new LoseState());
      }
    }
  }

  function toRadians(angle) {
    return angle * (Math.PI / 180);
  }

  class Fish extends GameObject {
    updatable = true;
    foreground = true;
    touchable = true;
    touchRadius = 100;
    constructor({ x, y }) {
      super(...arguments);
      this.startPosition = { x: x, y: y };
      this.relativePosition = { x: 0, y: 0 };
      this.image = images["fish"];
      this.size = { width: 1, height: 1 };
      this.angle = 180; // With real degree stuff
      this.boundaries = { left: 500, right: 500, top: 0, bottom: 0 };
      this.speed = 400;
    }
    update(dt) {
      this.relativePosition.x +=
        dt * this.speed * Math.cos(toRadians(this.angle));
      this.relativePosition.y +=
        Math.sin(toRadians(this.angle)) * dt * this.speed;

      if (
        this.startPosition.x + this.boundaries.right <
        this.relativePosition.x
      ) {
        this.angle = 180;
        this.relativePosition.x +=
          this.startPosition.x +
          this.boundaries.right -
          this.relativePosition.x;
      } else if (
        this.startPosition.x - this.boundaries.left >
        this.relativePosition.x
      ) {
        this.angle = 0;
        this.relativePosition.x +=
          this.startPosition.x - this.boundaries.left - this.relativePosition.x;
      }

      // if (this.startPosition.y - this.boundaries.top > this.relativePosition.y) {
      //   this.angle = -this.angle;

      //   // TOOD: hier moeten we flippen naar links en movement omdraaien
      // } else if (this.startPosition.x + this.boundaries.bottom < this.relativePosition.y) {
      //   this.angle = -this.angle;

      //   // TODO: Flip angle en restant movement
      // }
      this.position = new Vector(
        this.startPosition.x + this.relativePosition.x,
        this.startPosition.y + this.relativePosition.y
      );
    }
    drawForeground(g) {
      g.save();
      g.context.translate(this.position.x, this.position.y);
      g.context.scale(this.angle === 0 ? -1 : 1, 1);
      g.drawCenteredImage(this.image, 0, 0);
      g.restore();
    }
  }

  class ClownFish extends Fish {
    constructor(...args) {
      super(...args);
      this.image = images["clown"];
      this.size = { width: 1, height: 1 };
    }
  }

  class FootballFish extends Fish {
    constructor() {
      super({ x: 10, y: 5 });
      this.image = images["football"];
      this.size = { width: 2, height: 2 };
    }
  }

  _defineProperty(Player, "updatable", true);

  _defineProperty(Player, "foreground", true);

  // #editor

  const items = [Start];
  let item = items[0];
  let leveldef = [];

  function editorState() {
    const me = {
      enable,
      disable,
    };

    function enable() {
      console.log("enable editor");
      game.chains.draw.push(draw);
      g.on("mousedown", mousedown);
      g.on("keydown", keydown);
      g.chains.update.push(update);
      g.chains.update.remove(game.chains.update.camera);
      g.chains.update.remove(game.chains.update.objects);
    }

    function disable() {
      console.log("disable editor");
      game.chains.draw.remove(draw);
      g.removeListener("mousedown", mousedown);
      g.removeListener("keydown", keydown);
      g.chains.update.remove(update);
      g.chains.update.push(game.chains.update.camera);
      g.chains.update.push(game.chains.update.objects);
    }

    function update(dt, next) {
      const movement = new Vector(
        (game.keys.right ? 1 : 0) - (game.keys.left ? 1 : 0),
        (game.keys.up ? 1 : 0) - (game.keys.down ? 1 : 0)
      );
      game.camera.x += movement.x * dt * 10;
      game.camera.y += movement.y * dt * 10;
      game.objects.handlePending();
      next(dt);
    }

    function createLevel() {
      return {
        name: "level",
        objects: leveldef.map(
          ([item, x, y]) =>
            new item({
              x,
              y,
            })
        ),
        clone: createLevel,
        nextLevel: createLevel,
      };
    }

    function getPosition() {
      var tmp = new Vector();
      game.camera.screenToWorld(game.mouse, tmp);
      tmp.x = Math.round(tmp.x);
      tmp.y = Math.round(tmp.y);
      return tmp;
    }

    function place() {
      var p = getPosition();
      leveldef.push([item, p.x, p.y]);
      game.objects.add(
        new item({
          x: p.x,
          y: p.y,
        })
      );
    }

    function deleteItem() {
      var p = getPosition();
      const obj = getCell(p.x, p.y);
      obj.forEach((o) => o.destroy());
      leveldef = leveldef.filter(([_, x, y]) => x !== p.x || y !== p.y);
    }

    function load() {
      leveldef = [];
      game.objects.lists.export.each((obj) => {
        leveldef.push([obj.constructor, obj.position.x, obj.position.y]);
      });
    }

    function save() {
      let str = leveldef
        .map(([item, x, y]) => `new ${item.name}({ x: ${x}, y: ${y}}),`)
        .join("\n");
      str += "\nnew Start({ x: 2, y: -1 })";
      console.log(str);
    }

    function mousedown(button) {
      if (button === 0) {
        place();
      } else if (button === 2) {
        deleteItem();
      }
    }

    function keydown(key) {
      if (key === "p") {
        save();
      } else if (key === "i") {
        load();
      } else if (key === "e") {
        game.changeState(new GameplayState());
      } else if (key === "r") {
        game.changeLevel(createLevel());
      }

      var d = (key === "]" ? 1 : 0) - (key === "[" ? 1 : 0);
      item = items[(items.indexOf(item) + d + items.length) % items.length];
    }

    function draw(g, next) {
      next(g);
      game.objects.lists.editorVisible.each((o) => {
        o.drawForeground(g);
      });
      const leftTop = new Vector();
      game.camera.screenToWorld(Vector.zero, leftTop);
      const rightBottom = new Vector();
      game.camera.screenToWorld(
        new Vector(game.width, game.height),
        rightBottom
      );
      leftTop.x = Math.floor(leftTop.x);
      leftTop.y = Math.floor(leftTop.y);
      rightBottom.x = Math.ceil(rightBottom.x);
      rightBottom.y = Math.ceil(rightBottom.y);
      g.context.globalAlpha = 0.1;
      g.strokeStyle("black");

      for (let x = leftTop.x; x < rightBottom.x; x++) {
        g.strokeLine(x - 0.5, leftTop.y, x - 0.5, rightBottom.y);
      }

      for (let y = leftTop.y; y < rightBottom.y; y++) {
        g.strokeLine(leftTop.x, y - 0.5, rightBottom.x, y - 0.5);
      }

      g.context.globalAlpha = 1;
      var p = getPosition();
      g.fillStyle("black");
      g.fillCircle(p.x, p.y, 0.1);

      if (item) {
        g.context.globalAlpha = 0.5;
        item.prototype.drawForeground.call(
          {
            position: {
              x: p.x,
              y: p.y,
            },
            tile: item.tile,
          },
          g
        );
        g.context.globalAlpha = 1;
      }
    }

    return me;
  } // draw responsive image which keeps to canvas boundaries

  function drawOverlayImage(g, image) {
    g.save();
    const scaleX = game.width / image.width;
    const scaleY = game.height / image.height;
    const scale = Math.min(scaleX, scaleY);
    g.context.scale(scale, scale);
    g.drawCenteredImage(image, game.width / 2 / scale, game.height / 2 / scale);
    g.restore();
  }

  //#states

  class GameplayState {
    constructor() {
      this.draw = this.draw.bind(this);
      this.update = this.update.bind(this);
      this.keydown = this.keydown.bind(this);
    }

    enable() {
      game.camera.reset();
      g.chains.draw.unshift(this.draw);
      g.chains.update.push(this.update);
      g.on("keydown", this.keydown);
    }

    disable() {
      g.chains.draw.remove(this.draw);
      g.chains.update.remove(this.update);
      g.removeListener("keydown", this.keydown);
    }

    keydown(key) {
      if (key === "r") {
        game.restartLevel();
        return;
      } else if (key === "n") {
        game.nextLevel();
        return;
      } else if (key === "m") {
        game.changeLevel(level_sym1());
        return;
      } else if (key === "e") {
        game.changeState(new EditorState());
      }

      const movement = new Vector(
        (key === "right" ? 1 : 0) - (key === "left" ? 1 : 0),
        (key === "down" ? 1 : 0) - (key === "up" ? 1 : 0)
      );

      player.movement = movement;
    }

    update(dt) {
      game.camera.y = player.position.y;
    }

    draw(g, next) {
      // Draw HUD
      next(g);
    }
  }

  function level_sym1() {
    return {
      name: "Test",
      objects: [new Start({ x: 0, y: 0 }), new ClownFish({ x: 0, y: 500 })],
      clone: level_sym1,
      nextLevel: null,
    };
  }

  class LoseState {
    constructor() {
      this.draw = this.draw.bind(this);
      this.mousedown = this.mousedown.bind(this);
      this.update = this.update.bind(this);
    }

    enable() {
      g.chains.draw.unshift(this.draw);
      g.chains.update.unshift(this.update);
      g.on("mousedown", this.mousedown);
    }

    disable() {
      g.chains.draw.remove(this.draw);
      g.chains.update.remove(this.update);
      g.removeListener("mousedown", this.mousedown);
    }

    draw(g, next) {
      next(g);
      g.fillStyle("black");
      g.fillText("You killed a fish", game.width * 0.5, game.height * 0.5);
    }

    mousedown() {
      g.restartLevel();
      g.changeState(new GameplayState());
    }

    update(dt, next) {
      // Avoid updating the game.
      //
    }
  }

  var player = new Player();
  g.changeLevel(level_sym1());
  g.changeState(new GameplayState());
  game.objects.handlePending();
  g.start();
  window.game = game;
}
