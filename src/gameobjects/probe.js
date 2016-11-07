const Vector = require("../vector.js");
// TODO: Consider Radar object. Customizable views.

function Probe(x, y, space) {
    "use strict";
    this.pos = new Vector(x, y);
    this.size = 5;
    this.speed = 0.06;
    this.target = null;
    this.color = "rgb(200, 255, 220)"; // TODO: Add parameters.
    this.behavior = "collectBeacon";
    this.space = space;
    this.container = [];
    this.maxCapacity = 6;
}

Probe.prototype.draw = function (canvas, x, y) {
    "use strict";
    canvas.strokeStyle = this.color;
    canvas.beginPath();
    canvas.arc(x, y, this.size, 0, Math.PI * 2);
    canvas.stroke();
};

Probe.prototype.store = function (good) {
    var capacity = this.container.reduce(function(prev, item){
        return prev + item.size
    }, 0);
    if (capacity + good.size <= this.maxCapacity) {
        this.container.push(good);
        return true;
    } else {
        return false;
    }
};

module.exports = Probe;