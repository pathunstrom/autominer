(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
const Probe = require("./gameobjects/probe.js");
const Beacon = require("./gameobjects/beacon.js");
const config = require("./configuration.js");
const brain = require("./behaviors.js");
const Controller = require("./controller.js");
const Player = require("./gameobjects/player.js");

var game = {
    spentDelta: 0,
    space: {}
};

game.run = function () {

    this.space.beacons = [];

    var probe = new Probe(20, 20);
    probe.validTargets = this.space.beacons;
    this.space.probes = [probe];

    var canvas = document.getElementById("autominer-canvas");
    game.player = new Player({account: 4});
    var controller = new Controller(
        canvas,
        game.space,
        game.player,
        {beacon: 1}
    );
    view.renderContext = canvas.getContext("2d");
    view.render(game.space, game.player);
    window.requestAnimationFrame(game.update)
};

game.update = function (time) {
    var unspentDelta = time - game.spentDelta;
    for (; unspentDelta > config.timeStep; unspentDelta -= config.timeStep) {
        game.simulate()
    }
    game.spentDelta = time - unspentDelta;
    view.render(game.space, game.player);
    window.requestAnimationFrame(game.update)
};

game.simulate = function () {
    var space = game.space;
    Object.keys(space).forEach(function(key){
        space[key].forEach(function(obj){
            brain.act(obj);
        });
    });
};

var view = {
    renderContext: null
};

view.render = function(space, player) {
    view.renderContext.strokeStyle = "rgb(0, 0, 0)";
    view.renderContext.fillRect(0, 0, 600, 400);
    Object.keys(space).forEach(function(key){
        space[key].forEach(function(obj){
            var pos = obj.pos;
            obj.draw(view.renderContext, Math.floor(pos.x), Math.floor(pos.y));
        })
    });
    updateScores(player);
};

function updateScores(player) {
    var currencyDisplay = document.getElementById("player-account");
    currencyDisplay.textContent = player.account;
}

document.addEventListener("DOMContentLoaded", function(){
    game.run();
});
},{"./behaviors.js":2,"./configuration.js":4,"./controller.js":5,"./gameobjects/beacon.js":6,"./gameobjects/player.js":7,"./gameobjects/probe.js":8}],2:[function(require,module,exports){
const brain = require("./brain.js");
const config = require("./configuration.js");

function moveToTarget(actor) {
    var target = actor.target;

    if (target === null) {
        return brain.FAILURE;
    }
    var direction = target.pos.sub(actor.pos);  // Vector2
    var displacement = actor.speed * config.timeStep;
    if (direction.length() <= displacement) {
        actor.pos = target.pos;
        actor.target = null;
        return brain.SUCCESS;
    } else {
        actor.pos = actor.pos.add(direction.scale(displacement));
        return brain.RUNNING;
    }
}

function acquireFurthestTarget(actor) {
    var furthest = {target: null, distance: 0};
    if (actor.hasOwnProperty("validTargets")) {
        var validTargets = actor.validTargets;
    } else {
        return brain.FAILURE;
    }
    validTargets.forEach(function(target){
        var distance = target.pos.sub(actor.pos).length();
        if (distance > furthest.distance) {
            furthest = {target: target, distance: distance}
        }
    });

    actor.target = furthest.target;
    return brain.SUCCESS
}

function easeDistance(actor) {
    if (!actor.hasOwnProperty("targetDistance") || actor.targetDistance === undefined) {
        return brain.FAILURE;
    }

    function circularEase (time, target, duration) {
        time = (time / duration) - 1;
        return target * Math.sqrt(1 - time*time);
    }

    var time = actor.runTime + config.timeStep;
    var target = actor.targetDistance;
    var duration = actor.duration;
    var newDistance = actor.distance;
    if (time < duration) {
        newDistance = circularEase(time, target, duration);
    } else {
        newDistance = target;
    }
    actor.distance = newDistance;
    actor.runTime = time;
    return brain.SUCCESS;
}

function updatePosition(actor) {

    actor.pos = actor.direction.scale(actor.distance).add(actor.origin);
    return brain.SUCCESS;
}

function cleanUpEasing(actor) {
    if (actor.distance == actor.targetDistance) {
        actor.targetDistance = undefined;
        actor.runTime = 0;
        return brain.SUCCESS;
    } else {
        return brain.FAILURE;
    }
}

var probeBrain = new brain.Brain();
probeBrain.register(moveToTarget);
probeBrain.register(acquireFurthestTarget);
probeBrain.register(brain.priority(moveToTarget, acquireFurthestTarget), "basicProbe");
probeBrain.register(brain.sequence(easeDistance, updatePosition, cleanUpEasing), "launchBeacon");
module.exports = probeBrain;
},{"./brain.js":3,"./configuration.js":4}],3:[function(require,module,exports){
const FAILURE = 0;
const SUCCESS = 1;
const RUNNING = 2;

function Brain() {
    this.behaviors = {};
    this.overwriteProtected = true;
}

Brain.prototype.act = function (actor) {
    if (actor.behavior !== undefined && actor.behavior !== null) {
        return this.behaviors[actor.behavior](actor);
    }
};

Brain.prototype.register = function(func, name) {
    if (name === undefined) {
        name = func.name;
    }

    if (name == '') {
        throw "Must register a function with a name."
    }

    if (this.overwriteProtected && this.behaviors.hasOwnProperty(name)) {
        throw "May not shadow behavior names."
    }

    this.behaviors[name] = func;
};

function priority() {
    var children = Array.from(arguments);

    return function (actor) {
        for (var i = 0; i < children.length; i++) {
            var result = children[i](actor);
            if (result !== FAILURE) {
                return result;
            }
        }
        return FAILURE
    };
}

function sequence() {
    var children = Array.from(arguments);
    return function(actor) {
        for (var i = 0; i < children.length; i++) {
            var result = children[i](actor);
            if (result !== SUCCESS) {
                return result;
            }
        }
        return SUCCESS
    }
}

exports.Brain = Brain;
exports.priority = priority;
exports.sequence = sequence;
exports.RUNNING = RUNNING;
exports.SUCCESS = SUCCESS;
exports.FAILURE = FAILURE;
},{}],4:[function(require,module,exports){
// TODO: YAML Configuration

module.exports.timeStep = 16;
},{}],5:[function(require,module,exports){
const Beacon = require("./gameobjects/beacon.js");

function Controller(canvas, space, player, costs) {
    this.canvas = canvas;
    this.space = space;
    this.player = player;
    this.costs = costs;
    this.currentControl = "beacon";
    this.canvas.addEventListener("click", this.click.bind(this));
}

Controller.prototype.click = function (event) {
    var cost = this.costs[this.currentControl];
    console.debug("click event");
    console.debug("Cost: " + cost);
    if (this.player.withdraw(cost)) {
        console.debug("Withdraw successful.");
        var x = event.offsetX;
        var y = event.offsetY;
        this.space.beacons.push(new Beacon(x, y));
    }
};

module.exports = Controller;
},{"./gameobjects/beacon.js":6}],6:[function(require,module,exports){
const Vector = require("../vector.js");

function Beacon(x, y) {
    this.origin = new Vector(300, 400);
    this.pos = this.origin;
    this.direction = new Vector(x, y).sub(this.pos);
    this.targetDistance = this.direction.length();
    this.distance = 0;
    this.duration = 2000;
    this.runTime = 0;

    this.color = "rgb(200, 200, 255)";
    this.size = 3;

    this.behavior = "launchBeacon";
}

Beacon.prototype.draw = function (canvas, x, y) {
    canvas.strokeStyle = this.color;
    canvas.beginPath();
    canvas.arc(x, y, this.size, 0, Math.PI * 2);
    canvas.stroke();
};

module.exports = Beacon;
},{"../vector.js":9}],7:[function(require,module,exports){
function Player(config) {
    this.account = 0;
    if (config !== undefined) {
        this.account = config.account || this.account;
    }
    this.withdraw = function(value) {
        if (value <= this.account) {
            this.account -= value;
            return true;
        }
        return false;
    }
}

module.exports = Player;
},{}],8:[function(require,module,exports){
const Vector = require("../vector.js");
// TODO: Consider Radar object. Customizable views.

function Probe(x, y) {
    "use strict";
    this.pos = new Vector(x, y);
    this.size = 5;
    this.speed = 0.06;
    this.target = null;
    this.color = "rgb(200, 255, 220)"; // TODO: Add parameters.
    this.behavior = "basicProbe";
}

Probe.prototype.draw = function (canvas, x, y) {
    "use strict";
    canvas.strokeStyle = this.color;
    canvas.beginPath();
    canvas.arc(x, y, this.size, 0, Math.PI * 2);
    canvas.stroke();
};

module.exports = Probe;
},{"../vector.js":9}],9:[function(require,module,exports){
function Vector(x, y) {
    "use strict";
    this.x = x;
    this.y = y;
    this._length = null;
    this._normal = null;
}

Vector.prototype.sub = function (other) {
    "use strict";
    return new Vector(this.x - other.x, this.y - other.y);
};

Vector.prototype.add = function (other) {
    "use strict";
    return new Vector(this.x + other.x, this.y + other.y);
};

Vector.prototype.length = function () {
    "use strict";
    if (this._length === null) {
        this._length = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.x, 2));
    }
    return this._length;
};

