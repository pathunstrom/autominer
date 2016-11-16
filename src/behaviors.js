const brain = require("./brain.js");
const config = require("./configuration.js");

function ifNoTarget(behavior) {
    function modifier(actor) {
        if (actor.target === null || actor.target === undefined) {
            return behavior(actor);
        } else {
            return brain.FAILURE;
        }
    }
    return modifier;
}

function potentialTargets(targetType, validate) {
    if (validate === undefined) {
        validate = function() {return true;}
    }

    function getTargets(actor) {
        console.log("Potentienal " + targetType + " targets.");
        var candidates = actor.space[targetType];
        if (candidates !== undefined) {
            actor.potentialTargets = candidates.filter(validate);
            return brain.SUCCESS;
        } else {
            return brain.FAILURE;
        }

    }
    return getTargets;
}

function chooseClosestTarget(actor) {
    console.log("Choosing closest target.");
    var closest = {target: null, distance: Infinity};

    actor.potentialTargets.forEach(function(target){
        var distance = target.pos.sub(actor.pos).length();
        if (distance < closest.distance) {
            closest = {target: target, distance: distance};
        }
    });

    actor.target = closest.target;
    return brain.SUCCESS;
}

function chooseFurthestTarget(actor) {
    console.log("Choosing Furthest Target");
    var furthest = {target: null, distance: 0};
    if (!actor.hasOwnProperty("potentialTargets")) {

        return brain.FAILURE;
    }
    actor.potentialTargets.forEach(function(target){
        var distance = target.pos.sub(actor.pos).length();
        if (distance > furthest.distance) {
            furthest = {target: target, distance: distance}
        }
    });
    actor.target = furthest.target;
    return brain.SUCCESS
}

function collectTarget(carrier) {
    if (carrier.store(carrier.target)) {
        carrier.target.alive = false;
        return brain.SUCCESS;
    }
    return brain.FAILURE;
}

function moveToTarget(actor) {
    var target = actor.target;

    if (target === null) {
        return brain.FAILURE;
    }
    var direction = target.pos.sub(actor.pos);  // Vector2
    var displacement = actor.speed * config.timeStep;
    if (direction.length() <= displacement) {
        actor.pos = target.pos;
        return brain.SUCCESS;
    } else {
        actor.pos = actor.pos.add(direction.scale(displacement));
        return brain.RUNNING;
    }
}

function clearTarget(actor) {
    actor.target = null;
}

function circularEaseDistance(actor) {
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
    }
    actor.distance = newDistance;
    actor.runTime = time;
    return brain.SUCCESS;
}

function updateEasedPosition(actor) {

    actor.pos = actor.direction.scale(actor.distance).add(actor.origin);
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

function logMessage(message) {
    return function() {
        console.log(message);
        return brain.SUCCESS;
    }
}

function removeFromSpace(actor) {
    if (actor.alive) {
        return brain.FAILURE;
    } else {
        actor.space.remove(actor);
        return brain.SUCCESS;
    }
}

function advanceDataScan(actor) {
    actor.dataPayload += 1;
    return brain.SUCCESS
}

var probeBrain = new brain.Brain();
probeBrain.register(moveToTarget);
probeBrain.register(chooseFurthestTarget);
probeBrain.register(potentialTargets("beacon"), "potentialBeacons");
probeBrain.register(
    brain.sequence(
        logMessage("Running collectBeacon"),
        probeBrain.get("potentialBeacons"),
        brain.alwaysSucceed(ifNoTarget(chooseClosestTarget)),
        moveToTarget,
        collectTarget,
        clearTarget
    ),
    "collectBeacon"
);
/* probeBrain.register(
    brain.sequence(
        ifFull(targetOrigin),
        moveToTarget,
        dumpCargo,
        clearTarget
    ),
    "deliverProbes"
); */
probeBrain.register(
    brain.sequence(
        logMessage("Running basicProbe"),
        probeBrain.get("potentialBeacons"),
        brain.alwaysSucceed(ifNoTarget(chooseFurthestTarget)),
        moveToTarget,
        clearTarget
    ),
    "basicProbe");
probeBrain.register(
    brain.sequence(
        circularEaseDistance,
        updateEasedPosition,
        cleanUpEasing),
    "launch");
probeBrain.register(
    brain.priority(
        probeBrain.get("launch"),
        removeFromSpace,
        advanceDataScan
    ),
    "beacon"
);
module.exports = probeBrain;