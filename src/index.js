import { Observer } from "./observer";
import { Logger } from "./logger";

export const observer = new Observer();

/// Init route change observer and starts VC measurement immediately.
export function init() {
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

    observer.startObserving(document);
}
