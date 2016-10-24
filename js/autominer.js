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