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

    constructor(elementLoadedHandler) {
        this.elementLoadedHandler = elementLoadedHandler;
    }

    trackElement(elem) {
        this.trackedElements.push(new ElementObject(Date.now(), elem));
        elem.addEventListener('load', this.elementLoadedHandler);
    }

    untrackAll() {
        while (this.trackedElements.length > 0) {
            let item = this.trackedElements.pop().element;
            item.removeEventListener('load', this.elementLoadedHandler);
        }
    }
}