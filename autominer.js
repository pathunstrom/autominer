var render_context;
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
            probes: [],
            pos: [50, 50]
        }
    }
};

draw = {
    asteroid: function (asteroid) {
        var pos = asteroid.pos;
        render_context.strokeStyle = "rgb(170, 80, 70)";
        render_context.beginPath();
        render_context.arc(pos[0], pos[1], 100, 0, Math.PI * 2);
        render_context.stroke();
          },
    probe: function (probe) {
        var pos = probe.pos;
        render_context.strokeStyle = "rgb(200, 255, 220)";
        render_context.beginPath();
        render_context.arc(pos[0], pos[1], 5, 0, Math.PI * 2);
        render_context.stroke();
          },
    ship: function (ship) {
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

function set_context() {
    var canvas = document.getElementById("autominer-canvas");

    render_context = canvas.getContext("2d");
}

function run_autominer() {
    set_context();
    var time = Date.now();
    var accumulated_time = 0;
    var unspent_delta = 0;
    var ship = create.ship();
    ship.probes.push(create.probe());
    var asteroids = [create.asteroid()];

    function update() {
        render();
        tick();
        window.requestAnimationFrame(update);
    }

    function render() {
        render_context.clearRect(0, 0, 600, 400);
        asteroids.forEach(draw.asteroid);
        draw.ship(ship);
        ship.probes.forEach(draw.probe);
    }

    function tick() {
        var new_time = Date.now();
        var new_delta = new_time - time;
        unspent_delta += new_delta;
        accumulated_time += new_delta;
        time = new_time;
        while (unspent_delta > TIME_DELTA) {
            unspent_delta -= TIME_DELTA;

            ship.probes.forEach(simulate.probe);
        }
    }

    update();
}

window.requestAnimationFrame(run_autominer);