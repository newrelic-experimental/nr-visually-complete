import { Observer } from "./observer";
import { Logger } from "./logger";

export const observer = new Observer();

// Start Visually Complete Metric observer on script load
observer.startObserving(document);

history._nrvc_OldPushState = history.pushState;
history.pushState = function(state, unused, url) {
    Logger.DEBUG("Push state change, trigger observer");
    history._nrvc_OldPushState(state, unused, url);
    observer.startObserving(document);
}

window.addEventListener("hashchange", function(ev) {
    Logger.DEBUG("Hash change, trigger observer");
    observer.startObserving(document);
});
