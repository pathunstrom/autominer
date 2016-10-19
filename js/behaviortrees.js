var error = -1;
var failure = 0;
var success = 1;
var running = 2;

function Node (children) {
    this.children = children;
}

Node.prototype._walk = function (tree, agent) {
    agent.blackboard[tree]['active'].push(self);
    this._walk(tree, agent)
};


function Sequence (children) {
    this.Node = new Node(children)
}

Sequence.prototype.walk = function (tree, agent) {
    for (i = 0; i < this.Node.children.length; i++) {
        var result;
        result = this.Node.children[i]._walk(tree, agent);
        if (result == success) {

        }

    }
};

function moveToTarget(mover, timeStep) {
    /* Sets mover position one timeStep closer to target. */

    if (mover.hasOwnProperty("pos")) {
        var currentPos = mover.pos;
    } else {
        return error
    }

    if (mover.hasOwnProperty("target")) {
        var target = mover.target;
    } else {
        return error
    }

    if (mover.hasOwnProperty("speed")) {
        var speed = mover.speed * timeStep; // Game units per millisecond?
    } else {
        return error
    }

    var direction = target.sub(currentPos);
    if (direction.length <= speed) {
        mover.pos = mover.target;
        return success
    } else {
        mover.pos = mover.pos.add(direction.scale(speed));
        return running;
    }
}
