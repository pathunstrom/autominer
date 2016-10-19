const Vector = require("./vector.js");
const Probe = require("./gameobjects/probe.js");
const timeStep = 16; // simulation timestep.

// turn into prototype functions
create = {
    asteroid: function() {
        return {
            pos: new Vector(300, 200)
        }
    },
    ship: function () {
        return {
            pos: new Vector(50, 50)
        }
    }
};

deadDraw = {
    asteroid: function (render_context, asteroid) {
        var pos = asteroid.pos;
        render_context.strokeStyle = "rgb(170, 80, 70)";
        render_context.beginPath();
        render_context.arc(pos.x, pos.y, 100, 0, Math.PI * 2);
        render_context.stroke();
          },
    ship: function (render_context, ship) {
        var pos = ship.pos;
        render_context.strokeStyle = "rgb(200, 230, 255)";
        render_context.strokeRect(pos.x, pos.y, 50, 100);
          }
};

simulate = {
    asteroid: function (asteroid) {

    },
    probe: function (probe) {
        probe.pos = probe.pos.add(probe.velocity)
    },
    ship: function (ship) {

    }
};

function run_autominer() {
    var canvas = document.getElementById("autominer-canvas");
    var renderContext = canvas.getContext("2d");
    var time = Date.now();
    var accumulated_time = 0;
    var unspent_delta = 0;
    var ship = create.ship();
    var probes = [];
    probes.push(new Probe(20, 20));
    console.debug(probes);
    var asteroids = [create.asteroid()];
    var blurred = false;

    function update() {
        render();
        tick();
        window.requestAnimationFrame(update);
    }

    function render() {
        if (!blurred) {
            renderContext.clearRect(0, 0, 600, 400);
            function draw_asteroid(asteroid) {
                deadDraw.asteroid(renderContext, asteroid)
            }

            function draw_probe(probe) {
                deadDraw.probe(renderContext, probe)
            }

            asteroids.forEach(draw_asteroid);
            deadDraw.ship(renderContext, ship);
            probes.forEach(draw);
        }
    }

    function tick() {
        var new_time = Date.now();
        var new_delta = new_time - time;
        unspent_delta += new_delta;
        accumulated_time += new_delta;
        time = new_time;
        while (unspent_delta > timeStep) {
            unspent_delta -= timeStep;
            probes.forEach(simulate);
        }
    }

    function simulate(obj) {
        obj.update(timeStep);
    }

    function draw(obj) {
        obj.draw(renderContext);
    }

    function pause() {
        blurred = true;
        console.debug("Paused");
    }

    function unpause() {
        blurred = false;
        console.debug("Unpaused");
    }

    window.onblur = pause;
    window.onfocus = unpause;
    update();
}

window.onload = run_autominer;