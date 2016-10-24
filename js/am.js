(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
const Probe = require("./gameobjects/probe.js");
const Beacon = require("./gameobjects/beacon.js");
const timeStep = 16; // simulation timestep.

var game = {
    spentDelta: 0,
    space: {}
};

game.run = function () {
    this.space.probes = [new Probe(20, 20)];
    this.space.beacons = [new Beacon(20, 20), new Beacon(580, 380)];
    var canvas = document.getElementById("autominer-canvas");
    view.renderContext = canvas.getContext("2d");
    view.render(game.space);
    window.requestAnimationFrame(game.update)
};

game.update = function (time) {
    var unspentDelta = time - game.spentDelta;
    for (; unspentDelta > timeStep; unspentDelta -= timeStep) {
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
            obj.update(timeStep, space);
        });
    });
};

var view = {
    renderContext: null
};

view.render = function(space) {
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
},{"./gameobjects/beacon.js":3,"./gameobjects/probe.js":4}],2:[function(require,module,exports){
/**
 * Reasoning about trees:
 * Defining a tree should be as codeless as possible.
 * Action nodes should be singletons.
 * Sequences and Priorities with identical children should exist exactly once.
 * Instantiate individual nodes as late as possible.
 * All nodes should accept the same types. Consider "walker" object to bundle.
 * Instantiate nodes only as needed.
 *
 * A given tree is defined by its root composite node.
 *
 * Defined Forest object tracks all nodes. A given actor asks to start at a
 * given node, which will pass it down to its children as required.
 **/

function Forest(){
    this.trees = {};
    this.definitions = {};
    this.registerDefinition("sequence", this.Definition(Sequence, COMPOSITE));
    // this.registerDefinition("priority", this.Definition(Priority, COMPOSITE));
}

Forest.prototype.registerDefinition = function(name, definition) {
    this.definitions[name] = definition;
};

Forest.prototype.addTree = function (description) {
    /* Make new composite node. */
    var name = description.name;
    if (this.trees.hasOwnProperty(name)) {
        throw "Active nodes cannot share names."
    }
    this.trees[name] = {description: description, instance: null};
};

Forest.prototype.getTree = function(treeName) {
    if (this.trees.hasOwnProperty(treeName)) {
        var tree = this.trees[treeName];
        if (tree.instance === null) {
            var d = tree.description;
            var constructor = this.definitions[d.kind]["constructor"];
            tree.instance = constructor(this, d.name, d.children);
        }
        return tree.instance;
    } else {
        throw "Tree undefined."
    }
};

Forest.prototype.Definition = function (constructor, type, name) {
    /**
     * constructor: Function
     * kind: Enumeration[COMPOSITE, ACTION]
     */

    return {
        constructor: constructor,
        type: type,
        name: name
    };
};

Forest.prototype.Description = function (name, kind) {
    return {
        name: name,
        kind: kind,
        children: arguments.slice(2)
    }
};

Forest.prototype.act = function (actor, timeStep) {
    this.getTree(actor.behavior).walk(actor, timeStep);
};

function Sequence(forest, name, children) {
    var c = [];
    children.forEach(function(child){
        c.push({name: child.name, instance: null})
    });
    this.children = c;
    this.name = name;
    this.forest = forest;
}

Sequence.prototype.walk = function(actor, timeStep) {
    for (var c = 0; c < this.children.length; c += 1) {
        var child = this.children[c];
        if (child.instance === null) {
            child.instance = this.forest.getTree(child.name);
        }
        var result = child.instance.walk(actor, timeStep);
        if (result !== SUCCESS) {
            return result;
        }
    }
    return SUCCESS;
};

function Priority(forest, name, children) {
    var c = [];
    children.forEach(function(child){
        c.push({name: child.name, instance: null})
    });
    this.children = c;
    this.name = name;
    this.forest = forest;
}

Priority.prototype.walk = function(actor, timeStep) {
    for (var c = 0; c < this.children.length; c += 1) {
        var child = this.children[c];
        if (child.instance === null) {
            child.instance = this.forest.getTree(child.name);
        }
        var result = child.instance.walk(actor, timeStep);
        if (result !== FAILURE) {
            return result;
        }
    }
    return FAILURE;
};

// Results codes
const FAILURE = 0;
const SUCCESS = 1;
const RUNNING = 2;

// Node types
const COMPOSITE = 0;
const ACTION = 1;

module.exports = new Forest();
exports.FAILURE = FAILURE;
exports.SUCCESS = SUCCESS;
exports.RUNNING = RUNNING;
exports.COMPOSITE = COMPOSITE;
exports.ACTION = ACTION;
},{}],3:[function(require,module,exports){
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
},{"../vector.js":5}],4:[function(require,module,exports){
const Vector = require("../vector.js");
const Forest = require("../behaviortrees");
// TODO: Consider Radar object. Customizable views.

function Probe(x, y) {
    "use strict";
    this.pos = new Vector(x, y);
    this.size = 5;
    this.speed = 0.17;
    this.target = null;
    this.color = "rgb(200, 255, 220)"; // TODO: Add parameters.
    this.behavior = null;
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
},{"../behaviortrees":2,"../vector.js":5}],5:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImF1dG9taW5lci5qcyIsImJlaGF2aW9ydHJlZXMuanMiLCJnYW1lb2JqZWN0cy9iZWFjb24uanMiLCJnYW1lb2JqZWN0cy9wcm9iZS5qcyIsInZlY3Rvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJjb25zdCBQcm9iZSA9IHJlcXVpcmUoXCIuL2dhbWVvYmplY3RzL3Byb2JlLmpzXCIpO1xuY29uc3QgQmVhY29uID0gcmVxdWlyZShcIi4vZ2FtZW9iamVjdHMvYmVhY29uLmpzXCIpO1xuY29uc3QgdGltZVN0ZXAgPSAxNjsgLy8gc2ltdWxhdGlvbiB0aW1lc3RlcC5cblxudmFyIGdhbWUgPSB7XG4gICAgc3BlbnREZWx0YTogMCxcbiAgICBzcGFjZToge31cbn07XG5cbmdhbWUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc3BhY2UucHJvYmVzID0gW25ldyBQcm9iZSgyMCwgMjApXTtcbiAgICB0aGlzLnNwYWNlLmJlYWNvbnMgPSBbbmV3IEJlYWNvbigyMCwgMjApLCBuZXcgQmVhY29uKDU4MCwgMzgwKV07XG4gICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYXV0b21pbmVyLWNhbnZhc1wiKTtcbiAgICB2aWV3LnJlbmRlckNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuICAgIHZpZXcucmVuZGVyKGdhbWUuc3BhY2UpO1xuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZ2FtZS51cGRhdGUpXG59O1xuXG5nYW1lLnVwZGF0ZSA9IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgdmFyIHVuc3BlbnREZWx0YSA9IHRpbWUgLSBnYW1lLnNwZW50RGVsdGE7XG4gICAgZm9yICg7IHVuc3BlbnREZWx0YSA+IHRpbWVTdGVwOyB1bnNwZW50RGVsdGEgLT0gdGltZVN0ZXApIHtcbiAgICAgICAgZ2FtZS5zaW11bGF0ZSgpXG4gICAgfVxuICAgIGdhbWUuc3BlbnREZWx0YSA9IHRpbWUgLSB1bnNwZW50RGVsdGE7XG4gICAgdmlldy5yZW5kZXIoZ2FtZS5zcGFjZSk7XG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lLnVwZGF0ZSlcbn07XG5cbmdhbWUuc2ltdWxhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNwYWNlID0gZ2FtZS5zcGFjZTtcbiAgICBPYmplY3Qua2V5cyhzcGFjZSkuZm9yRWFjaChmdW5jdGlvbihrZXkpe1xuICAgICAgICBzcGFjZVtrZXldLmZvckVhY2goZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgICAgIG9iai51cGRhdGUodGltZVN0ZXAsIHNwYWNlKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG52YXIgdmlldyA9IHtcbiAgICByZW5kZXJDb250ZXh0OiBudWxsXG59O1xuXG52aWV3LnJlbmRlciA9IGZ1bmN0aW9uKHNwYWNlKSB7XG4gICAgT2JqZWN0LmtleXMoc3BhY2UpLmZvckVhY2goZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgc3BhY2Vba2V5XS5mb3JFYWNoKGZ1bmN0aW9uKG9iail7XG4gICAgICAgICAgICB2YXIgcG9zID0gb2JqLnBvcztcbiAgICAgICAgICAgIG9iai5kcmF3KHZpZXcucmVuZGVyQ29udGV4dCwgcG9zLngsIHBvcy55KTtcbiAgICAgICAgfSlcbiAgICB9KVxufTtcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgZnVuY3Rpb24oKXtcbiAgICBnYW1lLnJ1bigpO1xufSk7IiwiLyoqXG4gKiBSZWFzb25pbmcgYWJvdXQgdHJlZXM6XG4gKiBEZWZpbmluZyBhIHRyZWUgc2hvdWxkIGJlIGFzIGNvZGVsZXNzIGFzIHBvc3NpYmxlLlxuICogQWN0aW9uIG5vZGVzIHNob3VsZCBiZSBzaW5nbGV0b25zLlxuICogU2VxdWVuY2VzIGFuZCBQcmlvcml0aWVzIHdpdGggaWRlbnRpY2FsIGNoaWxkcmVuIHNob3VsZCBleGlzdCBleGFjdGx5IG9uY2UuXG4gKiBJbnN0YW50aWF0ZSBpbmRpdmlkdWFsIG5vZGVzIGFzIGxhdGUgYXMgcG9zc2libGUuXG4gKiBBbGwgbm9kZXMgc2hvdWxkIGFjY2VwdCB0aGUgc2FtZSB0eXBlcy4gQ29uc2lkZXIgXCJ3YWxrZXJcIiBvYmplY3QgdG8gYnVuZGxlLlxuICogSW5zdGFudGlhdGUgbm9kZXMgb25seSBhcyBuZWVkZWQuXG4gKlxuICogQSBnaXZlbiB0cmVlIGlzIGRlZmluZWQgYnkgaXRzIHJvb3QgY29tcG9zaXRlIG5vZGUuXG4gKlxuICogRGVmaW5lZCBGb3Jlc3Qgb2JqZWN0IHRyYWNrcyBhbGwgbm9kZXMuIEEgZ2l2ZW4gYWN0b3IgYXNrcyB0byBzdGFydCBhdCBhXG4gKiBnaXZlbiBub2RlLCB3aGljaCB3aWxsIHBhc3MgaXQgZG93biB0byBpdHMgY2hpbGRyZW4gYXMgcmVxdWlyZWQuXG4gKiovXG5cbmZ1bmN0aW9uIEZvcmVzdCgpe1xuICAgIHRoaXMudHJlZXMgPSB7fTtcbiAgICB0aGlzLmRlZmluaXRpb25zID0ge307XG4gICAgdGhpcy5yZWdpc3RlckRlZmluaXRpb24oXCJzZXF1ZW5jZVwiLCB0aGlzLkRlZmluaXRpb24oU2VxdWVuY2UsIENPTVBPU0lURSkpO1xuICAgIC8vIHRoaXMucmVnaXN0ZXJEZWZpbml0aW9uKFwicHJpb3JpdHlcIiwgdGhpcy5EZWZpbml0aW9uKFByaW9yaXR5LCBDT01QT1NJVEUpKTtcbn1cblxuRm9yZXN0LnByb3RvdHlwZS5yZWdpc3RlckRlZmluaXRpb24gPSBmdW5jdGlvbihuYW1lLCBkZWZpbml0aW9uKSB7XG4gICAgdGhpcy5kZWZpbml0aW9uc1tuYW1lXSA9IGRlZmluaXRpb247XG59O1xuXG5Gb3Jlc3QucHJvdG90eXBlLmFkZFRyZWUgPSBmdW5jdGlvbiAoZGVzY3JpcHRpb24pIHtcbiAgICAvKiBNYWtlIG5ldyBjb21wb3NpdGUgbm9kZS4gKi9cbiAgICB2YXIgbmFtZSA9IGRlc2NyaXB0aW9uLm5hbWU7XG4gICAgaWYgKHRoaXMudHJlZXMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgdGhyb3cgXCJBY3RpdmUgbm9kZXMgY2Fubm90IHNoYXJlIG5hbWVzLlwiXG4gICAgfVxuICAgIHRoaXMudHJlZXNbbmFtZV0gPSB7ZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uLCBpbnN0YW5jZTogbnVsbH07XG59O1xuXG5Gb3Jlc3QucHJvdG90eXBlLmdldFRyZWUgPSBmdW5jdGlvbih0cmVlTmFtZSkge1xuICAgIGlmICh0aGlzLnRyZWVzLmhhc093blByb3BlcnR5KHRyZWVOYW1lKSkge1xuICAgICAgICB2YXIgdHJlZSA9IHRoaXMudHJlZXNbdHJlZU5hbWVdO1xuICAgICAgICBpZiAodHJlZS5pbnN0YW5jZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdmFyIGQgPSB0cmVlLmRlc2NyaXB0aW9uO1xuICAgICAgICAgICAgdmFyIGNvbnN0cnVjdG9yID0gdGhpcy5kZWZpbml0aW9uc1tkLmtpbmRdW1wiY29uc3RydWN0b3JcIl07XG4gICAgICAgICAgICB0cmVlLmluc3RhbmNlID0gY29uc3RydWN0b3IodGhpcywgZC5uYW1lLCBkLmNoaWxkcmVuKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJlZS5pbnN0YW5jZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBcIlRyZWUgdW5kZWZpbmVkLlwiXG4gICAgfVxufTtcblxuRm9yZXN0LnByb3RvdHlwZS5EZWZpbml0aW9uID0gZnVuY3Rpb24gKGNvbnN0cnVjdG9yLCB0eXBlLCBuYW1lKSB7XG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3I6IEZ1bmN0aW9uXG4gICAgICoga2luZDogRW51bWVyYXRpb25bQ09NUE9TSVRFLCBBQ1RJT05dXG4gICAgICovXG5cbiAgICByZXR1cm4ge1xuICAgICAgICBjb25zdHJ1Y3RvcjogY29uc3RydWN0b3IsXG4gICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgIG5hbWU6IG5hbWVcbiAgICB9O1xufTtcblxuRm9yZXN0LnByb3RvdHlwZS5EZXNjcmlwdGlvbiA9IGZ1bmN0aW9uIChuYW1lLCBraW5kKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAga2luZDoga2luZCxcbiAgICAgICAgY2hpbGRyZW46IGFyZ3VtZW50cy5zbGljZSgyKVxuICAgIH1cbn07XG5cbkZvcmVzdC5wcm90b3R5cGUuYWN0ID0gZnVuY3Rpb24gKGFjdG9yLCB0aW1lU3RlcCkge1xuICAgIHRoaXMuZ2V0VHJlZShhY3Rvci5iZWhhdmlvcikud2FsayhhY3RvciwgdGltZVN0ZXApO1xufTtcblxuZnVuY3Rpb24gU2VxdWVuY2UoZm9yZXN0LCBuYW1lLCBjaGlsZHJlbikge1xuICAgIHZhciBjID0gW107XG4gICAgY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCl7XG4gICAgICAgIGMucHVzaCh7bmFtZTogY2hpbGQubmFtZSwgaW5zdGFuY2U6IG51bGx9KVxuICAgIH0pO1xuICAgIHRoaXMuY2hpbGRyZW4gPSBjO1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5mb3Jlc3QgPSBmb3Jlc3Q7XG59XG5cblNlcXVlbmNlLnByb3RvdHlwZS53YWxrID0gZnVuY3Rpb24oYWN0b3IsIHRpbWVTdGVwKSB7XG4gICAgZm9yICh2YXIgYyA9IDA7IGMgPCB0aGlzLmNoaWxkcmVuLmxlbmd0aDsgYyArPSAxKSB7XG4gICAgICAgIHZhciBjaGlsZCA9IHRoaXMuY2hpbGRyZW5bY107XG4gICAgICAgIGlmIChjaGlsZC5pbnN0YW5jZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY2hpbGQuaW5zdGFuY2UgPSB0aGlzLmZvcmVzdC5nZXRUcmVlKGNoaWxkLm5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIHZhciByZXN1bHQgPSBjaGlsZC5pbnN0YW5jZS53YWxrKGFjdG9yLCB0aW1lU3RlcCk7XG4gICAgICAgIGlmIChyZXN1bHQgIT09IFNVQ0NFU1MpIHtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFNVQ0NFU1M7XG59O1xuXG5mdW5jdGlvbiBQcmlvcml0eShmb3Jlc3QsIG5hbWUsIGNoaWxkcmVuKSB7XG4gICAgdmFyIGMgPSBbXTtcbiAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKXtcbiAgICAgICAgYy5wdXNoKHtuYW1lOiBjaGlsZC5uYW1lLCBpbnN0YW5jZTogbnVsbH0pXG4gICAgfSk7XG4gICAgdGhpcy5jaGlsZHJlbiA9IGM7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLmZvcmVzdCA9IGZvcmVzdDtcbn1cblxuUHJpb3JpdHkucHJvdG90eXBlLndhbGsgPSBmdW5jdGlvbihhY3RvciwgdGltZVN0ZXApIHtcbiAgICBmb3IgKHZhciBjID0gMDsgYyA8IHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBjICs9IDEpIHtcbiAgICAgICAgdmFyIGNoaWxkID0gdGhpcy5jaGlsZHJlbltjXTtcbiAgICAgICAgaWYgKGNoaWxkLmluc3RhbmNlID09PSBudWxsKSB7XG4gICAgICAgICAgICBjaGlsZC5pbnN0YW5jZSA9IHRoaXMuZm9yZXN0LmdldFRyZWUoY2hpbGQubmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlc3VsdCA9IGNoaWxkLmluc3RhbmNlLndhbGsoYWN0b3IsIHRpbWVTdGVwKTtcbiAgICAgICAgaWYgKHJlc3VsdCAhPT0gRkFJTFVSRSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gRkFJTFVSRTtcbn07XG5cbi8vIFJlc3VsdHMgY29kZXNcbmNvbnN0IEZBSUxVUkUgPSAwO1xuY29uc3QgU1VDQ0VTUyA9IDE7XG5jb25zdCBSVU5OSU5HID0gMjtcblxuLy8gTm9kZSB0eXBlc1xuY29uc3QgQ09NUE9TSVRFID0gMDtcbmNvbnN0IEFDVElPTiA9IDE7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEZvcmVzdCgpO1xuZXhwb3J0cy5GQUlMVVJFID0gRkFJTFVSRTtcbmV4cG9ydHMuU1VDQ0VTUyA9IFNVQ0NFU1M7XG5leHBvcnRzLlJVTk5JTkcgPSBSVU5OSU5HO1xuZXhwb3J0cy5DT01QT1NJVEUgPSBDT01QT1NJVEU7XG5leHBvcnRzLkFDVElPTiA9IEFDVElPTjsiLCJjb25zdCBWZWN0b3IgPSByZXF1aXJlKFwiLi4vdmVjdG9yLmpzXCIpO1xuXG5mdW5jdGlvbiBCZWFjb24oeCwgeSl7XG4gICAgdGhpcy5wb3MgPSBuZXcgVmVjdG9yKHgsIHkpO1xuICAgIHRoaXMuc2l6ZSA9IDM7XG4gICAgdGhpcy5jb2xvciA9IFwicmdiKDIwMCwgMjAwLCAyNTUpXCJcbn1cblxuQmVhY29uLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAodGltZVN0ZXApIHt9O1xuXG5CZWFjb24ucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAoY2FudmFzLCB4LCB5KSB7XG4gICAgY2FudmFzLnN0cm9rZVN0eWxlID0gdGhpcy5jb2xvcjtcbiAgICBjYW52YXMuYmVnaW5QYXRoKCk7XG4gICAgY2FudmFzLmFyYyh4LCB5LCB0aGlzLnNpemUsIDAsIE1hdGguUEkgKiAyKTtcbiAgICBjYW52YXMuc3Ryb2tlKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJlYWNvbjsiLCJjb25zdCBWZWN0b3IgPSByZXF1aXJlKFwiLi4vdmVjdG9yLmpzXCIpO1xuY29uc3QgRm9yZXN0ID0gcmVxdWlyZShcIi4uL2JlaGF2aW9ydHJlZXNcIik7XG4vLyBUT0RPOiBDb25zaWRlciBSYWRhciBvYmplY3QuIEN1c3RvbWl6YWJsZSB2aWV3cy5cblxuZnVuY3Rpb24gUHJvYmUoeCwgeSkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHRoaXMucG9zID0gbmV3IFZlY3Rvcih4LCB5KTtcbiAgICB0aGlzLnNpemUgPSA1O1xuICAgIHRoaXMuc3BlZWQgPSAwLjE3O1xuICAgIHRoaXMudGFyZ2V0ID0gbnVsbDtcbiAgICB0aGlzLmNvbG9yID0gXCJyZ2IoMjAwLCAyNTUsIDIyMClcIjsgLy8gVE9ETzogQWRkIHBhcmFtZXRlcnMuXG4gICAgdGhpcy5iZWhhdmlvciA9IG51bGw7XG59XG5cblByb2JlLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gKGNhbnZhcywgeCwgeSkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGNhbnZhcy5zdHJva2VTdHlsZSA9IHRoaXMuY29sb3I7XG4gICAgY2FudmFzLmJlZ2luUGF0aCgpO1xuICAgIGNhbnZhcy5hcmMoeCwgeSwgdGhpcy5zaXplLCAwLCBNYXRoLlBJICogMik7XG4gICAgY2FudmFzLnN0cm9rZSgpO1xufTtcblxuUHJvYmUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICh0aW1lU3RlcCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIC8vIEZvcmVzdC5hY3QodGhpcywgdGltZVN0ZXApO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcm9iZTsiLCJmdW5jdGlvbiBWZWN0b3IoeCwgeSkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgICB0aGlzLl9sZW5ndGggPSBudWxsO1xuICAgIHRoaXMuX25vcm1hbCA9IG51bGw7XG59XG5cblZlY3Rvci5wcm90b3R5cGUuc3ViID0gZnVuY3Rpb24gKG90aGVyKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgcmV0dXJuIG5ldyBWZWN0b3IodGhpcy54IC0gb3RoZXIueCwgdGhpcy55IC0gb3RoZXIueSk7XG59O1xuXG5WZWN0b3IucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChvdGhlcikge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHJldHVybiBuZXcgVmVjdG9yKHRoaXMueCArIG90aGVyLngsIHRoaXMueSAtIG90aGVyLnkpO1xufTtcblxuVmVjdG9yLnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgaWYgKHRoaXMuX2xlbmd0aCA9PT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9sZW5ndGggPSBNYXRoLnNxcnQoTWF0aC5wb3codGhpcy54LCAyKSArIE1hdGgucG93KHRoaXMueCwgMikpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fbGVuZ3RoO1xufTtcblxuVmVjdG9yLnByb3RvdHlwZS5ub3JtYWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgaWYgKHRoaXMuX25vcm1hbCA9PT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9ub3JtYWwgPSB0aGlzLm5vcm1hbCgpO1xuICAgICAgICB0aGlzLl9ub3JtYWwuX25vcm1hbCA9IHRoaXMuX25vcm1hbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX25vcm1hbDtcbn07XG5cblZlY3Rvci5wcm90b3R5cGUuc2NhbGUgPSBmdW5jdGlvbiAobGVuZ3RoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgdmFyIHJhdGlvID0gbGVuZ3RoIC8gdGhpcy5sZW5ndGgoKTtcbiAgICByZXR1cm4gbmV3IFZlY3Rvcih0aGlzLnggKiByYXRpbywgdGhpcy55ICogcmF0aW8pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBWZWN0b3I7Il19
