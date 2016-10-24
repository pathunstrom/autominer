var assert = require('assert');

describe("Vector", function() {
    var Vector = require('../src/vector.js');
    it('should be a function', function () {
        assert.equal(typeof Vector, 'function');
    });

    describe('An instance', function () {
        describe("sub()", function() {
            it("should return a third vector", function(){
                var position = new Vector(1, 1);
                var target = new Vector(3, 3);
                assert.deepEqual(target.sub(position), new Vector(2, 2))
            })
        });

        describe("add()", function() {
            it("should return a third vector", function() {
                var position = new Vector(2, 4);
                var displacement = new Vector(3, 5);
                assert.deepEqual(position.add(displacement), new Vector(5, 9));
            })
        })
    })
});