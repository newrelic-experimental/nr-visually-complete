import { Logger } from "./logger";
import { Visibility } from "./visibility";
import { Watchdog } from "./watchdog";

//TODO: also observe background images, set as style

export class Observer {
    observer = null;
    initTime = null;
    addedElements = [];
    watchdog = null;
    elementLoadedHandler = (ev) => { this.elementLoaded(ev) };
    pageLoadHandler = () => { this.pageLoaded() };

    constructor () {
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
    stopObserving() {
        if (this.observer) {
            Logger.DEBUG("Stop Observing")

            this.observer.disconnect();
            this.observer = null;
            // Remove all "load" listeners from elements
            for (let i = 0; i < this.addedElements.length; i++) {
                let item = this.addedElements[i].item;
                item.removeEventListener('load', this.elementLoadedHandler);
            }

            this.addedElements = []

            window.removeEventListener('load', this.pageLoadHandler);
        }
    }

    /// Add load events to all added elements
    checkAddedElements(arraynodes) {
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
            } else {
                Logger.DEBUG("Not a DOM element, ignoring", item)
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
                Logger.DEBUG("A child node has been added or removed", mutation);
                this.checkAddedElements(mutation.addedNodes)
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

        Logger.DEBUG("%c Element loaded ", 'background:orange; color:white', ev);
        Logger.DEBUG("Time since init time = ", Math.abs(Date.now() - this.initTime));
        if (this.addedElements.length > 0) {
            let item = this.addedElements[this.addedElements.length - 1];
            Logger.DEBUG("Loading time of last visible element loaded = ", Math.abs(Date.now() - item.ts));
        }
    }

    // Executed when whatchdog timer fires
    whatchdogHandler() {
        this.watchdog.stop();
        this.stopObserving();
    }

    // Page load event handler
    pageLoaded() {
        Logger.DEBUG("%c PAGE LOAD FINISH ", "background:red; color:black");
        this.watchdog.stop();
        this.stopObserving();
    }
}