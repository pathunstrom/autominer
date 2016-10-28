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