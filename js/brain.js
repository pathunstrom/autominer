const FAILURE = 0;
const SUCCESS = 1;
const RUNNING = 2;

function Brain() {
    this.behaviors = {
    };

    var behaviors = Array.from(arguments);
    var brain = this;
    behaviors.forEach(function(behavior) {
        var length = behavior.length;
        if (length === undefined) {
            if (typeof behavior == "function") {
                brain.register(behavior);
            } else {
                brain.register(behavior.action, behavior.name)
            }

        } else if (length == 1) {
            brain.register(behavior[0]);
        } else {
            brain.register(behavior[0], behavior[1])
        }
    });
    this.overwriteProtected = true;
}

Brain.prototype.act = new function act(actor) {
    return this.behaviors[actor.behavior](actor);
};

Brain.prototype.register = function(func, name) {
    if (name === undefined) {
        name = func.name;
    }

    if (name == '') {
        throw "Must register a function with a name."
    }

    if (this.overwriteProtected && this.behaviors.hasOwnProperty(name)) {
        throw "May not shadow behavior names."
    }

    this.behaviors[name] = func;
};

function priority() {
    var children = Array.from(arguments);

    return function (actor) {
        for (var i = 0; i < children.length; i++) {
            var result = children[i](actor);
            if (result !== FAILURE) {
                return result;
            }
        }
        return FAILURE
    };
}

function sequence() {
    var children = Array.from(arguments);
    return function(actor) {
        for (var i = 0; i < children.length; i++) {
            var result = children[i](actor);
            if (result !== SUCCESS) {
                return result;
            }
        }
        return SUCCESS
    }
}

exports.Brain = Brain;
exports.RUNNING = RUNNING;
exports.SUCCESS = SUCCESS;
exports.FAILURE = FAILURE;