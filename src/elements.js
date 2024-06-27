import { Logger } from "./logger";

class ElementObject {
    timestamp = 0;
    element = null;
    
    constructor(timestamp, element) {
        this.timestamp = timestamp;
        this.element = element;
    }
}

export class Elements {
    trackedElements = [];
    elementLoadedHandler = null;
    counter = 0;

    constructor(elementLoadedHandler) {
        this.elementLoadedHandler = elementLoadedHandler;
    }

    trackElement(elem) {
        Logger.DEBUG("Tracking element = ", elem);
        this.trackedElements.push(new ElementObject(Date.now(), elem));
        elem.addEventListener('load', this.elementLoadedHandler);
        this.counter += 1;
    }

    elementLoaded() {
        this.counter -= 1;
    }

    pendingElements() {
        return this.counter;
    }

    untrackAll() {
        while (this.trackedElements.length > 0) {
            let item = this.trackedElements.pop().element;
            item.removeEventListener('load', this.elementLoadedHandler);
        }
        this.counter = 0;
    }
}