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