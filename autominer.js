var TIME_DELTA = 1000 / 60;

create = {
    asteroid: function() {
        return {
            pos: [300, 200]
        }
    },
    probe: function () {
        return {
            pos: [200, 100]
        }
    },
    ship: function () {
        return {
            pos: [50, 50]
        }
    }
};

draw = {
    asteroid: function (render_context, asteroid) {
        var pos = asteroid.pos;
        render_context.strokeStyle = "rgb(170, 80, 70)";
        render_context.beginPath();
        render_context.arc(pos[0], pos[1], 100, 0, Math.PI * 2);
        render_context.stroke();
          },
    probe: function (render_context, probe) {
        var pos = probe.pos;
        render_context.strokeStyle = "rgb(200, 255, 220)";
        render_context.beginPath();
        render_context.arc(pos[0], pos[1], 5, 0, Math.PI * 2);
        render_context.stroke();
          },
    ship: function (render_context, ship) {
        var pos = ship.pos;
        render_context.strokeStyle = "rgb(200, 230, 255)";
        render_context.strokeRect(pos[0], pos[1], 50, 100);
          }
};

simulate = {
    asteroid: function (asteroid) {

    },
    probe: function (probe) {
        probe.pos = [probe.pos[0] + (10 / 1000 * TIME_DELTA),
                     probe.pos[1] + (5 / 1000 * TIME_DELTA)];
        console.log(probe)
    },
    ship: function (ship) {

    }
};

function run_autominer() {
    var canvas = document.getElementById("autominer-canvas");
    var render_context = canvas.getContext("2d");
    var time = Date.now();
    var accumulated_time = 0;
    var unspent_delta = 0;
    var ship = create.ship();
    var probes = [];
    probes.push(create.probe());
    var asteroids = [create.asteroid()];
    var paused = false;

    function update() {
        render();
        tick();
        window.requestAnimationFrame(update);
    }

    function render() {
        render_context.clearRect(0, 0, 600, 400);
        function draw_asteroid(asteroid) {
            draw.asteroid(render_context, asteroid)
        }
        function draw_probe(probe) {
            draw.probe(render_context, probe)
        }
        asteroids.forEach(draw_asteroid);
        draw.ship(render_context, ship);
        probes.forEach(draw_probe);
    }

    function tick() {
        if (!paused) {
            var new_time = Date.now();
            var new_delta = new_time - time;
            unspent_delta += new_delta;
            accumulated_time += new_delta;
            time = new_time;
            while (unspent_delta > TIME_DELTA) {
                unspent_delta -= TIME_DELTA;

                probes.forEach(simulate.probe);
            }
        }
    }

    function pause() {
        paused = true;
        console.debug("Paused");
    }

    function unpause() {
        paused = false;
        time = Date.now();
        console.debug("Unpaused");
    }

    window.onblur = pause;
    window.onfocus = unpause;
    update();
}

window.onload = run_autominer;