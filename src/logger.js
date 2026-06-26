export class Logger {
    static LOG_PREFIX = "[newrelic-visually-complete]";

    static log_logger(enabled) {
        return enabled ? Logger.log : _=>{};
    }

    static err_logger(enabled) {
        return enabled ? Logger.error : _=>{};
    }

    static warn_logger(enabled) {
        return enabled ? Logger.warn : _=>{};
    }

    static build_args(args) {
        if (args.length > 0 && typeof(args[0]) == "string") {
            let new_arg = Logger.LOG_PREFIX + ": " + args[0];
            args[0] = new_arg;
        } else {
            args.unshift(Logger.LOG_PREFIX + ": ");
        }
        return args
    }

    static log() {
        let args = Logger.build_args(Array.from(arguments));
        console.log(...args);
    }

    static error() {
        let args = Logger.build_args(Array.from(arguments));
        console.error(...args);
    }

    static warn() {
        let args = Logger.build_args(Array.from(arguments));
        console.warn(...args);
    }
        
    static INFO = this.log_logger(true)
    static DEBUG = this.log_logger((NODE_ENV && NODE_ENV.includes("DEV")))
    static WARNING = this.warn_logger(true)
    static ERROR = this.err_logger(true)
}