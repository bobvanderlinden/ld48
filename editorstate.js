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
    for (const obj of game.objects.lists.export) {
      leveldef.push([obj.constructor, obj.position.x, obj.position.y]);
    }
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
    for (const o of game.objects.lists.editorVisible) {
      o.drawForeground(g);
    }
    const leftTop = new Vector();
    game.camera.screenToWorld(Vector.zero, leftTop);
    const rightBottom = new Vector();
    game.camera.screenToWorld(new Vector(game.width, game.height), rightBottom);
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
}
