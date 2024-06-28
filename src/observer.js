import { Logger } from "./logger";
import { Visibility } from "./visibility";
import { Watchdog } from "./watchdog";
import { Elements } from "./elements";

/*
TODO: track XMLHttpRequest and fetch.

Limitations:
- Not possible to detect background image load set as a style (https://www.sitepoint.com/community/t/onload-for-background-image/6462).
  Alternative, reload the image (https://jsfiddle.net/tovic/gmzSG/)
*/

const WATCHDOG = 'watchdog';
const PAGELOAD = 'pageload';

export class Observer {
    firstLoadInitTime = null;
    isObserving = false;
    observer = null;
    initTime = null;
    trackedElements = null;
    watchdog = null;
    finishChecker = null;
    loadingTimeOfLastElement = 0;
    
    elementLoadedHandler = (ev) => { this.elementLoaded(ev) };

    constructor () {
        Logger.DEBUG("Construct Observer")
        this.trackedElements = new Elements(this.elementLoadedHandler);
        this.watchdog = new Watchdog(10000, () => { this.whatchdogHandler() });
        this.finishChecker = new Watchdog(500, () => { this.finishCheckerHandler() });
        this.observer = new MutationObserver((ml, obs) => { this.mutationObservedHandler(ml, obs) });
    }

    /// Start observing mutation events
    startObserving(targetNode) {
        if (!this.isObserving) {
            Logger.DEBUG("Start Observing");

            this.isObserving = true;
            this.initTime = Date.now();
            this.loadingTimeOfLastElement = 0;
            this.observer.observe(targetNode, { attributes: true, childList: true, subtree: true });
            this.watchdog.reset();
            this.finishChecker.reset();
        } else {
            Logger.WARNING("Called 'startObserving' but already observing");
        }
    }

    /// Stop observing mutation events
    stopObserving(stopOrigin) {
        if (this.isObserving) {
            this.isObserving = false;
            this.watchdog.stop();
            this.finishChecker.stop();
            this.firstLoadInitTime = null;

            Logger.DEBUG("Stop Observing");

            // Disconnect observer
            this.observer.disconnect();

            // Generate VC metric
            if (typeof newrelic !== "undefined") {
                if (this.loadingTimeOfLastElement > 0) {
                    newrelic.interaction()
                        .setAttribute("vcValue", this.loadingTimeOfLastElement)
                        .setAttribute("vcStopOrig", stopOrigin);
                } else {
                    Logger.WARNING("loadingTimeOfLastElement is zero, not generating VC metric.");
                }
            } else {
                Logger.ERROR("New Relic browser agent not loaded, VC metric not generated");
            }

            // Remove all "load" listeners from elements
            this.trackedElements.untrackAll();

            Logger.DEBUG("%c Visually Complete Metric = " + this.loadingTimeOfLastElement.toString() + " ms", "background:green; color:white");
        } else {
            Logger.WARNING("Called 'stopObserving' but not observing");
        }
    }

    /// Add load events to all added elements
    processAddedElements(arraynodes) {
        for (let i = 0; i < arraynodes.length; i++) {
            let item = arraynodes[i];
            if (item instanceof Element) {
                if (Visibility.isVisible(item)) {
                    Logger.DEBUG("This element is VISIBLE", item);
                    if (item.tagName == "IMG") {
                        this.trackedElements.trackElement(item);
                    } else {
                        let imageList = Array.from(item.querySelectorAll('img'));
                        for (const img of imageList) {
                            this.trackedElements.trackElement(img);
                        }
                    }
                    this.watchdog.reset();
                    this.finishChecker.reset();
                    // Elements other than images won't fire a "load" evemt but must be counted for the VC metric.
                    this.computeElementLoadingTime();
                } else {
                    Logger.DEBUG("This element is NOT VISIBLE", item)
                }
            }
        }
    }

    //////////////////////
    /// Event handlers ///
    //////////////////////
      
    // Callback function to execute when mutations are observed
    mutationObservedHandler(mutationList, observer) {
        for (const mutation of mutationList) {
            if (mutation.type === "childList") {
                //Logger.DEBUG("A child node has been added or removed", mutation);
                this.processAddedElements(mutation.addedNodes)
            } else if (mutation.type === "attributes") {
                Logger.DEBUG(`The ${mutation.attributeName} attribute was modified.`);
            } else {
                Logger.DEBUG(`Something else ${mutation}`);
            }
        }
    }

    // Executed when an element "load" event is fired.
    elementLoaded(ev) {
        this.watchdog.reset();
        this.finishChecker.reset();
        this.trackedElements.elementLoaded();
        this.computeElementLoadingTime();

        Logger.DEBUG("%c Element loaded ", 'background:orange; color:white', ev);
        Logger.DEBUG("Loading time of last visible element loaded = ", this.loadingTimeOfLastElement);
        Logger.DEBUG("pending elements = ", this.trackedElements.pendingElements());
    }

    computeElementLoadingTime() {
        if (this.firstLoadInitTime == null) {
            // Not initial page load
            this.loadingTimeOfLastElement = Math.abs(Date.now() - this.initTime);
        } else {
            // Initial page load, use a different time reference, the page load start time
            this.loadingTimeOfLastElement = Math.abs(Date.now() - this.firstLoadInitTime);
        }
    }

    // Executed when whatchdog timer fires
    whatchdogHandler() {
        Logger.DEBUG("%c Watchdog timer fired ", "background:red; color:white");
        this.stopObserving(WATCHDOG);
    }

    // Executed when whatchdog timer fires
    finishCheckerHandler() {
        Logger.DEBUG("%c Finish checker ", "background:blue; color:white");
        if (this.trackedElements.pendingElements() == 0) {
            Logger.DEBUG("%c FINISHED LOADING ", "background:red; color:white");
            this.stopObserving(PAGELOAD);
        }
    }
}