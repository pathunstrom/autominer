const assert = require("assert");
const Vector = require("../src/vector.js");
const Probe = require('../src/gameobjects/probe.js');

describe("Probe", function(){
    describe("#collect", function(){
        var probe;
        var space = {};
        beforeEach(function(){
            probe = new Probe(0, 0, space);
        });

        it("Should collect if it's target is close enough.", function() {
            probe.target = {pos: new Vector(0, 8), size: 3};
            probe.collect();
            assert.equal(probe.target, null, "Target not retrieved.");
        });

        it("Should return true if target is collected.", function(){
            probe.target = {pos: new Vector(0, 8), size: 3};
            assert(probe.collect(), "Probe did not return true for successful pickup.")
        });

        it("Should fail if the target is outside of its range.", function(){
            probe.target = {pos: new Vector(0, 10), size: 3};
            assert(!probe.collect(), "Probe collected out of range.")
        });
    });
});