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
  images: ["test"],
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
  (function() {
    var timeout = setTimeout(function() {
      document.location.reload(true);
    }, 3000);
    g.once("keydown", function() {
      disable();
    });
    g.once("mousemove", function() {
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

  (function() {
    game.camera = new Vector(0, 0);

    game.camera.zoom = 1;
    game.camera.PTM = 512;
    game.camera.x = -(game.width * 0.5) / getPixelsPerMeter();
    game.camera.y = (game.height * 0.5) / getPixelsPerMeter();
    game.camera.smoothx = game.camera.x;
    game.camera.smoothy = game.camera.x;

    game.camera.screenToWorld = function(screenV, out) {
      var ptm = getPixelsPerMeter();
      out.x = screenV.x / ptm + game.camera.x;
      out.y = screenV.y / ptm - game.camera.y;
    };

    game.camera.worldToScreen = function(worldV, out) {
      var ptm = getPixelsPerMeter();
      out.x = (worldV.x - game.camera.x) * ptm;
      out.y = (worldV.y - game.camera.y) * ptm * -1;
    };

    game.camera.getPixelsPerMeter = getPixelsPerMeter;

    function getPixelsPerMeter() {
      return game.camera.PTM / game.camera.zoom;
    }

    game.camera.reset = function() {
      updateCamera();
      game.camera.x = game.camera.targetx;
      game.camera.y = game.camera.targety;
      game.camera.smoothx = game.camera.x;
      game.camera.smoothy = game.camera.y;
    };

    var pattern;

    function drawCamera(g, next) {
      // var ptm = getPixelsPerMeter();

      // // Draw background.
      // // if (!pattern) {
      // //   pattern = g.context.createPattern(images.background, "repeat");
      // // }
      // g.fillStyle("white");
      // g.fillRectangle(game.camera.x, game.camera.y, game.width, game.height);

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

      // // Transform viewport to match camera.
      // g.save();
      // g.context.scale(ptm, ptm);
      // g.context.lineWidth /= ptm;
      // g.context.translate(-game.camera.x, game.camera.y);
      // next(g);
      // g.restore();

      next(g);
    }

    function updateCamera() {
      var ptm = getPixelsPerMeter(); // Follow player

      var targetx = player.position.x - (game.width * 0.5) / ptm; // center on screen except if we're at the bottom of the level, show just one empty row below the level

      var targety = Math.max(
        (game.height * 0.5) / ptm - player.position.y,
        (game.height - 1.5 * ptm) / ptm
      );
      game.camera.targetx = targetx;
      game.camera.targety = targety; // Look forward
      // targetx += player.velocity.x * 10;
      // targety += player.velocity.y * 10;
      // Smooth

      var smoothx = (game.camera.smoothx =
        0.95 * game.camera.smoothx + 0.05 * targetx);
      var smoothy = (game.camera.smoothy =
        0.95 * game.camera.smoothy + 0.05 * targety);
      game.camera.x = smoothx;
      game.camera.y = smoothy; // No smoothing
      // game.camera.x = targetx;
      // game.camera.y = targety;
    }

    g.chains.update.push(
      (g.chains.update.camera = function(dt, next) {
        next(dt);
        updateCamera();
      })
    );
    g.chains.draw.camera = drawCamera;
    g.chains.draw.insertBefore(drawCamera, g.chains.draw.objects);
  })(); // Draw objects

  (function() {
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
  game.chains.draw.push(function(g, next) {
    next(g);
    game.objects.lists.foreground.each((o) => {
      if (o.child) {
        g.strokeStyle("red");
        g.strokeLine(
          o.position.x,
          o.position.y,
          o.child.position.x,
          o.child.position.y
        );
      }
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

  (function() {
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
    constructor() {
      super({ x: 0, y: 0 });
      this.image = images["test"];
      this.velocity = new Vector(0, 0);
    }

    drawForeground(g) {
      g.save();
      g.context.translate(this.position.x, this.position.y);
      g.drawCenteredImage(this.image, 0, 0);
      g.restore();
    }

    update(dt) {}
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
        game.changeState(gameplayState());
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
  } //#states

  function gameplayState() {
    const me = {
      enabled: false,
      enable: enable,
      disable: disable,
    };

    function enable() {
      game.camera.reset();
      g.chains.draw.unshift(draw);
      g.on("keydown", keydown);
    }

    function disable() {
      g.chains.draw.remove(draw);
      g.removeListener("keydown", keydown);
    }

    function keydown(key) {
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
        game.changeState(editorState());
      }

      const movement = new Vector(
        (key === "right" ? 1 : 0) - (key === "left" ? 1 : 0),
        (key === "down" ? 1 : 0) - (key === "up" ? 1 : 0)
      );

      player.movement = movement;
    }

    function draw(g, next) {
      // Draw HUD
      next(g);
    }

    return me;
  }

  function level_sym1() {
    return {
      name: "Test",
      objects: [new Start({ x: 0, y: 0 })],
      clone: level_sym1,
      nextLevel: null,
    };
  }

  var player = new Player();
  g.changeLevel(level_sym1());
  g.changeState(gameplayState());
  game.objects.handlePending();
  g.start();
  window.game = game;
}