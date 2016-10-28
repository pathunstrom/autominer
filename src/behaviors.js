const brain = require("./brain.js");
const config = require("./configuration.js");

function moveToTarget(actor) {
    var target = actor.target;

    if (target === null) {
        return brain.FAILURE;
    }
    var direction = target.pos.sub(actor.pos);  // Vector2
    var displacement = actor.speed * config.timeStep;
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

function easeDistance(actor) {
    if (!actor.hasOwnProperty("targetDistance") || actor.targetDistance === undefined) {
        return brain.FAILURE;
    }

    function circularEase (time, target, duration) {
        time = (time / duration) - 1;
        return target * Math.sqrt(1 - time*time);
    }

    var time = actor.runTime + config.timeStep;
    var target = actor.targetDistance;
    var duration = actor.duration;
    var newDistance = actor.distance;
    if (time < duration) {
        newDistance = circularEase(time, target, duration);
    } else {
        newDistance = target;
        console.debug("Target reached.");
    }
    console.log("Old distance: " + actor.distance);
    console.log("New distance: " + newDistance);
    actor.distance = newDistance;
    actor.runTime = time;
    return brain.SUCCESS;
}

function updatePosition(actor) {
    function logPosition(age, pos) {
        console.debug(age + " position: " + pos.x + ", " + pos.y);
    }
    logPosition("Old", actor.pos);
    actor.pos = actor.direction.scale(actor.distance).add(actor.origin);
    logPosition("New", actor.pos);
    return brain.SUCCESS;
}

function cleanUpEasing(actor) {
    if (actor.distance == actor.targetDistance) {
        actor.targetDistance = undefined;
        actor.runTime = 0;
        return brain.SUCCESS;
    } else {
        return brain.FAILURE;
    }
}

var probeBrain = new brain.Brain();
probeBrain.register(moveToTarget);
probeBrain.register(acquireFurthestTarget);
probeBrain.register(brain.priority(moveToTarget, acquireFurthestTarget), "basicProbe");
probeBrain.register(brain.sequence(easeDistance, updatePosition, cleanUpEasing), "launchBeacon");
module.exports = probeBrain;