export class Logger {
    static logger(enabled) {
        if (!enabled) {
            return _=>{};
        }
        return console.log;
    }
    
    static INFO=this.logger(true)
    static DEBUG=this.logger((NODE_ENV && NODE_ENV.includes("DEV")))
    static WARNING=this.logger(true)
    static ERROR=this.logger(true)
}