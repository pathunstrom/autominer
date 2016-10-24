const Vector = require("../vector.js");
// TODO: Consider Radar object. Customizable views.

function Probe(x, y) {
    "use strict";
    this.pos = new Vector(x, y);
    this.size = 5;
    this.speed = 0.17;
    this.target = null;
    this.color = "rgb(200, 255, 220)"; // TODO: Add parameters.
    this.behavior = null;
}

Probe.prototype.draw = function (canvas, x, y) {
    "use strict";
    canvas.strokeStyle = this.color;
    canvas.beginPath();
    canvas.arc(x, y, this.size, 0, Math.PI * 2);
    canvas.stroke();
};

Probe.prototype.update = function (timeStep) {
    "use strict";
    // Forest.act(this, timeStep);
};

var behavior = {
    "behavior": {
        "name": "Basic Probe Behavior",
        "kind": "priority",
        "children": [
            {
                "name": "Move to Target if Available",
                "kind": "hasTarget",
                "children": [
                    {
                        "name": "Move To Target",
                        "kind": "moveToTarget",
                        "children": []
                    }
                ]
            },
            {
                "name": "Select Furthest Target",
                "kind": "selectFurthestTarget",
                "children": []
            }
        ]

    }
};

function hasTarget(Forest, name, children) {
    return {
        name: name,
        forest: Forest,
        child: children[0],
        walk: function (hunter, timeStep, space) {
            if (hunter.target !== null) {
                return this.child.walk(hunter, timeStep, space)
            } else {
                return this.forest.FAILURE;
            }
        }
    }
}

function moveToTarget(Forest, name, children) {
    /* Sets mover position one timeStep closer to target. */
    return {
        name: name,
        forest: Forest,
        children: [],
        walk: function (mover, timeStep, space) {
            var direction = mover.target.pos.sub(mover.pos);
            var displacement = mover.speed * timeStep;
            if (direction.length <= displacement) {
                mover.pos = mover.target.pos;
                mover.target = null;
                return this.forest.SUCCESS;
            } else {
                mover.pos = mover.pos.add(direction.scale(displacement));
                return this.forest.RUNNING;
            }
        }
    };
}

module.exports = Probe;