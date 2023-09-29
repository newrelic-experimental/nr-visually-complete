export class Watchdog {
    timeoutRef = null;
    callback = null;
    millis = null;

    constructor(millis, callback) {
        this.callback = callback;
        this.millis = millis;
    }

    /// Start/Reset the watchdog
    reset() {
        this.stop();
        this.timeoutRef = window.setTimeout(() => { this.callback() }, this.millis);
    }

    /// Stop the watchdog
    stop() {
        if (this.timeoutRef) {
            window.clearTimeout(this.timeoutRef);
            this.timeoutRef = null;
        }
    }
}