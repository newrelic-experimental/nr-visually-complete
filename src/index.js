import { Observer } from "./observer";
import { Logger } from "./logger";

// Observer singleton.
export const observer = new Observer();

/// Init route change observer and starts VC measurement immediately.
export function init() {
    document.addEventListener("click", function (e) {
        Logger.DEBUG("User clicked", e);
        observer.startObserving(document);
    });

    Logger.DEBUG("Call init");
    observer.startObserving(document);
}

/// Set custom metric handler.
export function setMetricHandler(mHandler) {
    if (typeof(mHandler) === 'function') {
        observer.metricHandler = mHandler;
    } else {
        Logger.WARNING("Custom handler must be a function");
    }
}
