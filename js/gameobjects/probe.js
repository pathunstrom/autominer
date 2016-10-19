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