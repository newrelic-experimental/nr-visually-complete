import { Observer } from "./observer";
import { Logger } from "./logger";

export const observer = new Observer();
// Only used once, during the initial page load
observer.firstLoadInitTime = Date.now();

/// Init route change observer and starts VC measurement immediately.
export function init() {
    document.body.addEventListener("click", function (e) {
        Logger.DEBUG("User clicked", e);
        observer.startObserving(document);
    });

    Logger.DEBUG("Call init");
    observer.startObserving(document);
}
