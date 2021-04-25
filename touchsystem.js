class TouchSystem {
  constructor({ game, debug }) {
    this.game = game;
    this.update = this.update.bind(this);
    this.draw = this.draw.bind(this);
    game.objects.lists.touchable = game.objects.createIndexList("touchable");
    game.chains.update.insertBefore(this.update, game.chains.update.objects);

    if (debug) {
      game.chains.draw.push(this.draw);
    }
  }

  update(dt, next) {
    next(dt);
    for (const ta of this.game.objects.lists.touchable) {
      for (const tb of this.game.objects.lists.touchable) {
        this.detectTouch(ta, tb);
      }
      if (ta.touching.size) {
        for (const tb of ta.touching) {
          this.detectTouch(ta, tb);
        }
      }
    }
  }

  detectTouch(ta, tb) {
    if (ta === tb) {
      return;
    }
    var areTouching =
      ta._objectmanager &&
      tb._objectmanager &&
      ta.position.distanceToV(tb.position) <= ta.touchRadius + tb.touchRadius;
    this.handleTouch(ta, tb, areTouching);
    this.handleTouch(tb, ta, areTouching);
  }

  handleTouch(o, other, areTouching) {
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

  draw(g, next) {
    next(g);
    for (const o of this.game.objects.lists.touchable) {
      g.strokeStyle("red");
      g.strokeCircle(o.position.x, o.position.y, o.touchRadius);
    }
  }
}

export default TouchSystem;
