const brain = require("./brain.js");
const config = require("./configuration.js");

function moveToTarget(actor) {
    var target = actor.target;

    if (target === null) {
        return brain.FAILURE;
    }
    var direction = target.pos.sub(actor.pos);  // Vector2
    var displacement = actor.speed * config.timeStep;
    console.error("displacement: " + displacement);
    if (direction.length() <= displacement) {
        actor.pos = target.pos;
        actor.target = null;
        return brain.SUCCESS;
    } else {
        actor.pos = actor.pos.add(direction.scale(displacement));
        return brain.RUNNING;
    }
}

function acquireFurthestTarget(actor) {
    var furthest = {target: null, distance: 0};
    if (actor.hasOwnProperty("validTargets")) {
        var validTargets = actor.validTargets;
    } else {
        return brain.FAILURE;
    }
    validTargets.forEach(function(target){
        var distance = target.pos.sub(actor.pos).length();
        if (distance > furthest.distance) {
            furthest = {target: target, distance: distance}
        }
    });

    actor.target = furthest.target;
    return brain.SUCCESS
}

var probeBrain = new brain.Brain();
probeBrain.register(moveToTarget);
probeBrain.register(acquireFurthestTarget);
probeBrain.register(brain.priority(moveToTarget, acquireFurthestTarget), "basicProbe");
module.exports = probeBrain;