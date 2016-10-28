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