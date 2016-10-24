(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
const Probe = require("./gameobjects/probe.js");
const Beacon = require("./gameobjects/beacon.js");
const config = require("./configuration");
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
},{"./behaviors.js":2,"./configuration":4,"./gameobjects/beacon.js":5,"./gameobjects/probe.js":6}],2:[function(require,module,exports){
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
    return new Vector(this.x + other.x, this.y - other.y);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImF1dG9taW5lci5qcyIsImJlaGF2aW9ycy5qcyIsImJyYWluLmpzIiwiY29uZmlndXJhdGlvbi5qcyIsImdhbWVvYmplY3RzL2JlYWNvbi5qcyIsImdhbWVvYmplY3RzL3Byb2JlLmpzIiwidmVjdG9yLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiY29uc3QgUHJvYmUgPSByZXF1aXJlKFwiLi9nYW1lb2JqZWN0cy9wcm9iZS5qc1wiKTtcbmNvbnN0IEJlYWNvbiA9IHJlcXVpcmUoXCIuL2dhbWVvYmplY3RzL2JlYWNvbi5qc1wiKTtcbmNvbnN0IGNvbmZpZyA9IHJlcXVpcmUoXCIuL2NvbmZpZ3VyYXRpb25cIik7XG5jb25zdCBicmFpbiA9IHJlcXVpcmUoXCIuL2JlaGF2aW9ycy5qc1wiKTtcblxudmFyIGdhbWUgPSB7XG4gICAgc3BlbnREZWx0YTogMCxcbiAgICBzcGFjZToge31cbn07XG5cbmdhbWUucnVuID0gZnVuY3Rpb24gKCkge1xuXG4gICAgdGhpcy5zcGFjZS5iZWFjb25zID0gW25ldyBCZWFjb24oMjAsIDIwKSwgbmV3IEJlYWNvbig1ODAsIDM4MCldO1xuXG4gICAgdmFyIHByb2JlID0gbmV3IFByb2JlKDIwLCAyMCk7XG4gICAgcHJvYmUudmFsaWRUYXJnZXRzID0gdGhpcy5zcGFjZS5iZWFjb25zO1xuICAgIHRoaXMuc3BhY2UucHJvYmVzID0gW3Byb2JlXTtcblxuICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImF1dG9taW5lci1jYW52YXNcIik7XG4gICAgdmlldy5yZW5kZXJDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICB2aWV3LnJlbmRlcihnYW1lLnNwYWNlKTtcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGdhbWUudXBkYXRlKVxufTtcblxuZ2FtZS51cGRhdGUgPSBmdW5jdGlvbiAodGltZSkge1xuICAgIHZhciB1bnNwZW50RGVsdGEgPSB0aW1lIC0gZ2FtZS5zcGVudERlbHRhO1xuICAgIGZvciAoOyB1bnNwZW50RGVsdGEgPiBjb25maWcudGltZVN0ZXA7IHVuc3BlbnREZWx0YSAtPSBjb25maWcudGltZVN0ZXApIHtcbiAgICAgICAgZ2FtZS5zaW11bGF0ZSgpXG4gICAgfVxuICAgIGdhbWUuc3BlbnREZWx0YSA9IHRpbWUgLSB1bnNwZW50RGVsdGE7XG4gICAgdmlldy5yZW5kZXIoZ2FtZS5zcGFjZSk7XG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lLnVwZGF0ZSlcbn07XG5cbmdhbWUuc2ltdWxhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNwYWNlID0gZ2FtZS5zcGFjZTtcbiAgICBPYmplY3Qua2V5cyhzcGFjZSkuZm9yRWFjaChmdW5jdGlvbihrZXkpe1xuICAgICAgICBzcGFjZVtrZXldLmZvckVhY2goZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgICAgIGJyYWluLmFjdChvYmopO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbnZhciB2aWV3ID0ge1xuICAgIHJlbmRlckNvbnRleHQ6IG51bGxcbn07XG5cbnZpZXcucmVuZGVyID0gZnVuY3Rpb24oc3BhY2UpIHtcbiAgICB2aWV3LnJlbmRlckNvbnRleHQuc3Ryb2tlU3R5bGUgPSBcInJnYigwLCAwLCAwKVwiO1xuICAgIHZpZXcucmVuZGVyQ29udGV4dC5maWxsUmVjdCgwLCAwLCA2MDAsIDQwMCk7XG4gICAgT2JqZWN0LmtleXMoc3BhY2UpLmZvckVhY2goZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgc3BhY2Vba2V5XS5mb3JFYWNoKGZ1bmN0aW9uKG9iail7XG4gICAgICAgICAgICB2YXIgcG9zID0gb2JqLnBvcztcbiAgICAgICAgICAgIG9iai5kcmF3KHZpZXcucmVuZGVyQ29udGV4dCwgcG9zLngsIHBvcy55KTtcbiAgICAgICAgfSlcbiAgICB9KVxufTtcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgZnVuY3Rpb24oKXtcbiAgICBnYW1lLnJ1bigpO1xufSk7IiwiY29uc3QgYnJhaW4gPSByZXF1aXJlKFwiLi9icmFpbi5qc1wiKTtcbmNvbnN0IGNvbmZpZyA9IHJlcXVpcmUoXCIuL2NvbmZpZ3VyYXRpb24uanNcIik7XG5cbmZ1bmN0aW9uIG1vdmVUb1RhcmdldChhY3Rvcikge1xuICAgIHZhciB0YXJnZXQgPSBhY3Rvci50YXJnZXQ7XG5cbiAgICBpZiAodGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBicmFpbi5GQUlMVVJFO1xuICAgIH1cbiAgICB2YXIgZGlyZWN0aW9uID0gdGFyZ2V0LnBvcy5zdWIoYWN0b3IucG9zKTsgIC8vIFZlY3RvcjJcbiAgICB2YXIgZGlzcGxhY2VtZW50ID0gYWN0b3Iuc3BlZWQgKiBjb25maWcudGltZVN0ZXA7XG4gICAgaWYgKGRpcmVjdGlvbi5sZW5ndGgoKSA8PSBkaXNwbGFjZW1lbnQpIHtcbiAgICAgICAgYWN0b3IucG9zID0gdGFyZ2V0LnBvcztcbiAgICAgICAgYWN0b3IudGFyZ2V0ID0gbnVsbDtcbiAgICAgICAgcmV0dXJuIGJyYWluLlNVQ0NFU1M7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYWN0b3IucG9zID0gYWN0b3IucG9zLmFkZChkaXJlY3Rpb24uc2NhbGUoZGlzcGxhY2VtZW50KSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBhY3F1aXJlRnVydGhlc3RUYXJnZXQoYWN0b3IpIHtcbiAgICB2YXIgZnVydGhlc3QgPSB7dGFyZ2V0OiBudWxsLCBkaXN0YW5jZTogMH07XG4gICAgaWYgKGFjdG9yLmhhc093blByb3BlcnR5KFwidmFsaWRUYXJnZXRzXCIpKSB7XG4gICAgICAgIHZhciB2YWxpZFRhcmdldHMgPSBhY3Rvci52YWxpZFRhcmdldHM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGJyYWluLkZBSUxVUkU7XG4gICAgfVxuICAgIHZhbGlkVGFyZ2V0cy5mb3JFYWNoKGZ1bmN0aW9uKHRhcmdldCl7XG4gICAgICAgIHZhciBkaXN0YW5jZSA9IHRhcmdldC5wb3Muc3ViKGFjdG9yLnBvcykubGVuZ3RoKCk7XG4gICAgICAgIGlmIChkaXN0YW5jZSA+IGZ1cnRoZXN0LmRpc3RhbmNlKSB7XG4gICAgICAgICAgICBmdXJ0aGVzdCA9IHt0YXJnZXQ6IHRhcmdldCwgZGlzdGFuY2U6IGRpc3RhbmNlfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBhY3Rvci50YXJnZXQgPSBmdXJ0aGVzdC50YXJnZXQ7XG4gICAgcmV0dXJuIGJyYWluLlNVQ0NFU1Ncbn1cblxudmFyIHByb2JlQnJhaW4gPSBuZXcgYnJhaW4uQnJhaW4oKTtcbnByb2JlQnJhaW4ucmVnaXN0ZXIobW92ZVRvVGFyZ2V0KTtcbnByb2JlQnJhaW4ucmVnaXN0ZXIoYWNxdWlyZUZ1cnRoZXN0VGFyZ2V0KTtcbnByb2JlQnJhaW4ucmVnaXN0ZXIoYnJhaW4ucHJpb3JpdHkobW92ZVRvVGFyZ2V0LCBhY3F1aXJlRnVydGhlc3RUYXJnZXQpLCBcImJhc2ljUHJvYmVcIik7XG5tb2R1bGUuZXhwb3J0cyA9IHByb2JlQnJhaW47IiwiY29uc3QgRkFJTFVSRSA9IDA7XG5jb25zdCBTVUNDRVNTID0gMTtcbmNvbnN0IFJVTk5JTkcgPSAyO1xuXG5mdW5jdGlvbiBCcmFpbigpIHtcbiAgICB0aGlzLmJlaGF2aW9ycyA9IHt9O1xuICAgIHRoaXMub3ZlcndyaXRlUHJvdGVjdGVkID0gdHJ1ZTtcbn1cblxuQnJhaW4ucHJvdG90eXBlLmFjdCA9IGZ1bmN0aW9uIChhY3Rvcikge1xuICAgIGlmIChhY3Rvci5iZWhhdmlvciAhPT0gdW5kZWZpbmVkICYmIGFjdG9yLmJlaGF2aW9yICE9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmJlaGF2aW9yc1thY3Rvci5iZWhhdmlvcl0oYWN0b3IpO1xuICAgIH1cbn07XG5cbkJyYWluLnByb3RvdHlwZS5yZWdpc3RlciA9IGZ1bmN0aW9uKGZ1bmMsIG5hbWUpIHtcbiAgICBpZiAobmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG5hbWUgPSBmdW5jLm5hbWU7XG4gICAgfVxuXG4gICAgaWYgKG5hbWUgPT0gJycpIHtcbiAgICAgICAgdGhyb3cgXCJNdXN0IHJlZ2lzdGVyIGEgZnVuY3Rpb24gd2l0aCBhIG5hbWUuXCJcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vdmVyd3JpdGVQcm90ZWN0ZWQgJiYgdGhpcy5iZWhhdmlvcnMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgdGhyb3cgXCJNYXkgbm90IHNoYWRvdyBiZWhhdmlvciBuYW1lcy5cIlxuICAgIH1cblxuICAgIHRoaXMuYmVoYXZpb3JzW25hbWVdID0gZnVuYztcbn07XG5cbmZ1bmN0aW9uIHByaW9yaXR5KCkge1xuICAgIHZhciBjaGlsZHJlbiA9IEFycmF5LmZyb20oYXJndW1lbnRzKTtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoYWN0b3IpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGNoaWxkcmVuW2ldKGFjdG9yKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQgIT09IEZBSUxVUkUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBGQUlMVVJFXG4gICAgfTtcbn1cblxuZnVuY3Rpb24gc2VxdWVuY2UoKSB7XG4gICAgdmFyIGNoaWxkcmVuID0gQXJyYXkuZnJvbShhcmd1bWVudHMpO1xuICAgIHJldHVybiBmdW5jdGlvbihhY3Rvcikge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gY2hpbGRyZW5baV0oYWN0b3IpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdCAhPT0gU1VDQ0VTUykge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFNVQ0NFU1NcbiAgICB9XG59XG5cbmV4cG9ydHMuQnJhaW4gPSBCcmFpbjtcbmV4cG9ydHMucHJpb3JpdHkgPSBwcmlvcml0eTtcbmV4cG9ydHMuc2VxdWVuY2UgPSBzZXF1ZW5jZTtcbmV4cG9ydHMuUlVOTklORyA9IFJVTk5JTkc7XG5leHBvcnRzLlNVQ0NFU1MgPSBTVUNDRVNTO1xuZXhwb3J0cy5GQUlMVVJFID0gRkFJTFVSRTsiLCIvLyBUT0RPOiBZQU1MIENvbmZpZ3VyYXRpb25cblxubW9kdWxlLmV4cG9ydHMudGltZVN0ZXAgPSAxNjsiLCJjb25zdCBWZWN0b3IgPSByZXF1aXJlKFwiLi4vdmVjdG9yLmpzXCIpO1xuXG5mdW5jdGlvbiBCZWFjb24oeCwgeSl7XG4gICAgdGhpcy5wb3MgPSBuZXcgVmVjdG9yKHgsIHkpO1xuICAgIHRoaXMuc2l6ZSA9IDM7XG4gICAgdGhpcy5jb2xvciA9IFwicmdiKDIwMCwgMjAwLCAyNTUpXCJcbn1cblxuQmVhY29uLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAodGltZVN0ZXApIHt9O1xuXG5CZWFjb24ucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAoY2FudmFzLCB4LCB5KSB7XG4gICAgY2FudmFzLnN0cm9rZVN0eWxlID0gdGhpcy5jb2xvcjtcbiAgICBjYW52YXMuYmVnaW5QYXRoKCk7XG4gICAgY2FudmFzLmFyYyh4LCB5LCB0aGlzLnNpemUsIDAsIE1hdGguUEkgKiAyKTtcbiAgICBjYW52YXMuc3Ryb2tlKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJlYWNvbjsiLCJjb25zdCBWZWN0b3IgPSByZXF1aXJlKFwiLi4vdmVjdG9yLmpzXCIpO1xuLy8gVE9ETzogQ29uc2lkZXIgUmFkYXIgb2JqZWN0LiBDdXN0b21pemFibGUgdmlld3MuXG5cbmZ1bmN0aW9uIFByb2JlKHgsIHkpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB0aGlzLnBvcyA9IG5ldyBWZWN0b3IoeCwgeSk7XG4gICAgdGhpcy5zaXplID0gNTtcbiAgICB0aGlzLnNwZWVkID0gMC4xNztcbiAgICB0aGlzLnRhcmdldCA9IG51bGw7XG4gICAgdGhpcy5jb2xvciA9IFwicmdiKDIwMCwgMjU1LCAyMjApXCI7IC8vIFRPRE86IEFkZCBwYXJhbWV0ZXJzLlxuICAgIHRoaXMuYmVoYXZpb3IgPSBcImJhc2ljUHJvYmVcIjtcbn1cblxuUHJvYmUucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAoY2FudmFzLCB4LCB5KSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgY2FudmFzLnN0cm9rZVN0eWxlID0gdGhpcy5jb2xvcjtcbiAgICBjYW52YXMuYmVnaW5QYXRoKCk7XG4gICAgY2FudmFzLmFyYyh4LCB5LCB0aGlzLnNpemUsIDAsIE1hdGguUEkgKiAyKTtcbiAgICBjYW52YXMuc3Ryb2tlKCk7XG59O1xuXG5Qcm9iZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKHRpbWVTdGVwKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgLy8gRm9yZXN0LmFjdCh0aGlzLCB0aW1lU3RlcCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByb2JlOyIsImZ1bmN0aW9uIFZlY3Rvcih4LCB5KSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICAgIHRoaXMuX2xlbmd0aCA9IG51bGw7XG4gICAgdGhpcy5fbm9ybWFsID0gbnVsbDtcbn1cblxuVmVjdG9yLnByb3RvdHlwZS5zdWIgPSBmdW5jdGlvbiAob3RoZXIpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICByZXR1cm4gbmV3IFZlY3Rvcih0aGlzLnggLSBvdGhlci54LCB0aGlzLnkgLSBvdGhlci55KTtcbn07XG5cblZlY3Rvci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKG90aGVyKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgcmV0dXJuIG5ldyBWZWN0b3IodGhpcy54ICsgb3RoZXIueCwgdGhpcy55IC0gb3RoZXIueSk7XG59O1xuXG5WZWN0b3IucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICBpZiAodGhpcy5fbGVuZ3RoID09PSBudWxsKSB7XG4gICAgICAgIHRoaXMuX2xlbmd0aCA9IE1hdGguc3FydChNYXRoLnBvdyh0aGlzLngsIDIpICsgTWF0aC5wb3codGhpcy54LCAyKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9sZW5ndGg7XG59O1xuXG5WZWN0b3IucHJvdG90eXBlLm5vcm1hbCA9IGZ1bmN0aW9uICgpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICBpZiAodGhpcy5fbm9ybWFsID09PSBudWxsKSB7XG4gICAgICAgIHRoaXMuX25vcm1hbCA9IHRoaXMubm9ybWFsKCk7XG4gICAgICAgIHRoaXMuX25vcm1hbC5fbm9ybWFsID0gdGhpcy5fbm9ybWFsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fbm9ybWFsO1xufTtcblxuVmVjdG9yLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uIChsZW5ndGgpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgcmF0aW8gPSBsZW5ndGggLyB0aGlzLmxlbmd0aCgpO1xuICAgIHJldHVybiBuZXcgVmVjdG9yKHRoaXMueCAqIHJhdGlvLCB0aGlzLnkgKiByYXRpbyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZlY3RvcjsiXX0=
