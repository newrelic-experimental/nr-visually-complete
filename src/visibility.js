export class Visibility {

    static isVisible(elem) {
        return (
            this.isInViewport(elem) &&
            this.isStyleVisible(elem) &&
            elem.checkVisibility({
                contentVisibilityAuto: true,
                opacityProperty: true,
                visibilityProperty: true
            })
        );
    }

    /// Check if elements lies within viewport limits, with a 5% non-overlapping threshold in all directions.
    static isInViewport(elem) {
        const threshold = 0.05;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        
        const topLimit = -threshold * viewportHeight;
        const leftLimit = -threshold * viewportWidth;
        const bottomLimit = viewportHeight + threshold * viewportHeight;
        const rightLimit = viewportWidth + threshold * viewportWidth;
        
        let rect = elem.getBoundingClientRect();
        return (
            rect.top >= topLimit &&
            rect.left >= leftLimit &&
            rect.bottom <= bottomLimit &&
            rect.right <= rightLimit
        );
    }

    static isStyleVisible(elem){
        let style = window.getComputedStyle(elem);
        return (
            style.width !== "0" &&
            style.height !== "0" &&
            style.opacity !== "0" &&
            style.display !=='none' &&
            style.visibility !== 'hidden' &&
            elem["type"] !== 'hidden'
        );
    }
}