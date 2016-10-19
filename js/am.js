(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
const Vector = require("./vector.js");
const Probe = require("./gameobjects/probe.js");
const timeStep = 16; // simulation timestep.

// turn into prototype functions
create = {
    asteroid: function() {
        return {
            pos: new Vector(300, 200)
        }
    },
    ship: function () {
        return {
            pos: new Vector(50, 50)
        }
    }
};

deadDraw = {
    asteroid: function (render_context, asteroid) {
        var pos = asteroid.pos;
        render_context.strokeStyle = "rgb(170, 80, 70)";
        render_context.beginPath();
        render_context.arc(pos.x, pos.y, 100, 0, Math.PI * 2);
        render_context.stroke();
          },
    ship: function (render_context, ship) {
        var pos = ship.pos;
        render_context.strokeStyle = "rgb(200, 230, 255)";
        render_context.strokeRect(pos.x, pos.y, 50, 100);
          }
};

simulate = {
    asteroid: function (asteroid) {

    },
    probe: function (probe) {
        probe.pos = probe.pos.add(probe.velocity)
    },
    ship: function (ship) {

    }
};

function run_autominer() {
    var canvas = document.getElementById("autominer-canvas");
    var renderContext = canvas.getContext("2d");
    var time = Date.now();
    var accumulated_time = 0;
    var unspent_delta = 0;
    var ship = create.ship();
    var probes = [];
    probes.push(new Probe(20, 20));
    console.debug(probes);
    var asteroids = [create.asteroid()];
    var blurred = false;

    function update() {
        render();
        tick();
        window.requestAnimationFrame(update);
    }

    function render() {
        if (!blurred) {
            renderContext.clearRect(0, 0, 600, 400);
            function draw_asteroid(asteroid) {
                deadDraw.asteroid(renderContext, asteroid)
            }

            function draw_probe(probe) {
                deadDraw.probe(renderContext, probe)
            }

            asteroids.forEach(draw_asteroid);
            deadDraw.ship(renderContext, ship);
            probes.forEach(draw);
        }
    }

    function tick() {
        var new_time = Date.now();
        var new_delta = new_time - time;
        unspent_delta += new_delta;
        accumulated_time += new_delta;
        time = new_time;
        while (unspent_delta > timeStep) {
            unspent_delta -= timeStep;
            probes.forEach(simulate);
        }
    }

    function simulate(obj) {
        obj.update(timeStep);
    }

    function draw(obj) {
        obj.draw(renderContext);
    }

    function pause() {
        blurred = true;
        console.debug("Paused");
    }

    function unpause() {
        blurred = false;
        console.debug("Unpaused");
    }

    window.onblur = pause;
    window.onfocus = unpause;
    update();
}

window.onload = run_autominer;
},{"./gameobjects/probe.js":2,"./vector.js":3}],2:[function(require,module,exports){
const Vector = require("../vector.js");

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

Probe.prototype.draw = function (canvas) {
    "use strict";
    var x = this.pos.x;
    var y = this.pos.y;
    canvas.strokeStyle = this.color;
    canvas.beginPath();
    canvas.arc(x, y, this.size, 0, Math.PI * 2);
    canvas.stroke();
};

Probe.prototype.update = function (timeStep) {
    "use strict";
    this.behavior.act(this, timeStep);
};

module.exports = Probe;
},{"../vector.js":3}],3:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImF1dG9taW5lci5qcyIsImdhbWVvYmplY3RzL3Byb2JlLmpzIiwidmVjdG9yLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJjb25zdCBWZWN0b3IgPSByZXF1aXJlKFwiLi92ZWN0b3IuanNcIik7XG5jb25zdCBQcm9iZSA9IHJlcXVpcmUoXCIuL2dhbWVvYmplY3RzL3Byb2JlLmpzXCIpO1xuY29uc3QgdGltZVN0ZXAgPSAxNjsgLy8gc2ltdWxhdGlvbiB0aW1lc3RlcC5cblxuLy8gdHVybiBpbnRvIHByb3RvdHlwZSBmdW5jdGlvbnNcbmNyZWF0ZSA9IHtcbiAgICBhc3Rlcm9pZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwb3M6IG5ldyBWZWN0b3IoMzAwLCAyMDApXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHNoaXA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHBvczogbmV3IFZlY3Rvcig1MCwgNTApXG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5kZWFkRHJhdyA9IHtcbiAgICBhc3Rlcm9pZDogZnVuY3Rpb24gKHJlbmRlcl9jb250ZXh0LCBhc3Rlcm9pZCkge1xuICAgICAgICB2YXIgcG9zID0gYXN0ZXJvaWQucG9zO1xuICAgICAgICByZW5kZXJfY29udGV4dC5zdHJva2VTdHlsZSA9IFwicmdiKDE3MCwgODAsIDcwKVwiO1xuICAgICAgICByZW5kZXJfY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICAgICAgcmVuZGVyX2NvbnRleHQuYXJjKHBvcy54LCBwb3MueSwgMTAwLCAwLCBNYXRoLlBJICogMik7XG4gICAgICAgIHJlbmRlcl9jb250ZXh0LnN0cm9rZSgpO1xuICAgICAgICAgIH0sXG4gICAgc2hpcDogZnVuY3Rpb24gKHJlbmRlcl9jb250ZXh0LCBzaGlwKSB7XG4gICAgICAgIHZhciBwb3MgPSBzaGlwLnBvcztcbiAgICAgICAgcmVuZGVyX2NvbnRleHQuc3Ryb2tlU3R5bGUgPSBcInJnYigyMDAsIDIzMCwgMjU1KVwiO1xuICAgICAgICByZW5kZXJfY29udGV4dC5zdHJva2VSZWN0KHBvcy54LCBwb3MueSwgNTAsIDEwMCk7XG4gICAgICAgICAgfVxufTtcblxuc2ltdWxhdGUgPSB7XG4gICAgYXN0ZXJvaWQ6IGZ1bmN0aW9uIChhc3Rlcm9pZCkge1xuXG4gICAgfSxcbiAgICBwcm9iZTogZnVuY3Rpb24gKHByb2JlKSB7XG4gICAgICAgIHByb2JlLnBvcyA9IHByb2JlLnBvcy5hZGQocHJvYmUudmVsb2NpdHkpXG4gICAgfSxcbiAgICBzaGlwOiBmdW5jdGlvbiAoc2hpcCkge1xuXG4gICAgfVxufTtcblxuZnVuY3Rpb24gcnVuX2F1dG9taW5lcigpIHtcbiAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhdXRvbWluZXItY2FudmFzXCIpO1xuICAgIHZhciByZW5kZXJDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICB2YXIgdGltZSA9IERhdGUubm93KCk7XG4gICAgdmFyIGFjY3VtdWxhdGVkX3RpbWUgPSAwO1xuICAgIHZhciB1bnNwZW50X2RlbHRhID0gMDtcbiAgICB2YXIgc2hpcCA9IGNyZWF0ZS5zaGlwKCk7XG4gICAgdmFyIHByb2JlcyA9IFtdO1xuICAgIHByb2Jlcy5wdXNoKG5ldyBQcm9iZSgyMCwgMjApKTtcbiAgICBjb25zb2xlLmRlYnVnKHByb2Jlcyk7XG4gICAgdmFyIGFzdGVyb2lkcyA9IFtjcmVhdGUuYXN0ZXJvaWQoKV07XG4gICAgdmFyIGJsdXJyZWQgPSBmYWxzZTtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICAgICAgcmVuZGVyKCk7XG4gICAgICAgIHRpY2soKTtcbiAgICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh1cGRhdGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICAgICAgaWYgKCFibHVycmVkKSB7XG4gICAgICAgICAgICByZW5kZXJDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCA2MDAsIDQwMCk7XG4gICAgICAgICAgICBmdW5jdGlvbiBkcmF3X2FzdGVyb2lkKGFzdGVyb2lkKSB7XG4gICAgICAgICAgICAgICAgZGVhZERyYXcuYXN0ZXJvaWQocmVuZGVyQ29udGV4dCwgYXN0ZXJvaWQpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGRyYXdfcHJvYmUocHJvYmUpIHtcbiAgICAgICAgICAgICAgICBkZWFkRHJhdy5wcm9iZShyZW5kZXJDb250ZXh0LCBwcm9iZSlcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXN0ZXJvaWRzLmZvckVhY2goZHJhd19hc3Rlcm9pZCk7XG4gICAgICAgICAgICBkZWFkRHJhdy5zaGlwKHJlbmRlckNvbnRleHQsIHNoaXApO1xuICAgICAgICAgICAgcHJvYmVzLmZvckVhY2goZHJhdyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0aWNrKCkge1xuICAgICAgICB2YXIgbmV3X3RpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgICB2YXIgbmV3X2RlbHRhID0gbmV3X3RpbWUgLSB0aW1lO1xuICAgICAgICB1bnNwZW50X2RlbHRhICs9IG5ld19kZWx0YTtcbiAgICAgICAgYWNjdW11bGF0ZWRfdGltZSArPSBuZXdfZGVsdGE7XG4gICAgICAgIHRpbWUgPSBuZXdfdGltZTtcbiAgICAgICAgd2hpbGUgKHVuc3BlbnRfZGVsdGEgPiB0aW1lU3RlcCkge1xuICAgICAgICAgICAgdW5zcGVudF9kZWx0YSAtPSB0aW1lU3RlcDtcbiAgICAgICAgICAgIHByb2Jlcy5mb3JFYWNoKHNpbXVsYXRlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNpbXVsYXRlKG9iaikge1xuICAgICAgICBvYmoudXBkYXRlKHRpbWVTdGVwKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkcmF3KG9iaikge1xuICAgICAgICBvYmouZHJhdyhyZW5kZXJDb250ZXh0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXVzZSgpIHtcbiAgICAgICAgYmx1cnJlZCA9IHRydWU7XG4gICAgICAgIGNvbnNvbGUuZGVidWcoXCJQYXVzZWRcIik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdW5wYXVzZSgpIHtcbiAgICAgICAgYmx1cnJlZCA9IGZhbHNlO1xuICAgICAgICBjb25zb2xlLmRlYnVnKFwiVW5wYXVzZWRcIik7XG4gICAgfVxuXG4gICAgd2luZG93Lm9uYmx1ciA9IHBhdXNlO1xuICAgIHdpbmRvdy5vbmZvY3VzID0gdW5wYXVzZTtcbiAgICB1cGRhdGUoKTtcbn1cblxud2luZG93Lm9ubG9hZCA9IHJ1bl9hdXRvbWluZXI7IiwiY29uc3QgVmVjdG9yID0gcmVxdWlyZShcIi4uL3ZlY3Rvci5qc1wiKTtcblxuLy8gVE9ETzogQ29uc2lkZXIgUmFkYXIgb2JqZWN0LiBDdXN0b21pemFibGUgdmlld3MuXG5cbmZ1bmN0aW9uIFByb2JlKHgsIHkpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB0aGlzLnBvcyA9IG5ldyBWZWN0b3IoeCwgeSk7XG4gICAgdGhpcy5zaXplID0gNTtcbiAgICB0aGlzLnNwZWVkID0gMC4xNztcbiAgICB0aGlzLnRhcmdldCA9IG51bGw7XG4gICAgdGhpcy5jb2xvciA9IFwicmdiKDIwMCwgMjU1LCAyMjApXCI7IC8vIFRPRE86IEFkZCBwYXJhbWV0ZXJzLlxuICAgIHRoaXMuYmVoYXZpb3IgPSBudWxsO1xufVxuXG5Qcm9iZS5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uIChjYW52YXMpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgeCA9IHRoaXMucG9zLng7XG4gICAgdmFyIHkgPSB0aGlzLnBvcy55O1xuICAgIGNhbnZhcy5zdHJva2VTdHlsZSA9IHRoaXMuY29sb3I7XG4gICAgY2FudmFzLmJlZ2luUGF0aCgpO1xuICAgIGNhbnZhcy5hcmMoeCwgeSwgdGhpcy5zaXplLCAwLCBNYXRoLlBJICogMik7XG4gICAgY2FudmFzLnN0cm9rZSgpO1xufTtcblxuUHJvYmUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICh0aW1lU3RlcCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHRoaXMuYmVoYXZpb3IuYWN0KHRoaXMsIHRpbWVTdGVwKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJvYmU7IiwiZnVuY3Rpb24gVmVjdG9yKHgsIHkpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy5fbGVuZ3RoID0gbnVsbDtcbiAgICB0aGlzLl9ub3JtYWwgPSBudWxsO1xufVxuXG5WZWN0b3IucHJvdG90eXBlLnN1YiA9IGZ1bmN0aW9uIChvdGhlcikge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHJldHVybiBuZXcgVmVjdG9yKHRoaXMueCAtIG90aGVyLngsIHRoaXMueSAtIG90aGVyLnkpO1xufTtcblxuVmVjdG9yLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAob3RoZXIpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICByZXR1cm4gbmV3IFZlY3Rvcih0aGlzLnggKyBvdGhlci54LCB0aGlzLnkgLSBvdGhlci55KTtcbn07XG5cblZlY3Rvci5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGlmICh0aGlzLl9sZW5ndGggPT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5fbGVuZ3RoID0gTWF0aC5zcXJ0KE1hdGgucG93KHRoaXMueCwgMikgKyBNYXRoLnBvdyh0aGlzLngsIDIpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2xlbmd0aDtcbn07XG5cblZlY3Rvci5wcm90b3R5cGUubm9ybWFsID0gZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGlmICh0aGlzLl9ub3JtYWwgPT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5fbm9ybWFsID0gdGhpcy5ub3JtYWwoKTtcbiAgICAgICAgdGhpcy5fbm9ybWFsLl9ub3JtYWwgPSB0aGlzLl9ub3JtYWw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9ub3JtYWw7XG59O1xuXG5WZWN0b3IucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24gKGxlbmd0aCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciByYXRpbyA9IGxlbmd0aCAvIHRoaXMubGVuZ3RoKCk7XG4gICAgcmV0dXJuIG5ldyBWZWN0b3IodGhpcy54ICogcmF0aW8sIHRoaXMueSAqIHJhdGlvKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVmVjdG9yOyJdfQ==
