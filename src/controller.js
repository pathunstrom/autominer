const Beacon = require("./gameobjects/beacon.js");

function Controller(canvas, space, player, costs) {
    this.canvas = canvas;
    this.space = space;
    this.player = player;
    this.costs = costs;
    this.currentControl = "beacon";
    this.canvas.addEventListener("click", this.click.bind(this));
}

Controller.prototype.click = function (event) {
    var cost = this.costs[this.currentControl];
    console.debug("click event");
    console.debug("Cost: " + cost);
    if (this.player.withdraw(cost)) {
        console.debug("Withdraw successful.");
        var x = event.offsetX;
        var y = event.offsetY;
        this.space.beacon.push(new Beacon(x, y, this.space));
    }
};

module.exports = Controller;