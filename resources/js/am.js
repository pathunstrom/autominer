(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
const Probe = require("./gameobjects/probe.js");
const Beacon = require("./gameobjects/beacon.js");
const config = require("./configuration.js");
const brain = require("./behaviors.js");
const Controller = require("./controller.js");

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
    var controller = new Controller(canvas, game.space);
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
},{"./behaviors.js":2,"./configuration.js":4,"./controller.js":5,"./gameobjects/beacon.js":6,"./gameobjects/probe.js":7}],2:[function(require,module,exports){
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
        console.debug("Target reached.");
    }
    console.log("Old distance: " + actor.distance);
    console.log("New distance: " + newDistance);
    actor.distance = newDistance;
    actor.runTime = time;
    return brain.SUCCESS;
}

function updatePosition(actor) {
    function logPosition(age, pos) {
        console.debug(age + " position: " + pos.x + ", " + pos.y);
    }
    logPosition("Old", actor.pos);
    actor.pos = actor.direction.scale(actor.distance).add(actor.origin);
    logPosition("New", actor.pos);
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

function Controller(canvas, space) {
    this.canvas = canvas;
    this.space = space;
    this.canvas.addEventListener("click", this.click.bind(this));
}

Controller.prototype.click = function (event) {
    var x = event.offsetX;
    var y = event.offsetY;
    this.space.beacons.push(new Beacon(x, y))
};

module.exports = Controller;
},{"./gameobjects/beacon.js":6}],6:[function(require,module,exports){
const Vector = require("../vector.js");

function Beacon(x, y) {
    this.origin = new Vector(300, 400);
    this.pos = this.origin;
    this.direction = new Vector(x, y).sub(this.pos);
    console.log("Beacon direction: " + this.direction);
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
},{"../vector.js":8}],7:[function(require,module,exports){
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
},{"../vector.js":8}],8:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNyYy9hdXRvbWluZXIuanMiLCJzcmMvYmVoYXZpb3JzLmpzIiwic3JjL2JyYWluLmpzIiwic3JjL2NvbmZpZ3VyYXRpb24uanMiLCJzcmMvY29udHJvbGxlci5qcyIsInNyYy9nYW1lb2JqZWN0cy9iZWFjb24uanMiLCJzcmMvZ2FtZW9iamVjdHMvcHJvYmUuanMiLCJzcmMvdmVjdG9yLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiY29uc3QgUHJvYmUgPSByZXF1aXJlKFwiLi9nYW1lb2JqZWN0cy9wcm9iZS5qc1wiKTtcbmNvbnN0IEJlYWNvbiA9IHJlcXVpcmUoXCIuL2dhbWVvYmplY3RzL2JlYWNvbi5qc1wiKTtcbmNvbnN0IGNvbmZpZyA9IHJlcXVpcmUoXCIuL2NvbmZpZ3VyYXRpb24uanNcIik7XG5jb25zdCBicmFpbiA9IHJlcXVpcmUoXCIuL2JlaGF2aW9ycy5qc1wiKTtcbmNvbnN0IENvbnRyb2xsZXIgPSByZXF1aXJlKFwiLi9jb250cm9sbGVyLmpzXCIpO1xuXG52YXIgZ2FtZSA9IHtcbiAgICBzcGVudERlbHRhOiAwLFxuICAgIHNwYWNlOiB7fVxufTtcblxuZ2FtZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG5cbiAgICB0aGlzLnNwYWNlLmJlYWNvbnMgPSBbbmV3IEJlYWNvbigyMCwgMjApLCBuZXcgQmVhY29uKDU4MCwgMzgwKV07XG5cbiAgICB2YXIgcHJvYmUgPSBuZXcgUHJvYmUoMjAsIDIwKTtcbiAgICBwcm9iZS52YWxpZFRhcmdldHMgPSB0aGlzLnNwYWNlLmJlYWNvbnM7XG4gICAgdGhpcy5zcGFjZS5wcm9iZXMgPSBbcHJvYmVdO1xuXG4gICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYXV0b21pbmVyLWNhbnZhc1wiKTtcbiAgICB2YXIgY29udHJvbGxlciA9IG5ldyBDb250cm9sbGVyKGNhbnZhcywgZ2FtZS5zcGFjZSk7XG4gICAgdmlldy5yZW5kZXJDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICB2aWV3LnJlbmRlcihnYW1lLnNwYWNlKTtcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGdhbWUudXBkYXRlKVxufTtcblxuZ2FtZS51cGRhdGUgPSBmdW5jdGlvbiAodGltZSkge1xuICAgIHZhciB1bnNwZW50RGVsdGEgPSB0aW1lIC0gZ2FtZS5zcGVudERlbHRhO1xuICAgIGZvciAoOyB1bnNwZW50RGVsdGEgPiBjb25maWcudGltZVN0ZXA7IHVuc3BlbnREZWx0YSAtPSBjb25maWcudGltZVN0ZXApIHtcbiAgICAgICAgZ2FtZS5zaW11bGF0ZSgpXG4gICAgfVxuICAgIGdhbWUuc3BlbnREZWx0YSA9IHRpbWUgLSB1bnNwZW50RGVsdGE7XG4gICAgdmlldy5yZW5kZXIoZ2FtZS5zcGFjZSk7XG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lLnVwZGF0ZSlcbn07XG5cbmdhbWUuc2ltdWxhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNwYWNlID0gZ2FtZS5zcGFjZTtcbiAgICBPYmplY3Qua2V5cyhzcGFjZSkuZm9yRWFjaChmdW5jdGlvbihrZXkpe1xuICAgICAgICBzcGFjZVtrZXldLmZvckVhY2goZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgICAgIGJyYWluLmFjdChvYmopO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbnZhciB2aWV3ID0ge1xuICAgIHJlbmRlckNvbnRleHQ6IG51bGxcbn07XG5cbnZpZXcucmVuZGVyID0gZnVuY3Rpb24oc3BhY2UpIHtcbiAgICB2aWV3LnJlbmRlckNvbnRleHQuc3Ryb2tlU3R5bGUgPSBcInJnYigwLCAwLCAwKVwiO1xuICAgIHZpZXcucmVuZGVyQ29udGV4dC5maWxsUmVjdCgwLCAwLCA2MDAsIDQwMCk7XG4gICAgT2JqZWN0LmtleXMoc3BhY2UpLmZvckVhY2goZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgc3BhY2Vba2V5XS5mb3JFYWNoKGZ1bmN0aW9uKG9iail7XG4gICAgICAgICAgICB2YXIgcG9zID0gb2JqLnBvcztcbiAgICAgICAgICAgIG9iai5kcmF3KHZpZXcucmVuZGVyQ29udGV4dCwgTWF0aC5mbG9vcihwb3MueCksIE1hdGguZmxvb3IocG9zLnkpKTtcbiAgICAgICAgfSlcbiAgICB9KVxufTtcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgZnVuY3Rpb24oKXtcbiAgICBnYW1lLnJ1bigpO1xufSk7IiwiY29uc3QgYnJhaW4gPSByZXF1aXJlKFwiLi9icmFpbi5qc1wiKTtcbmNvbnN0IGNvbmZpZyA9IHJlcXVpcmUoXCIuL2NvbmZpZ3VyYXRpb24uanNcIik7XG5cbmZ1bmN0aW9uIG1vdmVUb1RhcmdldChhY3Rvcikge1xuICAgIHZhciB0YXJnZXQgPSBhY3Rvci50YXJnZXQ7XG5cbiAgICBpZiAodGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBicmFpbi5GQUlMVVJFO1xuICAgIH1cbiAgICB2YXIgZGlyZWN0aW9uID0gdGFyZ2V0LnBvcy5zdWIoYWN0b3IucG9zKTsgIC8vIFZlY3RvcjJcbiAgICB2YXIgZGlzcGxhY2VtZW50ID0gYWN0b3Iuc3BlZWQgKiBjb25maWcudGltZVN0ZXA7XG4gICAgaWYgKGRpcmVjdGlvbi5sZW5ndGgoKSA8PSBkaXNwbGFjZW1lbnQpIHtcbiAgICAgICAgYWN0b3IucG9zID0gdGFyZ2V0LnBvcztcbiAgICAgICAgYWN0b3IudGFyZ2V0ID0gbnVsbDtcbiAgICAgICAgcmV0dXJuIGJyYWluLlNVQ0NFU1M7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYWN0b3IucG9zID0gYWN0b3IucG9zLmFkZChkaXJlY3Rpb24uc2NhbGUoZGlzcGxhY2VtZW50KSk7XG4gICAgICAgIHJldHVybiBicmFpbi5SVU5OSU5HO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gYWNxdWlyZUZ1cnRoZXN0VGFyZ2V0KGFjdG9yKSB7XG4gICAgdmFyIGZ1cnRoZXN0ID0ge3RhcmdldDogbnVsbCwgZGlzdGFuY2U6IDB9O1xuICAgIGlmIChhY3Rvci5oYXNPd25Qcm9wZXJ0eShcInZhbGlkVGFyZ2V0c1wiKSkge1xuICAgICAgICB2YXIgdmFsaWRUYXJnZXRzID0gYWN0b3IudmFsaWRUYXJnZXRzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBicmFpbi5GQUlMVVJFO1xuICAgIH1cbiAgICB2YWxpZFRhcmdldHMuZm9yRWFjaChmdW5jdGlvbih0YXJnZXQpe1xuICAgICAgICB2YXIgZGlzdGFuY2UgPSB0YXJnZXQucG9zLnN1YihhY3Rvci5wb3MpLmxlbmd0aCgpO1xuICAgICAgICBpZiAoZGlzdGFuY2UgPiBmdXJ0aGVzdC5kaXN0YW5jZSkge1xuICAgICAgICAgICAgZnVydGhlc3QgPSB7dGFyZ2V0OiB0YXJnZXQsIGRpc3RhbmNlOiBkaXN0YW5jZX1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgYWN0b3IudGFyZ2V0ID0gZnVydGhlc3QudGFyZ2V0O1xuICAgIHJldHVybiBicmFpbi5TVUNDRVNTXG59XG5cbmZ1bmN0aW9uIGVhc2VEaXN0YW5jZShhY3Rvcikge1xuICAgIGlmICghYWN0b3IuaGFzT3duUHJvcGVydHkoXCJ0YXJnZXREaXN0YW5jZVwiKSB8fCBhY3Rvci50YXJnZXREaXN0YW5jZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBicmFpbi5GQUlMVVJFO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNpcmN1bGFyRWFzZSAodGltZSwgdGFyZ2V0LCBkdXJhdGlvbikge1xuICAgICAgICB0aW1lID0gKHRpbWUgLyBkdXJhdGlvbikgLSAxO1xuICAgICAgICByZXR1cm4gdGFyZ2V0ICogTWF0aC5zcXJ0KDEgLSB0aW1lKnRpbWUpO1xuICAgIH1cblxuICAgIHZhciB0aW1lID0gYWN0b3IucnVuVGltZSArIGNvbmZpZy50aW1lU3RlcDtcbiAgICB2YXIgdGFyZ2V0ID0gYWN0b3IudGFyZ2V0RGlzdGFuY2U7XG4gICAgdmFyIGR1cmF0aW9uID0gYWN0b3IuZHVyYXRpb247XG4gICAgdmFyIG5ld0Rpc3RhbmNlID0gYWN0b3IuZGlzdGFuY2U7XG4gICAgaWYgKHRpbWUgPCBkdXJhdGlvbikge1xuICAgICAgICBuZXdEaXN0YW5jZSA9IGNpcmN1bGFyRWFzZSh0aW1lLCB0YXJnZXQsIGR1cmF0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBuZXdEaXN0YW5jZSA9IHRhcmdldDtcbiAgICAgICAgY29uc29sZS5kZWJ1ZyhcIlRhcmdldCByZWFjaGVkLlwiKTtcbiAgICB9XG4gICAgY29uc29sZS5sb2coXCJPbGQgZGlzdGFuY2U6IFwiICsgYWN0b3IuZGlzdGFuY2UpO1xuICAgIGNvbnNvbGUubG9nKFwiTmV3IGRpc3RhbmNlOiBcIiArIG5ld0Rpc3RhbmNlKTtcbiAgICBhY3Rvci5kaXN0YW5jZSA9IG5ld0Rpc3RhbmNlO1xuICAgIGFjdG9yLnJ1blRpbWUgPSB0aW1lO1xuICAgIHJldHVybiBicmFpbi5TVUNDRVNTO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVQb3NpdGlvbihhY3Rvcikge1xuICAgIGZ1bmN0aW9uIGxvZ1Bvc2l0aW9uKGFnZSwgcG9zKSB7XG4gICAgICAgIGNvbnNvbGUuZGVidWcoYWdlICsgXCIgcG9zaXRpb246IFwiICsgcG9zLnggKyBcIiwgXCIgKyBwb3MueSk7XG4gICAgfVxuICAgIGxvZ1Bvc2l0aW9uKFwiT2xkXCIsIGFjdG9yLnBvcyk7XG4gICAgYWN0b3IucG9zID0gYWN0b3IuZGlyZWN0aW9uLnNjYWxlKGFjdG9yLmRpc3RhbmNlKS5hZGQoYWN0b3Iub3JpZ2luKTtcbiAgICBsb2dQb3NpdGlvbihcIk5ld1wiLCBhY3Rvci5wb3MpO1xuICAgIHJldHVybiBicmFpbi5TVUNDRVNTO1xufVxuXG5mdW5jdGlvbiBjbGVhblVwRWFzaW5nKGFjdG9yKSB7XG4gICAgaWYgKGFjdG9yLmRpc3RhbmNlID09IGFjdG9yLnRhcmdldERpc3RhbmNlKSB7XG4gICAgICAgIGFjdG9yLnRhcmdldERpc3RhbmNlID0gdW5kZWZpbmVkO1xuICAgICAgICBhY3Rvci5ydW5UaW1lID0gMDtcbiAgICAgICAgcmV0dXJuIGJyYWluLlNVQ0NFU1M7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGJyYWluLkZBSUxVUkU7XG4gICAgfVxufVxuXG52YXIgcHJvYmVCcmFpbiA9IG5ldyBicmFpbi5CcmFpbigpO1xucHJvYmVCcmFpbi5yZWdpc3Rlcihtb3ZlVG9UYXJnZXQpO1xucHJvYmVCcmFpbi5yZWdpc3RlcihhY3F1aXJlRnVydGhlc3RUYXJnZXQpO1xucHJvYmVCcmFpbi5yZWdpc3RlcihicmFpbi5wcmlvcml0eShtb3ZlVG9UYXJnZXQsIGFjcXVpcmVGdXJ0aGVzdFRhcmdldCksIFwiYmFzaWNQcm9iZVwiKTtcbnByb2JlQnJhaW4ucmVnaXN0ZXIoYnJhaW4uc2VxdWVuY2UoZWFzZURpc3RhbmNlLCB1cGRhdGVQb3NpdGlvbiwgY2xlYW5VcEVhc2luZyksIFwibGF1bmNoQmVhY29uXCIpO1xubW9kdWxlLmV4cG9ydHMgPSBwcm9iZUJyYWluOyIsImNvbnN0IEZBSUxVUkUgPSAwO1xuY29uc3QgU1VDQ0VTUyA9IDE7XG5jb25zdCBSVU5OSU5HID0gMjtcblxuZnVuY3Rpb24gQnJhaW4oKSB7XG4gICAgdGhpcy5iZWhhdmlvcnMgPSB7fTtcbiAgICB0aGlzLm92ZXJ3cml0ZVByb3RlY3RlZCA9IHRydWU7XG59XG5cbkJyYWluLnByb3RvdHlwZS5hY3QgPSBmdW5jdGlvbiAoYWN0b3IpIHtcbiAgICBpZiAoYWN0b3IuYmVoYXZpb3IgIT09IHVuZGVmaW5lZCAmJiBhY3Rvci5iZWhhdmlvciAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5iZWhhdmlvcnNbYWN0b3IuYmVoYXZpb3JdKGFjdG9yKTtcbiAgICB9XG59O1xuXG5CcmFpbi5wcm90b3R5cGUucmVnaXN0ZXIgPSBmdW5jdGlvbihmdW5jLCBuYW1lKSB7XG4gICAgaWYgKG5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBuYW1lID0gZnVuYy5uYW1lO1xuICAgIH1cblxuICAgIGlmIChuYW1lID09ICcnKSB7XG4gICAgICAgIHRocm93IFwiTXVzdCByZWdpc3RlciBhIGZ1bmN0aW9uIHdpdGggYSBuYW1lLlwiXG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3ZlcndyaXRlUHJvdGVjdGVkICYmIHRoaXMuYmVoYXZpb3JzLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgIHRocm93IFwiTWF5IG5vdCBzaGFkb3cgYmVoYXZpb3IgbmFtZXMuXCJcbiAgICB9XG5cbiAgICB0aGlzLmJlaGF2aW9yc1tuYW1lXSA9IGZ1bmM7XG59O1xuXG5mdW5jdGlvbiBwcmlvcml0eSgpIHtcbiAgICB2YXIgY2hpbGRyZW4gPSBBcnJheS5mcm9tKGFyZ3VtZW50cyk7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKGFjdG9yKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBjaGlsZHJlbltpXShhY3Rvcik7XG4gICAgICAgICAgICBpZiAocmVzdWx0ICE9PSBGQUlMVVJFKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gRkFJTFVSRVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIHNlcXVlbmNlKCkge1xuICAgIHZhciBjaGlsZHJlbiA9IEFycmF5LmZyb20oYXJndW1lbnRzKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oYWN0b3IpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGNoaWxkcmVuW2ldKGFjdG9yKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQgIT09IFNVQ0NFU1MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBTVUNDRVNTXG4gICAgfVxufVxuXG5leHBvcnRzLkJyYWluID0gQnJhaW47XG5leHBvcnRzLnByaW9yaXR5ID0gcHJpb3JpdHk7XG5leHBvcnRzLnNlcXVlbmNlID0gc2VxdWVuY2U7XG5leHBvcnRzLlJVTk5JTkcgPSBSVU5OSU5HO1xuZXhwb3J0cy5TVUNDRVNTID0gU1VDQ0VTUztcbmV4cG9ydHMuRkFJTFVSRSA9IEZBSUxVUkU7IiwiLy8gVE9ETzogWUFNTCBDb25maWd1cmF0aW9uXG5cbm1vZHVsZS5leHBvcnRzLnRpbWVTdGVwID0gMTY7IiwiY29uc3QgQmVhY29uID0gcmVxdWlyZShcIi4vZ2FtZW9iamVjdHMvYmVhY29uLmpzXCIpO1xuXG5mdW5jdGlvbiBDb250cm9sbGVyKGNhbnZhcywgc3BhY2UpIHtcbiAgICB0aGlzLmNhbnZhcyA9IGNhbnZhcztcbiAgICB0aGlzLnNwYWNlID0gc3BhY2U7XG4gICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRoaXMuY2xpY2suYmluZCh0aGlzKSk7XG59XG5cbkNvbnRyb2xsZXIucHJvdG90eXBlLmNsaWNrID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdmFyIHggPSBldmVudC5vZmZzZXRYO1xuICAgIHZhciB5ID0gZXZlbnQub2Zmc2V0WTtcbiAgICB0aGlzLnNwYWNlLmJlYWNvbnMucHVzaChuZXcgQmVhY29uKHgsIHkpKVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sbGVyOyIsImNvbnN0IFZlY3RvciA9IHJlcXVpcmUoXCIuLi92ZWN0b3IuanNcIik7XG5cbmZ1bmN0aW9uIEJlYWNvbih4LCB5KSB7XG4gICAgdGhpcy5vcmlnaW4gPSBuZXcgVmVjdG9yKDMwMCwgNDAwKTtcbiAgICB0aGlzLnBvcyA9IHRoaXMub3JpZ2luO1xuICAgIHRoaXMuZGlyZWN0aW9uID0gbmV3IFZlY3Rvcih4LCB5KS5zdWIodGhpcy5wb3MpO1xuICAgIGNvbnNvbGUubG9nKFwiQmVhY29uIGRpcmVjdGlvbjogXCIgKyB0aGlzLmRpcmVjdGlvbik7XG4gICAgdGhpcy50YXJnZXREaXN0YW5jZSA9IHRoaXMuZGlyZWN0aW9uLmxlbmd0aCgpO1xuICAgIHRoaXMuZGlzdGFuY2UgPSAwO1xuICAgIHRoaXMuZHVyYXRpb24gPSAyMDAwO1xuICAgIHRoaXMucnVuVGltZSA9IDA7XG5cbiAgICB0aGlzLmNvbG9yID0gXCJyZ2IoMjAwLCAyMDAsIDI1NSlcIjtcbiAgICB0aGlzLnNpemUgPSAzO1xuXG4gICAgdGhpcy5iZWhhdmlvciA9IFwibGF1bmNoQmVhY29uXCI7XG59XG5cbkJlYWNvbi5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uIChjYW52YXMsIHgsIHkpIHtcbiAgICBjYW52YXMuc3Ryb2tlU3R5bGUgPSB0aGlzLmNvbG9yO1xuICAgIGNhbnZhcy5iZWdpblBhdGgoKTtcbiAgICBjYW52YXMuYXJjKHgsIHksIHRoaXMuc2l6ZSwgMCwgTWF0aC5QSSAqIDIpO1xuICAgIGNhbnZhcy5zdHJva2UoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQmVhY29uOyIsImNvbnN0IFZlY3RvciA9IHJlcXVpcmUoXCIuLi92ZWN0b3IuanNcIik7XG4vLyBUT0RPOiBDb25zaWRlciBSYWRhciBvYmplY3QuIEN1c3RvbWl6YWJsZSB2aWV3cy5cblxuZnVuY3Rpb24gUHJvYmUoeCwgeSkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHRoaXMucG9zID0gbmV3IFZlY3Rvcih4LCB5KTtcbiAgICB0aGlzLnNpemUgPSA1O1xuICAgIHRoaXMuc3BlZWQgPSAwLjA2O1xuICAgIHRoaXMudGFyZ2V0ID0gbnVsbDtcbiAgICB0aGlzLmNvbG9yID0gXCJyZ2IoMjAwLCAyNTUsIDIyMClcIjsgLy8gVE9ETzogQWRkIHBhcmFtZXRlcnMuXG4gICAgdGhpcy5iZWhhdmlvciA9IFwiYmFzaWNQcm9iZVwiO1xufVxuXG5Qcm9iZS5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uIChjYW52YXMsIHgsIHkpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICBjYW52YXMuc3Ryb2tlU3R5bGUgPSB0aGlzLmNvbG9yO1xuICAgIGNhbnZhcy5iZWdpblBhdGgoKTtcbiAgICBjYW52YXMuYXJjKHgsIHksIHRoaXMuc2l6ZSwgMCwgTWF0aC5QSSAqIDIpO1xuICAgIGNhbnZhcy5zdHJva2UoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJvYmU7IiwiZnVuY3Rpb24gVmVjdG9yKHgsIHkpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy5fbGVuZ3RoID0gbnVsbDtcbiAgICB0aGlzLl9ub3JtYWwgPSBudWxsO1xufVxuXG5WZWN0b3IucHJvdG90eXBlLnN1YiA9IGZ1bmN0aW9uIChvdGhlcikge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHJldHVybiBuZXcgVmVjdG9yKHRoaXMueCAtIG90aGVyLngsIHRoaXMueSAtIG90aGVyLnkpO1xufTtcblxuVmVjdG9yLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAob3RoZXIpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICByZXR1cm4gbmV3IFZlY3Rvcih0aGlzLnggKyBvdGhlci54LCB0aGlzLnkgKyBvdGhlci55KTtcbn07XG5cblZlY3Rvci5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGlmICh0aGlzLl9sZW5ndGggPT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5fbGVuZ3RoID0gTWF0aC5zcXJ0KE1hdGgucG93KHRoaXMueCwgMikgKyBNYXRoLnBvdyh0aGlzLngsIDIpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2xlbmd0aDtcbn07XG5cblZlY3Rvci5wcm90b3R5cGUubm9ybWFsID0gZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGlmICh0aGlzLl9ub3JtYWwgPT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5fbm9ybWFsID0gdGhpcy5ub3JtYWwoKTtcbiAgICAgICAgdGhpcy5fbm9ybWFsLl9ub3JtYWwgPSB0aGlzLl9ub3JtYWw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9ub3JtYWw7XG59O1xuXG5WZWN0b3IucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24gKGxlbmd0aCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciByYXRpbyA9IGxlbmd0aCAvIHRoaXMubGVuZ3RoKCk7XG4gICAgcmV0dXJuIG5ldyBWZWN0b3IodGhpcy54ICogcmF0aW8sIHRoaXMueSAqIHJhdGlvKTtcbn07XG5cblZlY3Rvci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFwiVmVjdG9yKFwiICsgdGhpcy54ICsgXCIsIFwiICsgdGhpcy55ICsgXCIpXCI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZlY3RvcjsiXX0=
