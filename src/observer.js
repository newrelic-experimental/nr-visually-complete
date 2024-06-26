import { Logger } from "./logger";
import { Visibility } from "./visibility";
import { Watchdog } from "./watchdog";
import { Elements } from "./elements";

/* TODO:
- Set "initTime" externally in case we have to start the observer later.
- Monitor AJAX requests.
- Custom loads, elements not tracked automatically. App must signal it.
- SVG images?

Limitations:
- Not possible to detect background image load set as a style (https://www.sitepoint.com/community/t/onload-for-background-image/6462).
  Alternative, reload the image (https://jsfiddle.net/tovic/gmzSG/)
*/

const WATCHDOG = 'watchdog';
const PAGELOAD = 'pageload';

export class Observer {
    isObserving = false;
    observer = null;
    initTime = null;
    trackedElements = null;
    watchdog = null;
    loadingTimeOfLastElement = 0;
    
    elementLoadedHandler = (ev) => { this.elementLoaded(ev) };
    pageLoadHandler = () => { this.pageLoaded() };

    constructor () {
        Logger.DEBUG("Construct Observer")

        this.trackedElements = new Elements(this.elementLoadedHandler);
        this.watchdog = new Watchdog(5000, () => { this.whatchdogHandler() });
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
            window.addEventListener("load", this.pageLoadHandler);
        } else {
            Logger.WARNING("Called 'startObserving' but already observing");
        }
    }

    /// Stop observing mutation events
    stopObserving(stopOrigin) {
        if (this.isObserving) {
            this.isObserving = false;
            this.watchdog.stop();

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
                    Logger.WARNING("loadingTimeOfLastElement is zero, not generatic VC metric.");
                }
            } else {
                Logger.ERROR("New Relic browser agent not loaded, VC metric not generated");
            }

            // Remove all "load" listeners from elements
            this.trackedElements.untrackAll();
            window.removeEventListener('load', this.pageLoadHandler);

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
        this.loadingTimeOfLastElement = Math.abs(Date.now() - this.initTime);

        Logger.DEBUG("%c Element loaded ", 'background:orange; color:white', ev);
        Logger.DEBUG("Loading time of last visible element loaded = ", this.loadingTimeOfLastElement);
    }

    // Executed when whatchdog timer fires
    whatchdogHandler() {
        Logger.DEBUG("%c Watchdog timer! ", "background:red; color:white");
        this.stopObserving(WATCHDOG);
    }

    // Page load event handler
    pageLoaded() {
        Logger.DEBUG("%c PAGE LOAD FINISHED ", "background:red; color:white");

        //TODO: we have to fix premature page load, it fires before the list of elements is loaded
        Logger.DEBUG("%c DO NOTHING, WAIT FOR WATCHDOG ", "background:red; color:white");
        //this.stopObserving(PAGELOAD);
    }
}