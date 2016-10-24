/**
 * Reasoning about trees:
 * Defining a tree should be as codeless as possible.
 * Action nodes should be singletons.
 * Sequences and Priorities with identical children should exist exactly once.
 * Instantiate individual nodes as late as possible.
 * All nodes should accept the same types. Consider "walker" object to bundle.
 * Instantiate nodes only as needed.
 *
 * A given tree is defined by its root composite node.
 *
 * Defined Forest object tracks all nodes. A given actor asks to start at a
 * given node, which will pass it down to its children as required.
 **/

function Forest(){
    this.trees = {};
    this.definitions = {};
    this.registerDefinition("sequence", this.Definition(Sequence, COMPOSITE));
    this.registerDefinition("priority", this.Definition(Priority, COMPOSITE));
}

Forest.prototype.registerDefinition = function(name, definition) {
    this.definitions[name] = definition;
};

Forest.prototype.addTree = function (description) {
    /* Make new composite node. */
    var name = description.name;
    if (this.trees.hasOwnProperty(name)) {
        throw "Active nodes cannot share names."
    }
    this.trees[name] = {description: description, instance: null};
};

Forest.prototype.getTree = function(treeName) {
    if (this.trees.hasOwnProperty(treeName)) {
        var tree = this.trees[treeName];
        if (tree.instance === null) {
            var d = tree.description;
            var constructor = this.definitions[d.kind]["constructor"];
            tree.instance = constructor(this, d.name, d.children);
        }
        return tree.instance;
    } else {
        throw "Tree undefined."
    }
};

Forest.prototype.Definition = function (constructor, type, name) {
    /**
     * constructor: Function
     * kind: Enumeration[COMPOSITE, ACTION]
     */

    return {
        constructor: constructor,
        type: type,
        name: name
    };
};

Forest.prototype.Description = function (name, kind) {
    return {
        name: name,
        kind: kind,
        children: arguments.slice(2)
    }
};

Forest.prototype.act = function (actor, timeStep) {
    this.getTree(actor.behavior).walk(actor, timeStep);
};

function Sequence(forest, name, children) {
    var c = [];
    children.forEach(function(child){
        c.push({name: child.name, instance: null})
    });
    this.children = c;
    this.name = name;
    this.forest = forest;
}

Sequence.prototype.walk = function(actor, timeStep) {
    for (var c = 0; c < this.children.length; c += 1) {
        var child = this.children[c];
        if (child.instance === null) {
            child.instance = this.forest.getTree(child.name);
        }
        var result = child.instance.walk(actor, timeStep);
        if (result !== SUCCESS) {
            return result;
        }
    }
    return SUCCESS;
};

function Priority(forest, name, children) {
    var c = [];
    children.forEach(function(child){
        c.push({name: child.name, instance: null})
    });
    this.children = c;
    this.name = name;
    this.forest = forest;
}

Priority.prototype.walk = function(actor, timeStep) {
    for (var c = 0; c < this.children.length; c += 1) {
        var child = this.children[c];
        if (child.instance === null) {
            child.instance = this.forest.getTree(child.name);
        }
        var result = child.instance.walk(actor, timeStep);
        if (result !== FAILURE) {
            return result;
        }
    }
    return FAILURE;
};

// Results codes
const FAILURE = 0;
const SUCCESS = 1;
const RUNNING = 2;

// Node types
const COMPOSITE = 0;
const ACTION = 1;

module.exports = new Forest();
exports.FAILURE = FAILURE;
exports.SUCCESS = SUCCESS;
exports.RUNNING = RUNNING;
exports.COMPOSITE = COMPOSITE;
exports.ACTION = ACTION;