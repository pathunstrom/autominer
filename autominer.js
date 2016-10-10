var TIME_DELTA = Math.round(1000 / 60);

create = {
    asteroid: function() {
        return {
            pos: new Vector(300, 200)
        }
    },
    probe: function () {
        return {
            pos: new Vector(200, 100)
        }
    },
    ship: function () {
        return {
            pos: new Vector(50, 50)
        }
    }
};

draw = {
    asteroid: function (render_context, asteroid) {
        var pos = asteroid.pos;
        render_context.strokeStyle = "rgb(170, 80, 70)";
        render_context.beginPath();
        render_context.arc(pos.x, pos.y, 100, 0, Math.PI * 2);
        render_context.stroke();
          },
    probe: function (render_context, probe) {
        var pos = probe.pos;
        render_context.strokeStyle = "rgb(200, 255, 220)";
        render_context.beginPath();
        render_context.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
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
        new_x = probe.pos.x + (10 / 1000 * TIME_DELTA);
        new_y = probe.pos.y + (5 / 1000 * TIME_DELTA);
        probe.pos = new Vector(new_x, new_y);
    },
    ship: function (ship) {

    }
};

function Vector(x, y) {
    this.x = x;
    this.y = y;
    this._length = null;
    this._normal = null;
}

Vector.prototype.sub = function (other) {
    return new Vector(this.x - other.x, this.y - other.y)
};

Vector.prototype.add = function (other) {
    return new Vector(this.x + other.x, this.y - other.y)
};

Vector.prototype.length = function() {
    if (this._length === null) {
        this._length = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.x, 2))
    }
    return this._length
};

Vector.prototype.normal = function () {
    if (this._normal === null) {
        this._normal = new Vector(this.x / this.length(), this.y / this.length());
        this._normal._normal = this._normal;
    }
    return this._normal;
};

Vector.prototype.scale = function(length){
    var ratio = this.length() / length;
    return new Vector(this.x * ratio, this.y * ratio);
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