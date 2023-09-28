import { Observer } from "./observer";

// Start Visually Complete Metric observer on script load
let observer = new Observer();
observer.startObserving(document);