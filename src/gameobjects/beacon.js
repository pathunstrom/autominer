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