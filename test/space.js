const assert = require("assert");

describe("Space", function(){
    var Space = require("../src/gameobjects/space.js");
    var space;

    beforeEach(function(){
        space = new Space()
    });

    it("should be a constructor", function() {
        assert(typeof space == "object");
    });

    describe("#add", function() {

        it("should take objects", function () {
            space.add({});
        })
    });

    describe("#list", function() {
        var space;

        beforeEach(function(){
            space = new Space()
        });

        it("should list all contained objects.", function(){
            var empty_objects = [{}, {}];
            empty_objects.forEach(function(obj){
                space.add(obj)
            });
            var output = space.list();
            assert.deepEqual(output, empty_objects, "Output " + output + " != Input " + empty_objects)
        })
    });

    describe("#get", function(){
        var space;

        beforeEach(function(){
            space = new Space()
        });

        it("should let you get objects by type field.", function() {
            var objects = [{type: "orange"}, {type: "orange"}, {type: "apple"}, {}];
            objects.forEach(function(obj){
                space.add(obj);
            });

            var oranges = space.get("orange");
            var apples = space.get("apple");
            var untyped = space.get(undefined);
            var untypedVariant = space.get();
            assert.deepEqual(oranges, objects.slice(0, 2));
            assert.deepEqual(apples, objects.slice(2, 3));
            assert.deepEqual(untyped, objects.slice(3, 4));
            assert.deepEqual(untypedVariant, objects.slice(3, 4));
        })
    });

    describe("#remove", function(){
        var space;

        beforeEach(function(){
            space = new Space()
        });

        it("should allow you to remove specific objects.", function() {
            var apple = {type: "apple"};

            var objects = [{type: "apple"}, apple, {type: "cucumber"}, {type: "tar"}];
            objects.forEach(function(obj){
                space.add(obj);
            });

            space.remove(apple);
            space.list().forEach(function(obj){
                assert(apple != obj, "Apple still exists.")
            })
        });

    });
});