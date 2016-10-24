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
            obj.draw(view.renderContext, Math.floor(pos.x), Math.floor(pos.y));
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
    console.error("displacement: " + displacement);
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
},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNyYy9hdXRvbWluZXIuanMiLCJzcmMvYmVoYXZpb3JzLmpzIiwic3JjL2JyYWluLmpzIiwic3JjL2NvbmZpZ3VyYXRpb24uanMiLCJzcmMvZ2FtZW9iamVjdHMvYmVhY29uLmpzIiwic3JjL2dhbWVvYmplY3RzL3Byb2JlLmpzIiwic3JjL3ZlY3Rvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJjb25zdCBQcm9iZSA9IHJlcXVpcmUoXCIuL2dhbWVvYmplY3RzL3Byb2JlLmpzXCIpO1xuY29uc3QgQmVhY29uID0gcmVxdWlyZShcIi4vZ2FtZW9iamVjdHMvYmVhY29uLmpzXCIpO1xuY29uc3QgY29uZmlnID0gcmVxdWlyZShcIi4vY29uZmlndXJhdGlvbi5qc1wiKTtcbmNvbnN0IGJyYWluID0gcmVxdWlyZShcIi4vYmVoYXZpb3JzLmpzXCIpO1xuXG52YXIgZ2FtZSA9IHtcbiAgICBzcGVudERlbHRhOiAwLFxuICAgIHNwYWNlOiB7fVxufTtcblxuZ2FtZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG5cbiAgICB0aGlzLnNwYWNlLmJlYWNvbnMgPSBbbmV3IEJlYWNvbigyMCwgMjApLCBuZXcgQmVhY29uKDU4MCwgMzgwKV07XG5cbiAgICB2YXIgcHJvYmUgPSBuZXcgUHJvYmUoMjAsIDIwKTtcbiAgICBwcm9iZS52YWxpZFRhcmdldHMgPSB0aGlzLnNwYWNlLmJlYWNvbnM7XG4gICAgdGhpcy5zcGFjZS5wcm9iZXMgPSBbcHJvYmVdO1xuXG4gICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYXV0b21pbmVyLWNhbnZhc1wiKTtcbiAgICB2aWV3LnJlbmRlckNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuICAgIHZpZXcucmVuZGVyKGdhbWUuc3BhY2UpO1xuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZ2FtZS51cGRhdGUpXG59O1xuXG5nYW1lLnVwZGF0ZSA9IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgdmFyIHVuc3BlbnREZWx0YSA9IHRpbWUgLSBnYW1lLnNwZW50RGVsdGE7XG4gICAgZm9yICg7IHVuc3BlbnREZWx0YSA+IGNvbmZpZy50aW1lU3RlcDsgdW5zcGVudERlbHRhIC09IGNvbmZpZy50aW1lU3RlcCkge1xuICAgICAgICBnYW1lLnNpbXVsYXRlKClcbiAgICB9XG4gICAgZ2FtZS5zcGVudERlbHRhID0gdGltZSAtIHVuc3BlbnREZWx0YTtcbiAgICB2aWV3LnJlbmRlcihnYW1lLnNwYWNlKTtcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGdhbWUudXBkYXRlKVxufTtcblxuZ2FtZS5zaW11bGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3BhY2UgPSBnYW1lLnNwYWNlO1xuICAgIE9iamVjdC5rZXlzKHNwYWNlKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgIHNwYWNlW2tleV0uZm9yRWFjaChmdW5jdGlvbihvYmope1xuICAgICAgICAgICAgYnJhaW4uYWN0KG9iaik7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxudmFyIHZpZXcgPSB7XG4gICAgcmVuZGVyQ29udGV4dDogbnVsbFxufTtcblxudmlldy5yZW5kZXIgPSBmdW5jdGlvbihzcGFjZSkge1xuICAgIHZpZXcucmVuZGVyQ29udGV4dC5zdHJva2VTdHlsZSA9IFwicmdiKDAsIDAsIDApXCI7XG4gICAgdmlldy5yZW5kZXJDb250ZXh0LmZpbGxSZWN0KDAsIDAsIDYwMCwgNDAwKTtcbiAgICBPYmplY3Qua2V5cyhzcGFjZSkuZm9yRWFjaChmdW5jdGlvbihrZXkpe1xuICAgICAgICBzcGFjZVtrZXldLmZvckVhY2goZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgICAgIHZhciBwb3MgPSBvYmoucG9zO1xuICAgICAgICAgICAgb2JqLmRyYXcodmlldy5yZW5kZXJDb250ZXh0LCBNYXRoLmZsb29yKHBvcy54KSwgTWF0aC5mbG9vcihwb3MueSkpO1xuICAgICAgICB9KVxuICAgIH0pXG59O1xuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCBmdW5jdGlvbigpe1xuICAgIGdhbWUucnVuKCk7XG59KTsiLCJjb25zdCBicmFpbiA9IHJlcXVpcmUoXCIuL2JyYWluLmpzXCIpO1xuY29uc3QgY29uZmlnID0gcmVxdWlyZShcIi4vY29uZmlndXJhdGlvbi5qc1wiKTtcblxuZnVuY3Rpb24gbW92ZVRvVGFyZ2V0KGFjdG9yKSB7XG4gICAgdmFyIHRhcmdldCA9IGFjdG9yLnRhcmdldDtcblxuICAgIGlmICh0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGJyYWluLkZBSUxVUkU7XG4gICAgfVxuICAgIHZhciBkaXJlY3Rpb24gPSB0YXJnZXQucG9zLnN1YihhY3Rvci5wb3MpOyAgLy8gVmVjdG9yMlxuICAgIHZhciBkaXNwbGFjZW1lbnQgPSBhY3Rvci5zcGVlZCAqIGNvbmZpZy50aW1lU3RlcDtcbiAgICBjb25zb2xlLmVycm9yKFwiZGlzcGxhY2VtZW50OiBcIiArIGRpc3BsYWNlbWVudCk7XG4gICAgaWYgKGRpcmVjdGlvbi5sZW5ndGgoKSA8PSBkaXNwbGFjZW1lbnQpIHtcbiAgICAgICAgYWN0b3IucG9zID0gdGFyZ2V0LnBvcztcbiAgICAgICAgYWN0b3IudGFyZ2V0ID0gbnVsbDtcbiAgICAgICAgcmV0dXJuIGJyYWluLlNVQ0NFU1M7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYWN0b3IucG9zID0gYWN0b3IucG9zLmFkZChkaXJlY3Rpb24uc2NhbGUoZGlzcGxhY2VtZW50KSk7XG4gICAgICAgIHJldHVybiBicmFpbi5SVU5OSU5HO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gYWNxdWlyZUZ1cnRoZXN0VGFyZ2V0KGFjdG9yKSB7XG4gICAgdmFyIGZ1cnRoZXN0ID0ge3RhcmdldDogbnVsbCwgZGlzdGFuY2U6IDB9O1xuICAgIGlmIChhY3Rvci5oYXNPd25Qcm9wZXJ0eShcInZhbGlkVGFyZ2V0c1wiKSkge1xuICAgICAgICB2YXIgdmFsaWRUYXJnZXRzID0gYWN0b3IudmFsaWRUYXJnZXRzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBicmFpbi5GQUlMVVJFO1xuICAgIH1cbiAgICB2YWxpZFRhcmdldHMuZm9yRWFjaChmdW5jdGlvbih0YXJnZXQpe1xuICAgICAgICB2YXIgZGlzdGFuY2UgPSB0YXJnZXQucG9zLnN1YihhY3Rvci5wb3MpLmxlbmd0aCgpO1xuICAgICAgICBpZiAoZGlzdGFuY2UgPiBmdXJ0aGVzdC5kaXN0YW5jZSkge1xuICAgICAgICAgICAgZnVydGhlc3QgPSB7dGFyZ2V0OiB0YXJnZXQsIGRpc3RhbmNlOiBkaXN0YW5jZX1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgYWN0b3IudGFyZ2V0ID0gZnVydGhlc3QudGFyZ2V0O1xuICAgIHJldHVybiBicmFpbi5TVUNDRVNTXG59XG5cbnZhciBwcm9iZUJyYWluID0gbmV3IGJyYWluLkJyYWluKCk7XG5wcm9iZUJyYWluLnJlZ2lzdGVyKG1vdmVUb1RhcmdldCk7XG5wcm9iZUJyYWluLnJlZ2lzdGVyKGFjcXVpcmVGdXJ0aGVzdFRhcmdldCk7XG5wcm9iZUJyYWluLnJlZ2lzdGVyKGJyYWluLnByaW9yaXR5KG1vdmVUb1RhcmdldCwgYWNxdWlyZUZ1cnRoZXN0VGFyZ2V0KSwgXCJiYXNpY1Byb2JlXCIpO1xubW9kdWxlLmV4cG9ydHMgPSBwcm9iZUJyYWluOyIsImNvbnN0IEZBSUxVUkUgPSAwO1xuY29uc3QgU1VDQ0VTUyA9IDE7XG5jb25zdCBSVU5OSU5HID0gMjtcblxuZnVuY3Rpb24gQnJhaW4oKSB7XG4gICAgdGhpcy5iZWhhdmlvcnMgPSB7fTtcbiAgICB0aGlzLm92ZXJ3cml0ZVByb3RlY3RlZCA9IHRydWU7XG59XG5cbkJyYWluLnByb3RvdHlwZS5hY3QgPSBmdW5jdGlvbiAoYWN0b3IpIHtcbiAgICBpZiAoYWN0b3IuYmVoYXZpb3IgIT09IHVuZGVmaW5lZCAmJiBhY3Rvci5iZWhhdmlvciAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5iZWhhdmlvcnNbYWN0b3IuYmVoYXZpb3JdKGFjdG9yKTtcbiAgICB9XG59O1xuXG5CcmFpbi5wcm90b3R5cGUucmVnaXN0ZXIgPSBmdW5jdGlvbihmdW5jLCBuYW1lKSB7XG4gICAgaWYgKG5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBuYW1lID0gZnVuYy5uYW1lO1xuICAgIH1cblxuICAgIGlmIChuYW1lID09ICcnKSB7XG4gICAgICAgIHRocm93IFwiTXVzdCByZWdpc3RlciBhIGZ1bmN0aW9uIHdpdGggYSBuYW1lLlwiXG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3ZlcndyaXRlUHJvdGVjdGVkICYmIHRoaXMuYmVoYXZpb3JzLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgIHRocm93IFwiTWF5IG5vdCBzaGFkb3cgYmVoYXZpb3IgbmFtZXMuXCJcbiAgICB9XG5cbiAgICB0aGlzLmJlaGF2aW9yc1tuYW1lXSA9IGZ1bmM7XG59O1xuXG5mdW5jdGlvbiBwcmlvcml0eSgpIHtcbiAgICB2YXIgY2hpbGRyZW4gPSBBcnJheS5mcm9tKGFyZ3VtZW50cyk7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKGFjdG9yKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBjaGlsZHJlbltpXShhY3Rvcik7XG4gICAgICAgICAgICBpZiAocmVzdWx0ICE9PSBGQUlMVVJFKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gRkFJTFVSRVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIHNlcXVlbmNlKCkge1xuICAgIHZhciBjaGlsZHJlbiA9IEFycmF5LmZyb20oYXJndW1lbnRzKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oYWN0b3IpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGNoaWxkcmVuW2ldKGFjdG9yKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQgIT09IFNVQ0NFU1MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBTVUNDRVNTXG4gICAgfVxufVxuXG5leHBvcnRzLkJyYWluID0gQnJhaW47XG5leHBvcnRzLnByaW9yaXR5ID0gcHJpb3JpdHk7XG5leHBvcnRzLnNlcXVlbmNlID0gc2VxdWVuY2U7XG5leHBvcnRzLlJVTk5JTkcgPSBSVU5OSU5HO1xuZXhwb3J0cy5TVUNDRVNTID0gU1VDQ0VTUztcbmV4cG9ydHMuRkFJTFVSRSA9IEZBSUxVUkU7IiwiLy8gVE9ETzogWUFNTCBDb25maWd1cmF0aW9uXG5cbm1vZHVsZS5leHBvcnRzLnRpbWVTdGVwID0gMTY7IiwiY29uc3QgVmVjdG9yID0gcmVxdWlyZShcIi4uL3ZlY3Rvci5qc1wiKTtcblxuZnVuY3Rpb24gQmVhY29uKHgsIHkpe1xuICAgIHRoaXMucG9zID0gbmV3IFZlY3Rvcih4LCB5KTtcbiAgICB0aGlzLnNpemUgPSAzO1xuICAgIHRoaXMuY29sb3IgPSBcInJnYigyMDAsIDIwMCwgMjU1KVwiXG59XG5cbkJlYWNvbi5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKHRpbWVTdGVwKSB7fTtcblxuQmVhY29uLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gKGNhbnZhcywgeCwgeSkge1xuICAgIGNhbnZhcy5zdHJva2VTdHlsZSA9IHRoaXMuY29sb3I7XG4gICAgY2FudmFzLmJlZ2luUGF0aCgpO1xuICAgIGNhbnZhcy5hcmMoeCwgeSwgdGhpcy5zaXplLCAwLCBNYXRoLlBJICogMik7XG4gICAgY2FudmFzLnN0cm9rZSgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCZWFjb247IiwiY29uc3QgVmVjdG9yID0gcmVxdWlyZShcIi4uL3ZlY3Rvci5qc1wiKTtcbi8vIFRPRE86IENvbnNpZGVyIFJhZGFyIG9iamVjdC4gQ3VzdG9taXphYmxlIHZpZXdzLlxuXG5mdW5jdGlvbiBQcm9iZSh4LCB5KSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgdGhpcy5wb3MgPSBuZXcgVmVjdG9yKHgsIHkpO1xuICAgIHRoaXMuc2l6ZSA9IDU7XG4gICAgdGhpcy5zcGVlZCA9IDAuMDY7XG4gICAgdGhpcy50YXJnZXQgPSBudWxsO1xuICAgIHRoaXMuY29sb3IgPSBcInJnYigyMDAsIDI1NSwgMjIwKVwiOyAvLyBUT0RPOiBBZGQgcGFyYW1ldGVycy5cbiAgICB0aGlzLmJlaGF2aW9yID0gXCJiYXNpY1Byb2JlXCI7XG59XG5cblByb2JlLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gKGNhbnZhcywgeCwgeSkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGNhbnZhcy5zdHJva2VTdHlsZSA9IHRoaXMuY29sb3I7XG4gICAgY2FudmFzLmJlZ2luUGF0aCgpO1xuICAgIGNhbnZhcy5hcmMoeCwgeSwgdGhpcy5zaXplLCAwLCBNYXRoLlBJICogMik7XG4gICAgY2FudmFzLnN0cm9rZSgpO1xufTtcblxuUHJvYmUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICh0aW1lU3RlcCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIC8vIEZvcmVzdC5hY3QodGhpcywgdGltZVN0ZXApO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcm9iZTsiLCJmdW5jdGlvbiBWZWN0b3IoeCwgeSkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgICB0aGlzLl9sZW5ndGggPSBudWxsO1xuICAgIHRoaXMuX25vcm1hbCA9IG51bGw7XG59XG5cblZlY3Rvci5wcm90b3R5cGUuc3ViID0gZnVuY3Rpb24gKG90aGVyKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgcmV0dXJuIG5ldyBWZWN0b3IodGhpcy54IC0gb3RoZXIueCwgdGhpcy55IC0gb3RoZXIueSk7XG59O1xuXG5WZWN0b3IucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChvdGhlcikge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHJldHVybiBuZXcgVmVjdG9yKHRoaXMueCArIG90aGVyLngsIHRoaXMueSArIG90aGVyLnkpO1xufTtcblxuVmVjdG9yLnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgaWYgKHRoaXMuX2xlbmd0aCA9PT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9sZW5ndGggPSBNYXRoLnNxcnQoTWF0aC5wb3codGhpcy54LCAyKSArIE1hdGgucG93KHRoaXMueCwgMikpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fbGVuZ3RoO1xufTtcblxuVmVjdG9yLnByb3RvdHlwZS5ub3JtYWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgaWYgKHRoaXMuX25vcm1hbCA9PT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9ub3JtYWwgPSB0aGlzLm5vcm1hbCgpO1xuICAgICAgICB0aGlzLl9ub3JtYWwuX25vcm1hbCA9IHRoaXMuX25vcm1hbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX25vcm1hbDtcbn07XG5cblZlY3Rvci5wcm90b3R5cGUuc2NhbGUgPSBmdW5jdGlvbiAobGVuZ3RoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgdmFyIHJhdGlvID0gbGVuZ3RoIC8gdGhpcy5sZW5ndGgoKTtcbiAgICByZXR1cm4gbmV3IFZlY3Rvcih0aGlzLnggKiByYXRpbywgdGhpcy55ICogcmF0aW8pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBWZWN0b3I7Il19