Vector.prototype.normal = function () {
    "use strict";
    if (this._normal === null) {
        this._normal = this.normal();
        this._normal._normal = this._normal;
    }
    return this._normal;
};

Vector.prototype.scale = function (length) {
    "use strict";
    var ratio = length / this.length();
    return new Vector(this.x * ratio, this.y * ratio);
};

Vector.prototype.toString = function () {
    return "Vector(" + this.x + ", " + this.y + ")";
};

module.exports = Vector;
},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNyYy9hdXRvbWluZXIuanMiLCJzcmMvYmVoYXZpb3JzLmpzIiwic3JjL2JyYWluLmpzIiwic3JjL2NvbmZpZ3VyYXRpb24uanMiLCJzcmMvY29udHJvbGxlci5qcyIsInNyYy9nYW1lb2JqZWN0cy9iZWFjb24uanMiLCJzcmMvZ2FtZW9iamVjdHMvcGxheWVyLmpzIiwic3JjL2dhbWVvYmplY3RzL3Byb2JlLmpzIiwic3JjL3ZlY3Rvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImNvbnN0IFByb2JlID0gcmVxdWlyZShcIi4vZ2FtZW9iamVjdHMvcHJvYmUuanNcIik7XG5jb25zdCBCZWFjb24gPSByZXF1aXJlKFwiLi9nYW1lb2JqZWN0cy9iZWFjb24uanNcIik7XG5jb25zdCBjb25maWcgPSByZXF1aXJlKFwiLi9jb25maWd1cmF0aW9uLmpzXCIpO1xuY29uc3QgYnJhaW4gPSByZXF1aXJlKFwiLi9iZWhhdmlvcnMuanNcIik7XG5jb25zdCBDb250cm9sbGVyID0gcmVxdWlyZShcIi4vY29udHJvbGxlci5qc1wiKTtcbmNvbnN0IFBsYXllciA9IHJlcXVpcmUoXCIuL2dhbWVvYmplY3RzL3BsYXllci5qc1wiKTtcblxudmFyIGdhbWUgPSB7XG4gICAgc3BlbnREZWx0YTogMCxcbiAgICBzcGFjZToge31cbn07XG5cbmdhbWUucnVuID0gZnVuY3Rpb24gKCkge1xuXG4gICAgdGhpcy5zcGFjZS5iZWFjb25zID0gW107XG5cbiAgICB2YXIgcHJvYmUgPSBuZXcgUHJvYmUoMjAsIDIwKTtcbiAgICBwcm9iZS52YWxpZFRhcmdldHMgPSB0aGlzLnNwYWNlLmJlYWNvbnM7XG4gICAgdGhpcy5zcGFjZS5wcm9iZXMgPSBbcHJvYmVdO1xuXG4gICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYXV0b21pbmVyLWNhbnZhc1wiKTtcbiAgICBnYW1lLnBsYXllciA9IG5ldyBQbGF5ZXIoe2FjY291bnQ6IDR9KTtcbiAgICB2YXIgY29udHJvbGxlciA9IG5ldyBDb250cm9sbGVyKFxuICAgICAgICBjYW52YXMsXG4gICAgICAgIGdhbWUuc3BhY2UsXG4gICAgICAgIGdhbWUucGxheWVyLFxuICAgICAgICB7YmVhY29uOiAxfVxuICAgICk7XG4gICAgdmlldy5yZW5kZXJDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICB2aWV3LnJlbmRlcihnYW1lLnNwYWNlLCBnYW1lLnBsYXllcik7XG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lLnVwZGF0ZSlcbn07XG5cbmdhbWUudXBkYXRlID0gZnVuY3Rpb24gKHRpbWUpIHtcbiAgICB2YXIgdW5zcGVudERlbHRhID0gdGltZSAtIGdhbWUuc3BlbnREZWx0YTtcbiAgICBmb3IgKDsgdW5zcGVudERlbHRhID4gY29uZmlnLnRpbWVTdGVwOyB1bnNwZW50RGVsdGEgLT0gY29uZmlnLnRpbWVTdGVwKSB7XG4gICAgICAgIGdhbWUuc2ltdWxhdGUoKVxuICAgIH1cbiAgICBnYW1lLnNwZW50RGVsdGEgPSB0aW1lIC0gdW5zcGVudERlbHRhO1xuICAgIHZpZXcucmVuZGVyKGdhbWUuc3BhY2UsIGdhbWUucGxheWVyKTtcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGdhbWUudXBkYXRlKVxufTtcblxuZ2FtZS5zaW11bGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3BhY2UgPSBnYW1lLnNwYWNlO1xuICAgIE9iamVjdC5rZXlzKHNwYWNlKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgIHNwYWNlW2tleV0uZm9yRWFjaChmdW5jdGlvbihvYmope1xuICAgICAgICAgICAgYnJhaW4uYWN0KG9iaik7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxudmFyIHZpZXcgPSB7XG4gICAgcmVuZGVyQ29udGV4dDogbnVsbFxufTtcblxudmlldy5yZW5kZXIgPSBmdW5jdGlvbihzcGFjZSwgcGxheWVyKSB7XG4gICAgdmlldy5yZW5kZXJDb250ZXh0LnN0cm9rZVN0eWxlID0gXCJyZ2IoMCwgMCwgMClcIjtcbiAgICB2aWV3LnJlbmRlckNvbnRleHQuZmlsbFJlY3QoMCwgMCwgNjAwLCA0MDApO1xuICAgIE9iamVjdC5rZXlzKHNwYWNlKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgIHNwYWNlW2tleV0uZm9yRWFjaChmdW5jdGlvbihvYmope1xuICAgICAgICAgICAgdmFyIHBvcyA9IG9iai5wb3M7XG4gICAgICAgICAgICBvYmouZHJhdyh2aWV3LnJlbmRlckNvbnRleHQsIE1hdGguZmxvb3IocG9zLngpLCBNYXRoLmZsb29yKHBvcy55KSk7XG4gICAgICAgIH0pXG4gICAgfSk7XG4gICAgdXBkYXRlU2NvcmVzKHBsYXllcik7XG59O1xuXG5mdW5jdGlvbiB1cGRhdGVTY29yZXMocGxheWVyKSB7XG4gICAgdmFyIGN1cnJlbmN5RGlzcGxheSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxheWVyLWFjY291bnRcIik7XG4gICAgY3VycmVuY3lEaXNwbGF5LnRleHRDb250ZW50ID0gcGxheWVyLmFjY291bnQ7XG59XG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsIGZ1bmN0aW9uKCl7XG4gICAgZ2FtZS5ydW4oKTtcbn0pOyIsImNvbnN0IGJyYWluID0gcmVxdWlyZShcIi4vYnJhaW4uanNcIik7XG5jb25zdCBjb25maWcgPSByZXF1aXJlKFwiLi9jb25maWd1cmF0aW9uLmpzXCIpO1xuXG5mdW5jdGlvbiBtb3ZlVG9UYXJnZXQoYWN0b3IpIHtcbiAgICB2YXIgdGFyZ2V0ID0gYWN0b3IudGFyZ2V0O1xuXG4gICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gYnJhaW4uRkFJTFVSRTtcbiAgICB9XG4gICAgdmFyIGRpcmVjdGlvbiA9IHRhcmdldC5wb3Muc3ViKGFjdG9yLnBvcyk7ICAvLyBWZWN0b3IyXG4gICAgdmFyIGRpc3BsYWNlbWVudCA9IGFjdG9yLnNwZWVkICogY29uZmlnLnRpbWVTdGVwO1xuICAgIGlmIChkaXJlY3Rpb24ubGVuZ3RoKCkgPD0gZGlzcGxhY2VtZW50KSB7XG4gICAgICAgIGFjdG9yLnBvcyA9IHRhcmdldC5wb3M7XG4gICAgICAgIGFjdG9yLnRhcmdldCA9IG51bGw7XG4gICAgICAgIHJldHVybiBicmFpbi5TVUNDRVNTO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGFjdG9yLnBvcyA9IGFjdG9yLnBvcy5hZGQoZGlyZWN0aW9uLnNjYWxlKGRpc3BsYWNlbWVudCkpO1xuICAgICAgICByZXR1cm4gYnJhaW4uUlVOTklORztcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGFjcXVpcmVGdXJ0aGVzdFRhcmdldChhY3Rvcikge1xuICAgIHZhciBmdXJ0aGVzdCA9IHt0YXJnZXQ6IG51bGwsIGRpc3RhbmNlOiAwfTtcbiAgICBpZiAoYWN0b3IuaGFzT3duUHJvcGVydHkoXCJ2YWxpZFRhcmdldHNcIikpIHtcbiAgICAgICAgdmFyIHZhbGlkVGFyZ2V0cyA9IGFjdG9yLnZhbGlkVGFyZ2V0cztcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYnJhaW4uRkFJTFVSRTtcbiAgICB9XG4gICAgdmFsaWRUYXJnZXRzLmZvckVhY2goZnVuY3Rpb24odGFyZ2V0KXtcbiAgICAgICAgdmFyIGRpc3RhbmNlID0gdGFyZ2V0LnBvcy5zdWIoYWN0b3IucG9zKS5sZW5ndGgoKTtcbiAgICAgICAgaWYgKGRpc3RhbmNlID4gZnVydGhlc3QuZGlzdGFuY2UpIHtcbiAgICAgICAgICAgIGZ1cnRoZXN0ID0ge3RhcmdldDogdGFyZ2V0LCBkaXN0YW5jZTogZGlzdGFuY2V9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGFjdG9yLnRhcmdldCA9IGZ1cnRoZXN0LnRhcmdldDtcbiAgICByZXR1cm4gYnJhaW4uU1VDQ0VTU1xufVxuXG5mdW5jdGlvbiBlYXNlRGlzdGFuY2UoYWN0b3IpIHtcbiAgICBpZiAoIWFjdG9yLmhhc093blByb3BlcnR5KFwidGFyZ2V0RGlzdGFuY2VcIikgfHwgYWN0b3IudGFyZ2V0RGlzdGFuY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gYnJhaW4uRkFJTFVSRTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaXJjdWxhckVhc2UgKHRpbWUsIHRhcmdldCwgZHVyYXRpb24pIHtcbiAgICAgICAgdGltZSA9ICh0aW1lIC8gZHVyYXRpb24pIC0gMTtcbiAgICAgICAgcmV0dXJuIHRhcmdldCAqIE1hdGguc3FydCgxIC0gdGltZSp0aW1lKTtcbiAgICB9XG5cbiAgICB2YXIgdGltZSA9IGFjdG9yLnJ1blRpbWUgKyBjb25maWcudGltZVN0ZXA7XG4gICAgdmFyIHRhcmdldCA9IGFjdG9yLnRhcmdldERpc3RhbmNlO1xuICAgIHZhciBkdXJhdGlvbiA9IGFjdG9yLmR1cmF0aW9uO1xuICAgIHZhciBuZXdEaXN0YW5jZSA9IGFjdG9yLmRpc3RhbmNlO1xuICAgIGlmICh0aW1lIDwgZHVyYXRpb24pIHtcbiAgICAgICAgbmV3RGlzdGFuY2UgPSBjaXJjdWxhckVhc2UodGltZSwgdGFyZ2V0LCBkdXJhdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbmV3RGlzdGFuY2UgPSB0YXJnZXQ7XG4gICAgfVxuICAgIGFjdG9yLmRpc3RhbmNlID0gbmV3RGlzdGFuY2U7XG4gICAgYWN0b3IucnVuVGltZSA9IHRpbWU7XG4gICAgcmV0dXJuIGJyYWluLlNVQ0NFU1M7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVBvc2l0aW9uKGFjdG9yKSB7XG5cbiAgICBhY3Rvci5wb3MgPSBhY3Rvci5kaXJlY3Rpb24uc2NhbGUoYWN0b3IuZGlzdGFuY2UpLmFkZChhY3Rvci5vcmlnaW4pO1xuICAgIHJldHVybiBicmFpbi5TVUNDRVNTO1xufVxuXG5mdW5jdGlvbiBjbGVhblVwRWFzaW5nKGFjdG9yKSB7XG4gICAgaWYgKGFjdG9yLmRpc3RhbmNlID09IGFjdG9yLnRhcmdldERpc3RhbmNlKSB7XG4gICAgICAgIGFjdG9yLnRhcmdldERpc3RhbmNlID0gdW5kZWZpbmVkO1xuICAgICAgICBhY3Rvci5ydW5UaW1lID0gMDtcbiAgICAgICAgcmV0dXJuIGJyYWluLlNVQ0NFU1M7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGJyYWluLkZBSUxVUkU7XG4gICAgfVxufVxuXG52YXIgcHJvYmVCcmFpbiA9IG5ldyBicmFpbi5CcmFpbigpO1xucHJvYmVCcmFpbi5yZWdpc3Rlcihtb3ZlVG9UYXJnZXQpO1xucHJvYmVCcmFpbi5yZWdpc3RlcihhY3F1aXJlRnVydGhlc3RUYXJnZXQpO1xucHJvYmVCcmFpbi5yZWdpc3RlcihicmFpbi5wcmlvcml0eShtb3ZlVG9UYXJnZXQsIGFjcXVpcmVGdXJ0aGVzdFRhcmdldCksIFwiYmFzaWNQcm9iZVwiKTtcbnByb2JlQnJhaW4ucmVnaXN0ZXIoYnJhaW4uc2VxdWVuY2UoZWFzZURpc3RhbmNlLCB1cGRhdGVQb3NpdGlvbiwgY2xlYW5VcEVhc2luZyksIFwibGF1bmNoQmVhY29uXCIpO1xubW9kdWxlLmV4cG9ydHMgPSBwcm9iZUJyYWluOyIsImNvbnN0IEZBSUxVUkUgPSAwO1xuY29uc3QgU1VDQ0VTUyA9IDE7XG5jb25zdCBSVU5OSU5HID0gMjtcblxuZnVuY3Rpb24gQnJhaW4oKSB7XG4gICAgdGhpcy5iZWhhdmlvcnMgPSB7fTtcbiAgICB0aGlzLm92ZXJ3cml0ZVByb3RlY3RlZCA9IHRydWU7XG59XG5cbkJyYWluLnByb3RvdHlwZS5hY3QgPSBmdW5jdGlvbiAoYWN0b3IpIHtcbiAgICBpZiAoYWN0b3IuYmVoYXZpb3IgIT09IHVuZGVmaW5lZCAmJiBhY3Rvci5iZWhhdmlvciAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5iZWhhdmlvcnNbYWN0b3IuYmVoYXZpb3JdKGFjdG9yKTtcbiAgICB9XG59O1xuXG5CcmFpbi5wcm90b3R5cGUucmVnaXN0ZXIgPSBmdW5jdGlvbihmdW5jLCBuYW1lKSB7XG4gICAgaWYgKG5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBuYW1lID0gZnVuYy5uYW1lO1xuICAgIH1cblxuICAgIGlmIChuYW1lID09ICcnKSB7XG4gICAgICAgIHRocm93IFwiTXVzdCByZWdpc3RlciBhIGZ1bmN0aW9uIHdpdGggYSBuYW1lLlwiXG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3ZlcndyaXRlUHJvdGVjdGVkICYmIHRoaXMuYmVoYXZpb3JzLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgIHRocm93IFwiTWF5IG5vdCBzaGFkb3cgYmVoYXZpb3IgbmFtZXMuXCJcbiAgICB9XG5cbiAgICB0aGlzLmJlaGF2aW9yc1tuYW1lXSA9IGZ1bmM7XG59O1xuXG5mdW5jdGlvbiBwcmlvcml0eSgpIHtcbiAgICB2YXIgY2hpbGRyZW4gPSBBcnJheS5mcm9tKGFyZ3VtZW50cyk7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKGFjdG9yKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBjaGlsZHJlbltpXShhY3Rvcik7XG4gICAgICAgICAgICBpZiAocmVzdWx0ICE9PSBGQUlMVVJFKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gRkFJTFVSRVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIHNlcXVlbmNlKCkge1xuICAgIHZhciBjaGlsZHJlbiA9IEFycmF5LmZyb20oYXJndW1lbnRzKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oYWN0b3IpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGNoaWxkcmVuW2ldKGFjdG9yKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQgIT09IFNVQ0NFU1MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBTVUNDRVNTXG4gICAgfVxufVxuXG5leHBvcnRzLkJyYWluID0gQnJhaW47XG5leHBvcnRzLnByaW9yaXR5ID0gcHJpb3JpdHk7XG5leHBvcnRzLnNlcXVlbmNlID0gc2VxdWVuY2U7XG5leHBvcnRzLlJVTk5JTkcgPSBSVU5OSU5HO1xuZXhwb3J0cy5TVUNDRVNTID0gU1VDQ0VTUztcbmV4cG9ydHMuRkFJTFVSRSA9IEZBSUxVUkU7IiwiLy8gVE9ETzogWUFNTCBDb25maWd1cmF0aW9uXG5cbm1vZHVsZS5leHBvcnRzLnRpbWVTdGVwID0gMTY7IiwiY29uc3QgQmVhY29uID0gcmVxdWlyZShcIi4vZ2FtZW9iamVjdHMvYmVhY29uLmpzXCIpO1xuXG5mdW5jdGlvbiBDb250cm9sbGVyKGNhbnZhcywgc3BhY2UsIHBsYXllciwgY29zdHMpIHtcbiAgICB0aGlzLmNhbnZhcyA9IGNhbnZhcztcbiAgICB0aGlzLnNwYWNlID0gc3BhY2U7XG4gICAgdGhpcy5wbGF5ZXIgPSBwbGF5ZXI7XG4gICAgdGhpcy5jb3N0cyA9IGNvc3RzO1xuICAgIHRoaXMuY3VycmVudENvbnRyb2wgPSBcImJlYWNvblwiO1xuICAgIHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB0aGlzLmNsaWNrLmJpbmQodGhpcykpO1xufVxuXG5Db250cm9sbGVyLnByb3RvdHlwZS5jbGljayA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHZhciBjb3N0ID0gdGhpcy5jb3N0c1t0aGlzLmN1cnJlbnRDb250cm9sXTtcbiAgICBjb25zb2xlLmRlYnVnKFwiY2xpY2sgZXZlbnRcIik7XG4gICAgY29uc29sZS5kZWJ1ZyhcIkNvc3Q6IFwiICsgY29zdCk7XG4gICAgaWYgKHRoaXMucGxheWVyLndpdGhkcmF3KGNvc3QpKSB7XG4gICAgICAgIGNvbnNvbGUuZGVidWcoXCJXaXRoZHJhdyBzdWNjZXNzZnVsLlwiKTtcbiAgICAgICAgdmFyIHggPSBldmVudC5vZmZzZXRYO1xuICAgICAgICB2YXIgeSA9IGV2ZW50Lm9mZnNldFk7XG4gICAgICAgIHRoaXMuc3BhY2UuYmVhY29ucy5wdXNoKG5ldyBCZWFjb24oeCwgeSkpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udHJvbGxlcjsiLCJjb25zdCBWZWN0b3IgPSByZXF1aXJlKFwiLi4vdmVjdG9yLmpzXCIpO1xuXG5mdW5jdGlvbiBCZWFjb24oeCwgeSkge1xuICAgIHRoaXMub3JpZ2luID0gbmV3IFZlY3RvcigzMDAsIDQwMCk7XG4gICAgdGhpcy5wb3MgPSB0aGlzLm9yaWdpbjtcbiAgICB0aGlzLmRpcmVjdGlvbiA9IG5ldyBWZWN0b3IoeCwgeSkuc3ViKHRoaXMucG9zKTtcbiAgICB0aGlzLnRhcmdldERpc3RhbmNlID0gdGhpcy5kaXJlY3Rpb24ubGVuZ3RoKCk7XG4gICAgdGhpcy5kaXN0YW5jZSA9IDA7XG4gICAgdGhpcy5kdXJhdGlvbiA9IDIwMDA7XG4gICAgdGhpcy5ydW5UaW1lID0gMDtcblxuICAgIHRoaXMuY29sb3IgPSBcInJnYigyMDAsIDIwMCwgMjU1KVwiO1xuICAgIHRoaXMuc2l6ZSA9IDM7XG5cbiAgICB0aGlzLmJlaGF2aW9yID0gXCJsYXVuY2hCZWFjb25cIjtcbn1cblxuQmVhY29uLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gKGNhbnZhcywgeCwgeSkge1xuICAgIGNhbnZhcy5zdHJva2VTdHlsZSA9IHRoaXMuY29sb3I7XG4gICAgY2FudmFzLmJlZ2luUGF0aCgpO1xuICAgIGNhbnZhcy5hcmMoeCwgeSwgdGhpcy5zaXplLCAwLCBNYXRoLlBJICogMik7XG4gICAgY2FudmFzLnN0cm9rZSgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCZWFjb247IiwiZnVuY3Rpb24gUGxheWVyKGNvbmZpZykge1xuICAgIHRoaXMuYWNjb3VudCA9IDA7XG4gICAgaWYgKGNvbmZpZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuYWNjb3VudCA9IGNvbmZpZy5hY2NvdW50IHx8IHRoaXMuYWNjb3VudDtcbiAgICB9XG4gICAgdGhpcy53aXRoZHJhdyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZSA8PSB0aGlzLmFjY291bnQpIHtcbiAgICAgICAgICAgIHRoaXMuYWNjb3VudCAtPSB2YWx1ZTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUGxheWVyOyIsImNvbnN0IFZlY3RvciA9IHJlcXVpcmUoXCIuLi92ZWN0b3IuanNcIik7XG4vLyBUT0RPOiBDb25zaWRlciBSYWRhciBvYmplY3QuIEN1c3RvbWl6YWJsZSB2aWV3cy5cblxuZnVuY3Rpb24gUHJvYmUoeCwgeSkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHRoaXMucG9zID0gbmV3IFZlY3Rvcih4LCB5KTtcbiAgICB0aGlzLnNpemUgPSA1O1xuICAgIHRoaXMuc3BlZWQgPSAwLjA2O1xuICAgIHRoaXMudGFyZ2V0ID0gbnVsbDtcbiAgICB0aGlzLmNvbG9yID0gXCJyZ2IoMjAwLCAyNTUsIDIyMClcIjsgLy8gVE9ETzogQWRkIHBhcmFtZXRlcnMuXG4gICAgdGhpcy5iZWhhdmlvciA9IFwiYmFzaWNQcm9iZVwiO1xufVxuXG5Qcm9iZS5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uIChjYW52YXMsIHgsIHkpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICBjYW52YXMuc3Ryb2tlU3R5bGUgPSB0aGlzLmNvbG9yO1xuICAgIGNhbnZhcy5iZWdpblBhdGgoKTtcbiAgICBjYW52YXMuYXJjKHgsIHksIHRoaXMuc2l6ZSwgMCwgTWF0aC5QSSAqIDIpO1xuICAgIGNhbnZhcy5zdHJva2UoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJvYmU7IiwiZnVuY3Rpb24gVmVjdG9yKHgsIHkpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy5fbGVuZ3RoID0gbnVsbDtcbiAgICB0aGlzLl9ub3JtYWwgPSBudWxsO1xufVxuXG5WZWN0b3IucHJvdG90eXBlLnN1YiA9IGZ1bmN0aW9uIChvdGhlcikge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHJldHVybiBuZXcgVmVjdG9yKHRoaXMueCAtIG90aGVyLngsIHRoaXMueSAtIG90aGVyLnkpO1xufTtcblxuVmVjdG9yLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAob3RoZXIpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICByZXR1cm4gbmV3IFZlY3Rvcih0aGlzLnggKyBvdGhlci54LCB0aGlzLnkgKyBvdGhlci55KTtcbn07XG5cblZlY3Rvci5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGlmICh0aGlzLl9sZW5ndGggPT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5fbGVuZ3RoID0gTWF0aC5zcXJ0KE1hdGgucG93KHRoaXMueCwgMikgKyBNYXRoLnBvdyh0aGlzLngsIDIpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2xlbmd0aDtcbn07XG5cblZlY3Rvci5wcm90b3R5cGUubm9ybWFsID0gZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGlmICh0aGlzLl9ub3JtYWwgPT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5fbm9ybWFsID0gdGhpcy5ub3JtYWwoKTtcbiAgICAgICAgdGhpcy5fbm9ybWFsLl9ub3JtYWwgPSB0aGlzLl9ub3JtYWw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9ub3JtYWw7XG59O1xuXG5WZWN0b3IucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24gKGxlbmd0aCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciByYXRpbyA9IGxlbmd0aCAvIHRoaXMubGVuZ3RoKCk7XG4gICAgcmV0dXJuIG5ldyBWZWN0b3IodGhpcy54ICogcmF0aW8sIHRoaXMueSAqIHJhdGlvKTtcbn07XG5cblZlY3Rvci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFwiVmVjdG9yKFwiICsgdGhpcy54ICsgXCIsIFwiICsgdGhpcy55ICsgXCIpXCI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZlY3RvcjsiXX0=
