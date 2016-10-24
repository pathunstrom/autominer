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