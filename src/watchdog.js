export class Watchdog {
    timeoutRef = null;
    callback = null;
    millis = null;

    constructor(millis, callback) {
        this.callback = callback;
        this.millis = millis;
    }

    /// Start/Reset the whatdog
    reset() {
        this.stop();
        this.timeoutRef = window.setTimeout(() => { this.callback() }, this.millis);
    }

    /// Stop the whatdog
    stop() {
        if (this.timeOutRef) {
            window.clearTimeout(this.timeoutRef);
            this.timeoutRef = null;
        }
    }
}