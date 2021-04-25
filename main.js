"use strict";
import platform from "./platform.js";
import Game from "./game.js";
import Vector from "./vector.js";
import state from "./state.js";
import LevelSystem from "./levelsystem.js";
import mouse from "./mouse.js";
import collision from "./collision.js";
import keyboard from "./keyboard.js";
import quake from "./quake.js";
import resources from "./resources.js";
import TouchSystem from "./touchsystem.js";
import Camera from "./camera.js";
import AutoRefresh from "./autorefresh.js";
import Mouse from "./mouse.js";

var rs = {
  audio: ["test"],
  images: [
    "test",
    "clown",
    "submarine",
    "octopus_0",
    "octopus_1",
    "octopus_2",
    "football",
    "treasure",
    "seahorse",
    "bubbles",
    "lost",
    "won",
    "background",
    "air",
  ],
};
var g, game;
platform.once("load", () => {
  var canvas = document.getElementById("main");
  game = g = new Game(startGame, canvas, [
    keyboard,
    resources(rs),
    state,
    collision,
    quake,
  ]);

  game.mouse = new Mouse({ game });

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
  g.objects.lists.end = g.objects.createIndexList("end");
  g.objects.lists.editorVisible = g.objects.createIndexList("editorVisible");

  function pickRandom(arr) {
    return arr[(arr.length * Math.random()) | 0];
  }

  // Auto-refresh
  game.autoRefresh = new AutoRefresh({ game });
  game.autoRefresh.enable();

  // Camera
  game.camera = new Camera({ game });

  // Touching
  game.touchSystem = new TouchSystem({ game, debug: false });

  game.levelSystem = new LevelSystem({ game });

  game.chains.draw.push((g, next) => {
    g.save();
    g.context.translate(-1024, 0);
    g.context.scale(5, 5);

    g.context.fillStyle = "#0fb0fe";
    g.context.fillRect(0, 0, 2048, 9999999);

    g.context.fillStyle = g.context.createPattern(
      images["background"],
      "repeat"
    );
    g.context.fillRect(0, 0, 2048, 9999999);

    g.context.scale(0.2, 0.2);
    g.save();
    g.context.translate(0, (game.time * -200) % images["bubbles"].height);
    g.context.fillStyle = g.context.createPattern(images["bubbles"], "repeat");
    g.context.fillRect(0, 0, 2048, 9999999);
    g.restore();

    g.drawCenteredImage(images["air"], 1024, -images["air"].height / 2 + 64);

    g.restore();
    next(g);
  });

  (function () {
    game.chains.draw.push((g, next) => {
      for (const o of game.objects.lists.background) {
        o.drawBackground(g);
      }
      for (const o of game.objects.lists.foreground) {
        o.drawForeground(g);
      }
      next(g);
    });
  })();

  //#gameobjects

  // Player
  class GameObject {
    constructor({ x, y }) {
      this.position = new Vector(x, y);
    }
  }

  class Start extends GameObject {
    start = true;
  }

  class Player extends GameObject {
    updatable = true;
    touchable = true;
    foreground = true;
    sinkRate = 200;
    maxSpeed = 500;
    touchable = true;
    touchRadius = 150;

    constructor({ x, y }) {
      super({ x, y });
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

      // Movement
      const difference = mousePosition.x - this.position.x;
      const direction = Math.sign(difference);
      const distance = Math.abs(difference);
      const moving = distance > 50;
      const speed = moving ? this.maxSpeed : 0;
      this.flipped = moving ? direction < 0 : this.flipped;
      this.velocity.x = this.velocity.x * 0.9 + direction * speed * 0.1;
      this.velocity.y = this.sinkRate;
      this.position.addV(this.velocity.clone().multiply(dt));
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

  class Boundaries {
    constructor(top, right, bottom, left) {
      this.top = top;
      this.right = right;
      this.bottom = bottom;
      this.left = left;
      if (top > 0) {
        console.error("top should be negative of zero");
      }
      if (left > 0) {
        console.error("top should be negative of zero");
      }
      if (bottom < 0) {
        console.error("top should be positive of zero");
      }
      if (right < 0) {
        console.error("right should be positive of zero");
      }
    }
  }
  class Fish extends GameObject {
    updatable = true;
    foreground = true;
    touchable = true;
    touchRadius = 100;

    constructor(x, y, angle, speed) {
      super(...arguments);
      this.startPosition = new Vector(x, y);
      this.relativePosition = new Vector(0, 0);
      this.image = images["fish"];
      this.size = { width: 1, height: 1 };
      this.boundaries = new Boundaries(0, 500, 0, -500);
      this.velocity = this.angleAndSpeedtoVector(angle, speed);
    }

    angleAndSpeedtoVector(angle, speed) {
      let y = Math.sin(toRadians(angle)) * speed;
      let x = Math.cos(toRadians(angle)) * speed;
      return new Vector(x, y);
    }

    update(dt) {
      let velocity = this.velocity.clone();
      this.relativePosition.addV(velocity.multiply(dt));

      if (
        this.relativePosition.x > this.boundaries.right ||
        this.relativePosition.x < this.boundaries.left
      ) {
        this.velocity.x *= -1;
      }
      this.position = this.startPosition.clone().addV(this.relativePosition);
    }
    drawForeground(g) {
      g.save();
      g.context.translate(this.position.x, this.position.y);
      g.context.scale(this.velocity.x < 0 ? 1 : -1, 1);
      g.drawCenteredImage(this.image, 0, 0);
      g.restore();
    }
  }

  class ClownFish extends Fish {
    constructor(x, y, angle, speed, { top, right, bottom, left }) {
      super(x, y, angle, speed);
      this.image = images["clown"];
      this.size = { width: 1, height: 1 };
      this.boundaries = new Boundaries(top, right, bottom, left);
    }
  }

  class FootballFish extends Fish {
    constructor(x, y) {
      super(x, y, 45, 200);
      this.image = images["football"];
      this.size = { width: 2, height: 2 };
      this.boundaries = new Boundaries(-100, 800, 100, -800);
    }
    update(dt) {
      let velocity = this.velocity.clone();
      this.relativePosition.addV(velocity.multiply(dt));

      if (
        this.relativePosition.x > this.boundaries.right ||
        this.relativePosition.x < this.boundaries.left
      ) {
        this.velocity.x *= -1;
      }
      if (
        this.relativePosition.y < this.boundaries.top ||
        this.relativePosition.y > this.boundaries.bottom
      ) {
        this.velocity.y *= -1;
      }
      this.position = this.startPosition.clone().addV(this.relativePosition);
    }
    drawForeground(g) {
      g.save();
      g.context.translate(this.position.x, this.position.y);
      g.context.scale(this.velocity.x < 0 ? 1 : -1, 1);
      g.context.rotate(
        this.velocity.x < 0
          ? this.velocity.angle() + Math.PI
          : this.velocity.angle() * -1
      );
      g.drawCenteredImage(this.image, 0, 0);
      g.restore();
    }
  }

  class Octopus extends Fish {
    constructor(x, y) {
      super(x, y, 15, 300);
      this.image = images["octopus_0"];
      this.size = { width: 1, height: 1 };
      this.boundaries = new Boundaries(-200, 200, 200, -200);
      this.frame = 0;
    }
    update(dt) {
      this.frame += dt * 2;
      this.image = images[`octopus_${Math.round(this.frame) % 3}`];
      let velocity = this.velocity.clone();
      this.relativePosition.addV(velocity.multiply(dt));

      if (
        this.relativePosition.x > this.boundaries.right ||
        this.relativePosition.x < this.boundaries.left
      ) {
        this.velocity.x *= -1;
      }
      if (
        this.relativePosition.y < this.boundaries.top ||
        this.relativePosition.y > this.boundaries.bottom
      ) {
        this.velocity.y *= -1;
      }
      this.position = this.startPosition.clone().addV(this.relativePosition);
    }
    drawForeground(g) {
      g.save();
      g.context.translate(this.position.x, this.position.y);
      g.context.scale(this.velocity.x < 0 ? -1 : 1, 1);
      g.drawCenteredImage(this.image, 0, 0);
      g.restore();
    }
  }

  class Seahorse extends Fish {
    //TODO: give rect collision please :)
    constructor(x, y) {
      super(x, y, 0, 200);
      this.image = images["seahorse"];
      this.boundaries = new Boundaries(0, 1400, 0, -1400);
    }
    update(dt) {
      let velocity = this.velocity.clone();
      this.relativePosition.addV(velocity.multiply(dt));

      if (this.relativePosition.x > this.boundaries.right) {
        this.relativePosition.x = this.boundaries.left;
      }
      this.position = this.startPosition.clone().addV(this.relativePosition);
    }
    drawForeground(g) {
      g.save();
      g.context.translate(this.position.x, this.position.y);
      g.context.scale(1, 1);
      g.drawCenteredImage(this.image, 0, 0);
      g.restore();
    }
  }

  class WavyFish extends GameObject {
    touchable = true;
    updatable = true;
    foreground = true;
    touchRadius = 100;
    patrolInterval = 4;
    waveInterval = 2;
    phase = 300;
    speed = 300;
    constructor(...args) {
      super(...args);
      this.velocity = new Vector(0, 0);
      this.lifetime = 0;
      this.direction = 1;
    }

    update(dt) {
      this.lifetime += dt;
      this.direction =
        ((Math.floor(this.lifetime / this.patrolInterval) % 2) - 0.5) * 2;
      this.velocity = Vector.xaxis
        .clone()
        .rotate(Math.sin((this.lifetime * (Math.PI * 2)) / this.waveInterval));
      this.velocity.x *= this.speed * this.direction;
      this.velocity.y *= this.phase * this.direction;

      this.position.addV(this.velocity.clone().multiply(dt));
    }

    drawForeground(g) {
      g.save();
      g.context.translate(this.position.x, this.position.y);
      g.context.rotate(this.velocity.angle());
      g.context.scale(this.direction, this.direction);
      g.drawCenteredImage(images.clown, 0, 0);
      g.restore();
    }
  }

  class Treasure extends GameObject {
    end = true;
    background = true;
    constructor({ x, y }) {
      super({ x, y });
      this.image = images["treasure"];
    }

    get bottom() {
      return this.position.y + this.image.height * 0.5;
    }

    drawBackground(g) {
      g.drawCenteredImage(this.image, this.position.x, this.position.y);
    }
  }

  // draw responsive image which keeps to canvas boundaries

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
    constructor({ game }) {
      this.game = game;
      this.draw = this.draw.bind(this);
      this.update = this.update.bind(this);
      this.keydown = this.keydown.bind(this);
      this.levelchanged = this.levelchanged.bind(this);
    }

    enable() {
      this.game.camera.reset();
      this.game.chains.draw.unshift(this.draw);
      this.game.chains.update.push(this.update);
      this.game.on("keydown", this.keydown);
      this.game.on("levelchanged", this.levelchanged);

      console.log(game.objects.lists.start);
      const start = game.objects.lists.start.first;
      if (this.start !== start) {
        this.spawnPlayer(start);
      }
    }

    disable() {
      this.game.chains.draw.remove(this.draw);
      this.game.chains.update.remove(this.update);
      this.game.removeListener("keydown", this.keydown);
      this.game.removeListener("levelchanged", this.levelchanged);
    }

    levelchanged() {
      const start = game.objects.lists.start.first;
      this.spawnPlayer(start);
    }

    spawnPlayer(start) {
      this.start = start;
      const player = new Player({
        x: start.position.x,
        y: start.position.y,
      });
      this.player = player;
      game.objects.add(player);
    }

    keydown(key) {
      if (key === "r") {
        this.game.levelSystem.restartLevel();
        return;
      } else if (key === "n") {
        this.game.levelSystem.nextLevel();
        return;
      } else if (key === "m") {
        this.game.levelSystem.changeLevel(level_sym1());
        return;
      } else if (key === "e") {
        this.game.levelSystem.changeState(new EditorState());
      }

      const movement = new Vector(
        (key === "right" ? 1 : 0) - (key === "left" ? 1 : 0),
        (key === "down" ? 1 : 0) - (key === "up" ? 1 : 0)
      );

      this.player.movement = movement;
    }

    update(dt) {
      const end = [...game.objects.lists.end][0];
      game.camera.y = Math.min(
        this.player.position.y,
        end.bottom - (game.height * 0.5) / game.camera.getPixelsPerMeter()
      );

      if (this.player.position.y > end.position.y) {
        game.changeState(new WinState());
      }
    }

    draw(g, next) {
      // Draw HUD
      next(g);
    }
  }

  function level_sym1() {
    return {
      name: "Level 1",
      objects: [
        new Start({ x: 0, y: 0 }),
        new ClownFish(300, 800, 180, 300, {
          top: 0,
          right: 200,
          bottom: 0,
          left: -500,
        }),
        new ClownFish(80, 3000, 180, 300, {
          top: 0,
          right: 500,
          bottom: 0,
          left: -500,
        }),
        new ClownFish(160, 2800, 180, 320, {
          top: 0,
          right: 500,
          bottom: 0,
          left: -500,
        }),
        new ClownFish(80, 2600, 180, 300, {
          top: 0,
          right: 500,
          bottom: 0,
          left: -500,
        }),
        new ClownFish(-20, 4600, 0, 300, {
          top: 0,
          right: 500,
          bottom: 0,
          left: -500,
        }),
        new ClownFish(60, 4400, 0, 320, {
          top: 0,
          right: 500,
          bottom: 0,
          left: -500,
        }),
        new ClownFish(-20, 4200, 0, 300, {
          top: 0,
          right: 500,
          bottom: 0,
          left: -500,
        }),
        new Treasure({ x: 0, y: 6000 }),
      ],
      clone: level_sym1,
      nextLevel: level_sym2,
    };
  }

  function level_sym2() {
    return {
      name: "Level 2",
      objects: [
        new Start({ x: 0, y: 0 }),
        new WavyFish({ x: 500, y: 1000 }),
        new ClownFish(300, 1000),
        new Octopus(60, 2000),
        new FootballFish(80, 3000),
        new Seahorse(200, 4000),
        new Treasure({ x: 0, y: 4500 }),
      ],
      clone: level_sym2,
      nextLevel: null,
    };
  }
  class WinState {
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

      g.save();
      g.context.translate(game.width * 0.5, game.height * 0.5);
      const ppm = game.camera.getPixelsPerMeter();
      g.context.scale(ppm, ppm);
      g.drawCenteredImage(images["won"], 0, 0);
      g.restore();
    }

    mousedown() {
      game.levelSystem.nextLevel();
      game.changeState(new GameplayState({ game }));
    }

    update(dt, next) {
      // Avoid updating the game.
      //
    }
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

      g.save();
      g.context.translate(game.width * 0.5, game.height * 0.5);
      const ppm = game.camera.getPixelsPerMeter();
      g.context.scale(ppm, ppm);
      g.drawCenteredImage(images["lost"], 0, 0);
      g.restore();
    }

    mousedown() {
      game.restartLevel();
      game.changeState(new GameplayState({ game }));
    }

    update(dt, next) {
      // Avoid updating the game.
      //
    }
  }

  game.levelSystem.changeLevel(level_sym1());
  game.objects.handlePending();
  game.changeState(new GameplayState({ game }));
  game.start();
  window.game = game;
}
