const Probe = require("./gameobjects/probe.js");
const Beacon = require("./gameobjects/beacon.js");
const config = require("./configuration.js");
const brain = require("./behaviors.js");
const Controller = require("./controller.js");
const Player = require("./gameobjects/player.js");

var game = {
    spentDelta: 0,
    space: {}
};

game.run = function () {

    this.space.beacons = [];

    var probe = new Probe(20, 20);
    probe.validTargets = this.space.beacons;
    this.space.probes = [probe];

    var canvas = document.getElementById("autominer-canvas");
    game.player = new Player({account: 4});
    var controller = new Controller(
        canvas,
        game.space,
        game.player,
        {beacon: 1}
    );
    view.renderContext = canvas.getContext("2d");
    view.render(game.space, game.player);
    window.requestAnimationFrame(game.update)
};

game.update = function (time) {
    var unspentDelta = time - game.spentDelta;
    for (; unspentDelta > config.timeStep; unspentDelta -= config.timeStep) {
        game.simulate()
    }
    game.spentDelta = time - unspentDelta;
    view.render(game.space, game.player);
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

view.render = function(space, player) {
    view.renderContext.strokeStyle = "rgb(0, 0, 0)";
    view.renderContext.fillRect(0, 0, 600, 400);
    Object.keys(space).forEach(function(key){
        space[key].forEach(function(obj){
            var pos = obj.pos;
            obj.draw(view.renderContext, Math.floor(pos.x), Math.floor(pos.y));
        })
    });
    updateScores(player);
};

function updateScores(player) {
    var currencyDisplay = document.getElementById("player-account");
    currencyDisplay.textContent = player.account;
}

document.addEventListener("DOMContentLoaded", function(){
    game.run();
});