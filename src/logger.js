export class Logger {
    static log_logger(enabled) {
        return enabled ? console.log : _=>{};
    }

    static err_logger(enabled) {
        return enabled ? console.error : _=>{};
    }

    static warn_logger(enabled) {
        return enabled ? console.warn : _=>{};
    }
    
    static INFO = this.log_logger(true)
    static DEBUG = this.log_logger((NODE_ENV && NODE_ENV.includes("DEV")))
    static WARNING = this.warn_logger(true)
    static ERROR = this.err_logger(true)
}