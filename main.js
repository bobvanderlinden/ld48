"use strict";
import platform from "./platform.js";
import Game from "./game.js";
import Vector from "./vector.js";
import state from "./state.js";
import LevelSystem from "./levelsystem.js";
import collision from "./collision.js";
import keyboard from "./keyboard.js";
import quake from "./quake.js";
import resources from "./resources.js";
import TouchSystem from "./touchsystem.js";
import Camera from "./camera.js";
import AutoRefresh from "./autorefresh.js";
import Mouse from "./mouse.js";
import EditorState from "./editorstate.js";

var rs = {
  audio: [
    "test",
    "ambient",
    "sploosh",
    "fish_dead",
    "sonar_2",
    "treasure_found",
  ],
  images: [
    "test",
    "clown",
    "submarine",
    "octopus_0",
    "octopus_1",
    "octopus_2",
    "football",
    "treasure",
    "treasure_closed",
    "seahorse",
    "bubbles",
    "lost",
    "won",
    "background",
    "background_2",
    "air",
    "begin",
    "end",
    "starfish",
    "jelly",
    "white_bubble",
    "splash_1",
    "splash_2",
    "splash_3",
    "splash_4",
    "splash_5",
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
  // var audio = g.resources.audio;
  g.objects.lists.collidable = g.objects.createIndexList("collidable");
  g.objects.lists.start = g.objects.createIndexList("start");
  g.objects.lists.shadow = g.objects.createIndexList("shadow");
  g.objects.lists.background = g.objects.createIndexList("background");
  g.objects.lists.foreground = g.objects.createIndexList("foreground");
  g.objects.lists.grounded = g.objects.createIndexList("grounded");
  g.objects.lists.export = g.objects.createIndexList("export");
  g.objects.lists.end = g.objects.createIndexList("end");
  g.objects.lists.editorVisible = g.objects.createIndexList("editorVisible");
  g.objects.lists.player = g.objects.createIndexList("player");

  // function pickRandom(arr) {
  //   return arr[(arr.length * Math.random()) | 0];
  // }

  // Auto-refresh
  game.autoRefresh = new AutoRefresh({ game });
  // game.autoRefresh.enable();

  // Camera
  game.camera = new Camera({ game });

  // Touching
  game.touchSystem = new TouchSystem({ game, debug: false });

  game.levelSystem = new LevelSystem({ game });

  function drawTiled(g, image, offset = 0) {
    const screenHeight = game.height / game.camera.getPixelsPerMeter();
    const screenTop = game.camera.y - screenHeight * 0.5;
    const screenBottom = game.camera.y + screenHeight * 0.5;
    const tilingTop =
      (Math.floor(screenTop / image.height) - 1) * image.height +
      (offset % image.height);
    for (let y = tilingTop; y <= screenBottom; y += image.height) {
      g.context.drawImage(image, 0, y);
    }
  }

  game.chains.draw.push((g, next) => {
    g.save();
    g.context.translate(-1024, 0);

    g.context.fillStyle = "#0fb0fe";
    g.context.fillRect(
      0,
      game.camera.y - (game.height / game.camera.getPixelsPerMeter()) * 0.5,
      2048,
      game.height / game.camera.getPixelsPerMeter()
    );

    drawTiled(g, images.background_2);
    drawTiled(g, images.bubbles, game.time * -200);

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

  let ambientVolume = 0;
  game.resources.audio.ambient.volume = 0;
  game.chains.update.unshift((dt, next) => {
    fadeAudio({
      audio: game.resources.audio.ambient,
      target: ambientVolume,
      speed: (1 / 10) * dt,
    });
    next(dt);
  });

  //#gameobjects

  class GameObject {
    constructor({ x, y }) {
      this.position = new Vector(x, y);
    }
  }

  class Start extends GameObject {
    start = true;
    export = true;
    editorVisible = true;

    drawForeground(g) {
      g.drawCenteredImage(images.test, this.position.x, this.position.y);
    }
  }

  class Player extends GameObject {
    updatable = true;
    touchable = true;
    foreground = true;
    touchable = true;
    player = true;
    targetPosition = new Vector(0, 0);
    lifeTime = 0;

    sinkRate = 200;
    maxSpeed = 500;
    touchRadius = 150;
    slowStartTime = 5;

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
      this.lifeTime += dt;

      const slowStart = Math.min(this.lifeTime / this.slowStartTime, 1);

      const difference = this.targetPosition.x - this.position.x;
      const direction = Math.sign(difference);
      const distance = Math.abs(difference);
      const moving = distance > 50;
      const speed = moving ? this.maxSpeed : 0;
      this.flipped = moving ? direction < 0 : this.flipped;
      this.velocity.x = this.velocity.x * 0.9 + direction * speed * 0.1;
      this.velocity.y = this.sinkRate;
      this.position.addV(this.velocity.clone().multiply(dt * slowStart));
    }

    touch(other) {
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
        console.error("left should be negative of zero");
      }
      if (bottom < 0) {
        console.error("bottom should be positive of zero");
      }
      if (right < 0) {
        console.error("right should be positive of zero");
      }
    }
  }

  class Splash extends GameObject {
    updatable = true;
    background = true;
    lifetime = 0;
    framerate = 1 / 30;
    images = [
      game.resources.images.splash_1,
      game.resources.images.splash_2,
      game.resources.images.splash_3,
      game.resources.images.splash_4,
      game.resources.images.splash_5,
    ];
    update(dt) {
      this.lifetime += dt;
      if (this.lifetime > images.length * this.framerate) {
        game.objects.remove(this);
      }
    }

    drawBackground(g) {
      const maxLifetime = this.framerate * this.images.length;
      const image = this.images[Math.floor(this.lifetime / this.framerate)];
      g.context.globalAlpha = 1 - this.lifetime / maxLifetime;
      g.drawCenteredImage(image, this.position.x, this.position.y - 600);
      g.context.globalAlpha = 1;
    }
  }

  class Fish extends GameObject {
    updatable = true;
    foreground = true;
    touchable = true;
    export = true;
    touchRadius = 100;

    constructor({
      x,
      y,
      angle,
      speed,
      image = images.fish,
      top = 0,
      right = 500,
      bottom = 0,
      left = -500,
    }) {
      super({ x, y });
      this.startPosition = new Vector(x, y);
      this.relativePosition = new Vector(0, 0);
      this.image = image;
      this.size = { width: 1, height: 1 };
      this.boundaries = new Boundaries(top, right, bottom, left);
      this.speed = speed;
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
    constructor(args) {
      super({ image: images.clown, ...args });
    }
  }

  class FootballFish extends Fish {
    constructor({ x, y, angle, speed }) {
      super({
        x,
        y,
        image: images.football,
        angle: angle ?? 45,
        speed: speed ?? 200,
        top: -100,
        bottom: 100,
        left: -800,
        right: 800,
      });
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
    constructor({ x, y, angle, speed, top, right, bottom, left }) {
      super({
        x,
        y,
        image: images.octopus_0,
        angle: angle ?? 15,
        speed: speed ?? 300,
        top: top ?? -200,
        right: right ?? 200,
        bottom: bottom ?? 200,
        left: left ?? -200,
      });
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
    constructor({ x, y, angle, speed }) {
      super({
        x,
        y,
        image: images.seahorse,
        angle: angle ?? 0,
        speed: speed ?? 200,
        top: 0,
        right: 1200 - x + 10,
        bottom: 0,
        left: -1200 - x - 10,
      });
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

  class WavyFish extends Fish {
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
      g.drawCenteredImage(images.jelly, 0, 0);
      g.restore();
    }
  }

  class StarFish extends Fish {
    constructor({ x, y, angle, speed }) {
      super({
        x,
        y,
        image: images.starfish,
        angle: angle ?? 0,
        speed: speed ?? 200,
        top: 0,
        right: 1024 - x + 10,
        bottom: 0,
        left: -1024 - x - 10,
      });
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
      g.context.rotate(
        toRadians(
          (360 /
            (this.speed -
              (this.boundaries.right - Math.abs(this.relativePosition.x)))) *
            this.relativePosition.x
        )
      );
      g.drawCenteredImage(this.image, 0, 0);
      g.restore();
    }
  }

  class Bubble extends GameObject {
    updatable = true;
    foreground = true;

    constructor({ x, y }) {
      super({ x, y });
      this.velocity = new Vector(0, -(300 + 300 * Math.random()));
      this.period = 8 + Math.random() * 4;
      this.lifetime = Math.random() * this.period;
      this.scale = 0.5 * Math.random() + 0.5;
    }

    update(dt) {
      this.lifetime += dt;
      this.velocity.x =
        Math.sin((this.lifetime / (Math.PI * 2)) * this.period) * 100;
      this.velocity.y -= 500 * dt;
      this.position.addV(this.velocity.clone().multiply(dt));
    }

    drawForeground(g) {
      g.save();
      g.context.translate(this.position.x, this.position.y);
      g.context.scale(this.scale, this.scale);
      g.drawCenteredImage(images.white_bubble, 0, 0);
      g.restore();
    }
  }

  class Treasure extends GameObject {
    end = true;
    export = true;
    background = true;
    constructor({ y }) {
      super({ x: 0, y });
      this.image = images.treasure_closed;
    }

    get bottom() {
      return this.position.y + this.image.height * 0.5;
    }

    drawBackground(g) {
      g.drawCenteredImage(this.image, this.position.x, this.position.y);
    }

    open() {
      this.image = images.treasure;

      const minx = this.position.x + (1105 - 1024);
      const maxx = this.position.x + (1555 - 1024);
      const y = this.position.y + (1400 - 1024);

      for (let x = minx; x < maxx; x += 20) {
        const bubble = new Bubble({ x, y });
        game.objects.add(bubble);
      }
    }
  }

  function fade({ current, target, speed }) {
    const difference = target - current;
    const direction = Math.sign(difference);
    const distance = Math.abs(difference);
    if (speed > distance) {
      return target;
    }
    return current + direction * speed;
  }

  function fadeAudio({ audio, target, speed }) {
    const volume = fade({
      current: audio.volume,
      target,
      speed,
    });
    audio.volume = volume;
  }

  class BeginState {
    constructor({ game }) {
      this.game = game;
      this.update = this.update.bind(this);
    }

    enable() {
      this.game.camera.reset();
      this.game.chains.update.unshift(this.update);
      this.player = new Player({
        x: 0,
        y: -2048,
      });
      this.game.objects.add(this.player);
      this.game.objects.handlePending();
    }

    disable() {
      this.game.chains.update.remove(this.update);
    }

    update(dt, next) {
      this.player.velocity.y += 2048 * dt;
      this.player.position.y += this.player.velocity.y * dt;

      if (this.player.position.y > 0) {
        this.player.velocity.set(0, 0);
        this.game.resources.audio.sploosh.play();
        this.game.objects.add(
          new Splash({ x: this.player.position.x, y: this.player.position.y })
        );
        this.game.changeState(
          new GameplayState({ game: this.game, player: this.player })
        );
      }
    }
  }

  class GameplayState {
    constructor({ game, player }) {
      this.game = game;
      this.player = player;
      this.update = this.update.bind(this);
      this.keydown = this.keydown.bind(this);
      this.pingtime = Math.floor(Math.random() * 15);
    }

    enable() {
      this.game.camera.reset();
      this.game.chains.update.push(this.update);
      this.game.on("keydown", this.keydown);

      game.resources.audio.ambient.loop = true;
      game.resources.audio.ambient.volume = 0;
      game.resources.audio.ambient.play();
      ambientVolume = 1;
    }

    disable() {
      ambientVolume = 0;
      this.game.chains.update.remove(this.update);
      this.game.removeListener("keydown", this.keydown);
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
        this.game.changeState(
          new EditorState({
            game,
            gameplayState: this,
            items: [Start, ClownFish, Octopus, FootballFish, Treasure],
          })
        );
      } else if (key === "9") {
        this.player.position.y =
          this.game.objects.lists.end.first.position.y - 200;
      } else if (key === "0") {
        this.game.changeState(new EndState({ game }));
      }

      const movement = new Vector(
        (key === "right" ? 1 : 0) - (key === "left" ? 1 : 0),
        (key === "down" ? 1 : 0) - (key === "up" ? 1 : 0)
      );

      this.player.movement = movement;
    }

    update(dt) {
      this.pingtime -= dt;
      if (this.pingtime < 0) {
        game.resources.audio.sonar_2.play();
        this.pingtime = Math.floor(Math.random() * 15);
      }

      this.game.camera.screenToWorld(
        this.game.mouse,
        this.player.targetPosition
      );

      // Update camera
      const end = [...this.game.objects.lists.end][0];
      this.game.camera.y = Math.min(
        this.player.position.y,
        end.bottom -
          (this.game.height * 0.5) / this.game.camera.getPixelsPerMeter()
      );

      // Check win condition
      if (this.player.position.y > end.position.y) {
        end.open();
        this.game.resources.audio.treasure_found.play();
        this.player.sinkRate = 0;
        this.game.changeState(
          this.game.levelSystem.hasNextLevel()
            ? new WinState({ game })
            : new EndState({ game })
        );
      }
    }
  }

  class MenuState {
    constructor({ game }) {
      this.game = game;
      this.draw = this.draw.bind(this);
      this.mousedown = this.mousedown.bind(this);
    }

    enable() {
      this.game.camera.reset();
      this.game.levelSystem.changeLevel(null);
      this.game.chains.draw.push(this.draw);
      this.game.on("mousedown", this.mousedown);
    }

    disable() {
      this.game.chains.draw.remove(this.draw);
      this.game.removeListener("mousedown", this.mousedown);
    }

    mousedown() {
      this.game.levelSystem.changeLevel(level_sym1());
      this.game.changeState(new BeginState({ game: this.game }));
    }

    draw(g, next) {
      next(g);

      g.drawCenteredImage(images.begin, 0, game.camera.y + 1000);
    }
  }

  class EndState {
    lifetime = 0;
    constructor({ game }) {
      this.game = game;
      this.draw = this.draw.bind(this);
      this.update = this.update.bind(this);
      this.mousedown = this.mousedown.bind(this);
    }

    enable() {
      this.game.chains.draw.push(this.draw);
      this.game.chains.update.unshift(this.update);
      this.game.on("mousedown", this.mousedown);
    }

    disable() {
      this.game.chains.draw.remove(this.draw);
      this.game.chains.update.remove(this.update);
      this.game.removeListener("mousedown", this.mousedown);
    }

    mousedown() {
      if (this.lifetime < 2) {
        return;
      }
      this.game.changeState(new MenuState({ game: this.game }));
    }

    draw(g, next) {
      next(g);

      const startTime = 1;
      const fadeTime = 3;
      g.context.globalAlpha = Math.max(
        0,
        Math.min(this.lifetime - startTime, fadeTime) / fadeTime
      );
      g.drawCenteredImage(images.end, 0, game.camera.y - 1000);
      g.context.globalAlpha = 1;
    }

    update(dt, next) {
      const lifetime = (this.lifetime += dt);

      const slowDownTime = 3;
      const timeScale = 1 - Math.min(lifetime, slowDownTime) / slowDownTime;
      next(timeScale * dt);
    }
  }

  //#states

  function level_sym1() {
    return {
      name: "Level 1",
      objects: [
        new ClownFish({
          x: 300,
          y: 800,
          angle: 180,
          speed: 300,
          top: 0,
          right: 200,
          bottom: 0,
          left: -500,
        }),
        new ClownFish({
          x: 80,
          y: 3000,
          angle: 180,
          speed: 300,
          top: 0,
          right: 500,
          bottom: 0,
          left: -500,
        }),
        new ClownFish({
          x: 160,
          y: 2800,
          angle: 180,
          speed: 320,
          top: 0,
          right: 500,
          bottom: 0,
          left: -500,
        }),
        new ClownFish({
          x: 80,
          y: 2600,
          angle: 180,
          speed: 300,
          top: 0,
          right: 500,
          bottom: 0,
          left: -500,
        }),
        new ClownFish({
          x: -20,
          y: 4600,
          angle: 0,
          speed: 300,
          top: 0,
          right: 500,
          bottom: 0,
          left: -500,
        }),
        new ClownFish({
          x: 60,
          y: 4400,
          angle: 0,
          speed: 320,
          top: 0,
          right: 500,
          bottom: 0,
          left: -500,
        }),
        new ClownFish({
          x: -20,
          y: 4200,
          angle: 0,
          speed: 300,
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
        new WavyFish({ x: 500, y: 1000 }),
        new Octopus({ x: 60, y: 2000 }),
        new FootballFish({ x: 80, y: 3000 }),
        new Seahorse({ x: 200, y: 4000 }),
        new StarFish({ x: 80, y: 5000 }),
        new Treasure({ x: 0, y: 5500 }),
      ],
      clone: level_sym2,
      nextLevel: level_sym3,
    };
  }

  function level_sym3() {
    return {
      name: "Level 3",
      objects: [
        new Treasure({ x: -24, y: 6512 }),
        new Seahorse({ x: 790, y: 5710 }),
        new Seahorse({ x: -653, y: 5275 }),
        new FootballFish({ x: 441, y: 3797 }),
        new FootballFish({ x: 627, y: 4022 }),
        new FootballFish({ x: -459, y: 2813, angle: 315 }),
        new FootballFish({ x: -699, y: 3077, angle: 315 }),
        new Octopus({
          x: 674,
          y: 1500,
          top: -400,
          right: 400,
          bottom: 400,
          left: -400,
        }),
        new Octopus({ x: -521, y: 1000, angle: 345 }),
      ],
      clone: level_sym3,
      nextLevel: level_sym4,
    };
  }

  function level_sym4() {
    return {
      name: "Level 4",
      objects: [
        new Treasure({ x: -200, y: 10352 }),
        new Octopus({
          x: 588,
          y: 9610,
          angle: 330,
          speed: 600,
          top: -400,
          right: 400,
          bottom: 400,
          left: -400,
        }),
        new Octopus({ x: -235, y: 9285 }),
        new WavyFish({ x: -290, y: 7976 }),
        new StarFish({ x: 10, y: 7871 }),
        new FootballFish({ x: -176, y: 7604 }),
        new StarFish({ x: 540, y: 7335, speed: 400 }),
        new StarFish({ x: -625, y: 5994 }),
        new Seahorse({ x: 660, y: 5058, speed: 350 }),
        new Octopus({
          x: -706,
          y: 4101,
          top: -400,
          right: 400,
          bottom: 400,
          left: -400,
        }),
        new Octopus({
          x: 806,
          y: 3805,
          top: -400,
          right: 400,
          bottom: 400,
          left: -400,
        }),
        new WavyFish({ x: 883, y: 2128 }),
        new WavyFish({ x: 383, y: 2768 }),
        new WavyFish({ x: -396, y: 2128 }),
        new StarFish({ x: 355, y: 1481 }),
        new StarFish({ x: -777, y: 875 }),
        new StarFish({ x: 777, y: 875 }),
      ],
      clone: level_sym4,
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
      game.changeState(new BeginState({ game }));
    }

    update(dt, next) {
      next(dt);
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
      g.chains.update.insertBefore(this.update, game.chains.update.objects);
      g.on("mousedown", this.mousedown);

      game.resources.audio.fish_dead.play();
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
      game.levelSystem.restartLevel();
      game.changeState(new BeginState({ game }));
    }

    update(dt, next) {
      // Avoid updating the game.
      //
    }
  }

  game.changeState(new MenuState({ game }));
  game.start();
  window.game = game;
}
