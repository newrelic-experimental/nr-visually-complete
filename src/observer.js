import { Logger } from "./logger";
import { Visibility } from "./visibility";
import { Watchdog } from "./watchdog";

/* TODO:
- Set "initTime" externally in case we have to start the observer later.
- Monitor AJAX requests.
- Custom loads, elements not tracked automatically. App must signal it.

Limitations:
- Not possible to detect background image load set as a style (https://www.sitepoint.com/community/t/onload-for-background-image/6462).
  Alternative, reload the image (https://jsfiddle.net/tovic/gmzSG/)
*/

class StopOrigin {
    static Whatchdog = new StopOrigin('Watchdog');
    static PageLoad = new StopOrigin('PageLoad');
    constructor(val) {
        this.val = eval(`() => { return '${val}'; }`);
    }
}

export class Observer {
    observer = null;
    initTime = null;
    addedElements = [];
    watchdog = null;
    loadingTimeOfLastElement = 0;
    
    elementLoadedHandler = (ev) => { this.elementLoaded(ev) };
    pageLoadHandler = () => { this.pageLoaded() };

    constructor () {
        Logger.DEBUG("Construct Observer")

        this.watchdog = new Watchdog(15000, () => { this.whatchdogHandler() });
        this.observer = new MutationObserver((ml, obs) => { this.mutationObservedHandler(ml, obs) });
    }

    /// Start observing mutation events
    startObserving(targetNode) {
        this.initTime = Date.now();
        this.observer.observe(targetNode, { attributes: true, childList: true, subtree: true });
        this.watchdog.reset();
        window.addEventListener("load", this.pageLoadHandler);
    }

    /// Stop observing mutation events
    stopObserving(stopOrigin) {
        if (this.observer) {
            Logger.DEBUG("Stop Observing")

            // Disconnect observer
            this.observer.disconnect();
            this.observer = null;

            // Generate VC metric
            if (typeof newrelic !== "undefined") {
                newrelic.interaction()
                    .setAttribute("vcValue", this.loadingTimeOfLastElement)
                    .setAttribute("vcStopOrig", stopOrigin.val());
            }

            // Remove all "load" listeners from elements
            while (this.addedElements.length > 0) {
                let item = this.addedElements.pop().item;
                item.removeEventListener('load', this.elementLoadedHandler);
            }
            window.removeEventListener('load', this.pageLoadHandler);

            Logger.DEBUG("%c Visually Complete Metric = " + this.loadingTimeOfLastElement.toString() + " ms", "background:green; color:white");
        }
    }

    /// Add load events to all added elements
    processAddedElements(arraynodes) {
        for (let i = 0; i < arraynodes.length; i++) {
            let item = arraynodes[i];
            if (item instanceof Element) {
                if (Visibility.isVisible(item)) {
                    Logger.DEBUG("This element is VISIBLE", item)
                    this.addedElements.push({"item":item, "ts": Date.now()});
                    item.addEventListener('load', this.elementLoadedHandler);
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
        Logger.DEBUG("%c Watchdog timer! ", "background:red; color:black");
        this.watchdog.stop();
        this.stopObserving(StopOrigin.Whatchdog);
    }

    // Page load event handler
    pageLoaded() {
        Logger.DEBUG("%c PAGE LOAD FINISHED ", "background:red; color:black");
        this.watchdog.stop();
        this.stopObserving(StopOrigin.PageLoad);
    }
}