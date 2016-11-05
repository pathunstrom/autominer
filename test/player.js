const assert = require("assert");

describe("Player", function(){
    var Player = require('../src/gameobjects/player.js');
    it("should be a constructor.", function() {
        assert.equal(typeof Player, 'function');
        assert.equal(typeof new Player(), 'object');
    });
    it("should be able to configure the account.", function(){
        var player = new Player({account: 100});
        assert.equal(player.account, 100);
    });
    describe("instance", function() {
        var randomValue = 0;
        var player = undefined;
        beforeEach(function() {
            randomValue = Math.floor(Math.random() * 100 + 1);
            player = new Player({account: randomValue});
        });
        describe("withdraw method", function() {
            it("withdraw should update account.", function() {
                player.withdraw(randomValue - 10);
                assert.equal(player.account, 10);
            });
            it("should return true for successful withdrawal.", function(){
                assert(player.withdraw(randomValue));
            });
            it("should return false for unsuccessful withdrawal", function(){
                assert.equal(player.withdraw(randomValue + 10), false);
            });
        });
    });
});