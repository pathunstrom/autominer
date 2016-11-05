function Player(config) {
    this.account = 0;
    if (config !== undefined) {
        this.account = config.account || this.account;
    }
    this.withdraw = function(value) {
        if (value <= this.account) {
            this.account -= value;
            return true;
        }
        return false;
    }
}

module.exports = Player;