function Space() {
    this.container = [];
}

function add(to_store) {
    this.container.push(to_store);
}

function list() {
    return this.container;
}

function get(type) {
    var rv = [];
    this.container.forEach(function(object) {
        if (object.type == type) {
            rv.push(object)
        }
    });
    return rv
}

function remove(obj) {
    this.container = this.container.filter(function(item) {
        return (item != obj)
    })
}

Space.prototype.add = add;
Space.prototype.list = list;
Space.prototype.get = get;
Space.prototype.remove = remove;

module.exports = Space;