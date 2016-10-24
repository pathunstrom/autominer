(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
const Probe = require("./gameobjects/probe.js");
const Beacon = require("./gameobjects/beacon.js");
const config = require("./configuration.js");
const brain = require("./behaviors.js");

var game = {
    spentDelta: 0,
    space: {}
};

game.run = function () {

    this.space.beacons = [new Beacon(20, 20), new Beacon(580, 380)];

    var probe = new Probe(20, 20);
    probe.validTargets = this.space.beacons;
    this.space.probes = [probe];

    var canvas = document.getElementById("autominer-canvas");
    view.renderContext = canvas.getContext("2d");
    view.render(game.space);
    window.requestAnimationFrame(game.update)
};

game.update = function (time) {
    var unspentDelta = time - game.spentDelta;
    for (; unspentDelta > config.timeStep; unspentDelta -= config.timeStep) {
        game.simulate()
    }
    game.spentDelta = time - unspentDelta;
    view.render(game.space);
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

view.render = function(space) {
    view.renderContext.strokeStyle = "rgb(0, 0, 0)";
    view.renderContext.fillRect(0, 0, 600, 400);
    Object.keys(space).forEach(function(key){
        space[key].forEach(function(obj){
            var pos = obj.pos;
            obj.draw(view.renderContext, pos.x, pos.y);
        })
    })
};

document.addEventListener("DOMContentLoaded", function(){
    game.run();
});
},{"./behaviors.js":2,"./configuration.js":4,"./gameobjects/beacon.js":5,"./gameobjects/probe.js":6}],2:[function(require,module,exports){
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

var probeBrain = new brain.Brain();
probeBrain.register(moveToTarget);
probeBrain.register(acquireFurthestTarget);
probeBrain.register(brain.priority(moveToTarget, acquireFurthestTarget), "basicProbe");
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
const Vector = require("../vector.js");

function Beacon(x, y){
    this.pos = new Vector(x, y);
    this.size = 3;
    this.color = "rgb(200, 200, 255)"
}

Beacon.prototype.update = function (timeStep) {};

Beacon.prototype.draw = function (canvas, x, y) {
    canvas.strokeStyle = this.color;
    canvas.beginPath();
    canvas.arc(x, y, this.size, 0, Math.PI * 2);
    canvas.stroke();
};

module.exports = Beacon;
},{"../vector.js":7}],6:[function(require,module,exports){
const Vector = require("../vector.js");
// TODO: Consider Radar object. Customizable views.

function Probe(x, y) {
    "use strict";
    this.pos = new Vector(x, y);
    this.size = 5;
    this.speed = 0.17;
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

Probe.prototype.update = function (timeStep) {
    "use strict";
    // Forest.act(this, timeStep);
};

module.exports = Probe;
},{"../vector.js":7}],7:[function(require,module,exports){
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

module.exports = Vector;
},{}]},{},[1]);
