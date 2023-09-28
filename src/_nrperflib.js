/*
TODO:
- Convert this into an actual NPM component.
- Use classes and some reusable code.
- Get rid of static objects in window (nrperf stuff).
- Use a callback or event listener for the actual VC metric send, instead of a explicit call to "addPageAction".
*/

"use strict";

//TODO: move the whole thing into NREUM the object

//window.NREUM = window.NREUM || {}
//window.NREUM.nrperflib = function(){
window.nrperflib = function(){

    const customEvents={
        progress:{
            update: new Event('nrperflib.event.process.update', {bubbles:true, cancelable:true}),
            end: new Event('nrperflib.event.process.end', {bubbles:true, cancelable:true}),
            complete: new Event('nrperflib.event.process.complete', {bubbles:true, cancelable:true}),
            killwatchdog: new Event('nrperflib.event.process.killwatchdog', {bubbles:true, cancelable:true}),
        },
    }

    let
        _cssRulesJSON=[],
        _inlineStyleElemArr=[],
        _visibleDocEleArr=[],
        _mutationElemMap= new Map()

    let  _mutationObserver,
        _myselfStartTime,
        _isWatchDogWatching=false,
        _watchDogProc

    let _historyState={prevState:undefined, currState:undefined,}


    const lastAddedInterval= 1 * 1000 // seconds
    const _maxRunningTime = 15 *1000 //seconds


    const logger=function(enabled){
        if (!enabled){
            return _=>{}
        }
        return console.log
    }

    const INFO=logger(true)
    const DEBUG=logger( (NODE_ENV && NODE_ENV.includes("DEV")))
    const WARNING=logger(true)
    const ERROR=logger(true)

    //--------------------------------------------
    // Bootstrap / initialize here

    observe()

    //--------------------------------------------

    function observe() {

        if ( /*(!window.newrelic) &&*/ (!window.performance) && (!window.MutationObserver) ){
            console.log("%c[ERROR] ", "background:red; color:white","New Relic custom performance library requires New Relic Browser Agent and browser version that supports Performance API and MutationObserver")
            return {}
        }

        _historyState.currState = (window && window.history && window.history.state && window.history.state.key)? window.history.state.key: undefined

        window.addEventListener('load',e=>{
            _onDOMMutation()

            _pageLoadHandler(e)
            _myselfStartTime = Date.now()
            _watchDog()
        }, false)

        window.addEventListener('hashchange',_routeChangeHandler, false)
        window.addEventListener('click',_routeChangeHandler, false)

        window.addEventListener(customEvents.progress.end.type, _observeCompleteHandler, false)
        window.addEventListener(customEvents.progress.killwatchdog, e=>{
            _emitEnd()
        } ,false)
    }

    function _pageLoadHandler(event){
        let _perfEntries=    performance.getEntriesByType('resource')
        _cssRulesJSON=   _parseDocStyleSheets()
        _inlineStyleElemArr = Array.from(document.querySelectorAll('[style]'))

        for (let  perfEntry of _perfEntries){
            let props= _createPerfProps(perfEntry)
            if (!props.element){
                DEBUG(`DEBUG _pageLoadHandler() Skipping element not found for [${perfEntry.initiatorType}] [${perfEntry.name}] perfEntry[${JSON.stringify(perfEntry)}]`)
                continue;
            }
            if (_isVisible(props.element)){
                DEBUG(`DEBUG _pageLoadHandler() element is visible.. tracking.`)
                DEBUG(props)

                _visibleDocEleArr.push( { ...props })
            }
        }
    }

    function _routeChangeHandler(event){
        DEBUG(`DEBUG _routeChangeHandler()`)

        if (window.history && window.history.state){
            _historyState.prevState = _historyState.currState
            _historyState.currState= window.history.state.key
        }

        DEBUG(`DEBUG _historyState =${JSON.stringify(_historyState)} _isWatchDogWatching=${_isWatchDogWatching}`)

        if  ( !_isWatchDogWatching   && (_historyState.prevState != _historyState.currState)){
            _myselfStartTime = Date.now()
            _onDOMMutation()
            _pageLoadHandler(event)
            _watchDog()
        }
    }

    function _observeCompleteHandler(event){

        let {   _cssRulesJSON,
                _inlineStyleElemArr,
                _visibleDocEleArr,
                _mutationElemMap,
                time,
            }= event.data

        _isWatchDogWatching= false
        _mutationObserver.disconnect();

        clearTimeout(_watchDogProc)
        if ( !_visibleDocEleArr || _visibleDocEleArr.length == 0) {
            INFO("%c DONE ", 'background:green; color:white',`Total Visible Elements count[${_visibleDocEleArr.length}]`)
            DEBUG("DEBUG observer() no visible element detected on page or available data")
            _mutationElemMap.clear()
            _visibleDocEleArr=[]
            return
        }

        let slowestResource = _visibleDocEleArr.reduce ( (acc, curr)=>  acc= (acc.endTime >curr.endTime)?acc:curr  )
        let {name,simpleName,initiatorType, element, duration, perfEntry, perfMeasure} = slowestResource
        let {loadEventEnd} = performance.getEntriesByType('navigation')[0]

        perfEntry= perfEntry || {}
        perfMeasure= perfMeasure || {}

        let stats={
            vitemsVisible: _visibleDocEleArr.length,
            vassetSimpleName:  simpleName,
            vassetName:  name,
            vinitiatorType:  initiatorType,
            vstartTime:  perfEntry.startTime || perfMeasure.startTime,
            vendTime:  perfEntry.responseEnd || perfMeasure.endTime,
            vduration: perfEntry.duration|| perfMeasure.duration,
            vloadEventEnd: loadEventEnd,
        }

        stats.vcomplete = stats.vendTime

        //TODO: generate metric

        //newrelic.addPageAction("VisuallyComplete", stats)
        console.log("------->\nGenerate VisuallyComplete", stats, "\n<-------");

        INFO("%c DONE ", 'background:green; color:white',`Total Visible Elements count[${_visibleDocEleArr.length}]`)
        INFO(event.data)
        INFO(`DEBUG last/slowest resource: ${JSON.stringify(stats)}`)
        INFO(slowestResource)

        _mutationElemMap.clear()
        _visibleDocEleArr=[]
    }

    function _onDOMMutation() {
        if(!_mutationObserver){
            _mutationObserver = new MutationObserver(_DOMmutationSubscriber)
        }

        _mutationObserver.observe(document.body, {
            childList: true,
            attributes: true,
            subtree: true
        })
    }


    function _DOMmutationSubscriber(mutations) {
        if (!mutations || (mutations && mutations.length == 0)) {
            return
        }
        for (let mutation of mutations){
            DEBUG(`DEBUG _DOMmutationSubscriber() mutation.type=${mutation.type}`)
            DEBUG(`DEBUG _DOMmutationSubscriber() addedNodes[${mutation.addedNodes.length}] removedNodes [${mutation.removedNodes.length}]`)

            _processStyleChange(mutation)
            _processAddedNodes(mutation)

        }
    }

    function  _attachListener (name,  element){
        performance.mark(`${name}-start`)

        if (_mutationElemMap.get(name)){
            return
        }

        _mutationElemMap.set(name, {name, time:Date.now(), element})

        element.addEventListener('load', function(event){
            let props = {
                name,
                element,
            }
            _onTagLoadHandler(event, props)
            _emitLoadComplete(name)
        }, false)
    }


    function _onAttributeStyleChange(mutation){
        let {oldValue, attributeName} = mutation,
            element = mutation.target

        let oldBgImg='',
            bgImage =   window.getComputedStyle(element).getPropertyValue('background-image')

        if (( bgImage.toLowerCase() =='none') || (bgImage.length==0)){
            DEBUG(`DEBUG _onAttributeStyleChange() style attribute,  skipping no background image found`)
            return
        }

        if ( oldValue && (oldValue.includes('background-image') || oldValue.includes('url')) ){
            oldBgImg = _createSimpleNameFromUrl(oldValue)

            if (  bgImage.includes(oldBgImg)){
                DEBUG(`DEBUG _onAttributeStyleChange() style attribute, skipping no background image change`)
                return
            }
        }
        _attachListener( _createSimpleNameFromUrl(bgImage) , element)
    }

    function _onAttributeClassChange(mutation){
        let {attributeName} = mutation,
            element = mutation.target

        let key = attributeName,
            value= element.getAttribute(key),
            css= _cssRulesJSON[value]

        DEBUG(`DEBUG  _onAttributeClassChange() class attribute [${key}]=[${value}] cssRuleJSON:`)
        if (!css){
            return
        }

        let bg= (css['background'] || css['background-image'])
        if (bg && bg.length >0){
            let entry = performance.getEntriesByName(bg)
            if (entry){
                let props= _createPerfProps(entry, element)
                _visibleDocEleArr.push( { ...props })
            }else{
                WARNING(`WARNING  _onAttributeClassChange() class attribute [${key}]=[${value}] performance timing for background image [${bg}] not found.`)
            }
        }
    }

    function _processStyleChange(mutation){
        if (mutation.type != 'attributes') {
            return
        }

        DEBUG(`DEBUG _processStyleChange() mutation.attributeName=${mutation.attributeName} oldvalue=${ mutation.oldValue}`)
        DEBUG(`DEBUG _processStyleChange() mutation.attributeNamespace=${mutation.attributeNamespace}`)
        DEBUG(`DEBUG _processStyleChange() element is visible [${_isVisible( mutation.target)}] :`)
        DEBUG( mutation.target)

        let {attributeName} = mutation,
            element = mutation.target

        if (!_isVisible(element)){
            DEBUG (`DEBUG _processStyleChange() skipping element is not visible`)
            return
        }
        switch( attributeName){
            case "style" :
                _onAttributeStyleChange(mutation)
                break;
            case "src":
                let element = mutation.target

                if ( element.nodeName.toLowerCase()  !== 'iframe'){
                    return
                }
                _attachListener( element.src.split("?")[0]  , element)
                break;
            case "class":
                _onAttributeClassChange(mutation)
                break;
            default:
                WARNING("%c WARNING " , "background:red; color:white", `_processStyleChange() Ignoring mutation attribute [${attributeName}] not supported`)
                break;
        }
    }

    function _processAddedNodes({addedNodes=[]}){
        if (addedNodes.length ==0){
            return
        }

        for (let node of addedNodes){
            if (node.nodeType != window.Node.ELEMENT_NODE){
                continue;
            }

            if (!_isVisible(node)){
                DEBUG(`DEBUG _processAddedNodes() node [${node.nodeName}] nodeType [${node.nodeType}] is not visible skipping.`)
                continue;
            }

            DEBUG(`DEBUG _processAddedNodes() mutation.addedNodes nodeType [${node.nodeType}] nodeName[${node.nodeName}]`)
            DEBUG(`DEBUG _processAddedNodes() Node console log`)
            DEBUG(node)
            
            if (node.nodeName.toLowerCase() == "iframe"){
                // let iframeDoc = (node.contentDocument) ? node.contentDocument:node.contentWindow.document
                let iframeWindow = node.contentWindow
                let iframeName = `iframe-` + ((node.id || node.name)?(node.id || node.name) : (`oTop${node.offsetTop}_oLeft${node.offsetLeft}`))
                _attachListener( iframeName  , node)

                iframeWindow.addEventListener("DOMContentLoaded", _inspectNodes, false)
            }else{
                _inspectNodes({target:node} )
            }
        } // addedNodes
    }
    function _inspectNodes(event){

        let imgTags   = Array.from(event.target.getElementsByTagName('img')).filter(node => _isVisible(node))
        let iframeTags = Array.from(event.target.getElementsByTagName('iframe')).filter(node => _isVisible(node))

        imgTags.forEach( imgTag => {
            let name = imgTag.id || _createSimpleNameFromUrl(imgTag.src)
            _attachListener( name , imgTag)
        })

        iframeTags.forEach( iframeTag=>{
            let name = iframeTag.id || _createSimpleNameFromUrl(iframeTag.src)
            _attachListener( name, iframeTag)
        })
    }



    function _onTagLoadHandler(event, props){
        let {name, element}= props

        const _clearPerfMarks=function(){
            performance.clearMeasures(`${name}-measure`)
            performance.clearMarks(`${name}-start`)

        }

        let startMark   = performance.getEntriesByName(`${name}-start`,'mark')

        if (!startMark || startMark.length ==0){
            _clearPerfMarks()
            return
        }

        // start to now
        performance.measure(`${name}-measure`, `${name}-start`)

        let measure= performance.getEntriesByName(`${name}-measure`)[0]

        if (!measure.endTime){
            measure.endTime = measure.startTime + measure.duration
        }

        let tmpProp = _createPerfProps(measure, {element, simpleName:name})
        _visibleDocEleArr.push( { ...tmpProp })
        _clearPerfMarks()
    }



    /*
     Create styleSheets map
    
    {
       #CBR a:{
        background: "url('/cs/groups/public/documents/adacct/icon_tfn.png') left top / 16px 16px no-repeat !important"
        color: "rgb(0, 0, 0) !important"
        display: "block"
        font-weight: "bold"
        margin-top: "8px"
        padding: "0px 0px 0px 22px"
      }
    }
    */
    function _parseDocStyleSheets(){
        let docStyleSheets= Array.from(document.styleSheets)
        var cssRules ={}

        for (let i=0, count= docStyleSheets.length; i< count; i++){
            let skip=false

            let styleSheets = docStyleSheets[i]
            if (!styleSheets){
                DEBUG(`DEBUG _parseDocStyleSheets() no stylesheets skipping. styleSheets[${styleSheets}]`)
                continue
            }

            try{
                let y = styleSheets.cssRules // test if we can access the cssRules
            }catch (err){
                skip=true
            }
            if (skip){
                DEBUG(`DEBUG _parseDocStyleSheets() cannot access cssRules skipping. styleSheets[${JSON.stringify(styleSheets.href)}]`)
                continue
            }

            let rules = Array.from(styleSheets.cssRules)
            for (let ii=0, ccount= rules.length; ii< ccount; ii++){
                let rule = rules[ii]
                let {cssText} = rule

                let [key, value] = cssText.split("{")

                if (key.includes("@")){
                    DEBUG("DEBUG _parseDocStyleSheets() found @media skipping")
                    continue
                }

                value = "{" + value.replace(/\"/g,"'")
                key= key.trim()
                // DEBUG(`key[${key}] value=[${value}]`)

                let props= _CssRuleToJson(value)
                if (Object.keys(props).length == 0){
                    continue
                }
                cssRules[key] = props
            }
        }

        return cssRules
    }

    function _parseBgImgURL(url){
        // given: `url('http://blah.com/images/img.png')`
        // returns  'http://blah.com/images/img.png'

        return url.match(/\((.*?)\)/)[1].replace(/('|")/g, '');
    }


    function _CssRuleToJson(cssRule){
        let props={}

        try{
            if (!cssRule || (cssRule && cssRule.length ==0)){
                return
            }
            cssRule=cssRule.replace(/[{}]/g,"").replace(/"/g,"'").trim()
            let attrs = cssRule.split(";")

            for(let i=0,c = attrs.length; i< c; i++){
                let attr= attrs[i]
                if (!attr || (attr && attr.length ==0)){
                    continue;
                }
                attr=attr.trim()
                let key = attr.substring(0, attr.indexOf(":"))
                let value = attr.substring(attr.indexOf(":")+1, attr.length)
                props[key.trim()] = `${value.trim()}`
            }

        }catch(e){
            ERROR("ERROR _CssRuleToJson() parsing.")
        }

        return props
    }



    function _isInViewport(elem, options) {

        let rect = elem.getBoundingClientRect()
            , bottom=  window.innerHeight || document.documentElement.clientHeight
            , right=   window.innerWidth ||  document.documentElement.clientWidth

        console.log("Bounding rect of ", elem, "is = ", rect)
        
        return ( rect.top >= 0 &&
            rect.left >= 0 &&
            (rect.bottom <= bottom) &&
            (rect.right  <= right )
        );
    }
    function _isStyleVisible(elem){
        var style = window.getComputedStyle(elem);
        return  style.width !== "0" &&
            style.height !== "0" &&
            style.opacity !== "0" &&
            style.display!=='none' &&
            style.visibility!== 'hidden' &&
            elem["type"] !== 'hidden';
    }

    function _isVisible(elem, options) {

        console.log("_isVisible", elem, options);

        if (elem.nodeType != window.Node.ELEMENT_NODE){
            console.log("Element is a node");
            elem = elem.parentNode
        }

        return (!elem) ?false: (_isInViewport(elem, options) && _isStyleVisible(elem))
    }


    function _createSimpleNameFromUrl(urlStr){
        if (!urlStr || urlStr.length == 0){
            return
        }

        let tmpStr = urlStr
        if (urlStr.includes("url")){
            let tmp = urlStr.split(' ').filter( n => n.includes("url"))[0]
            tmpStr = tmp.replace(/[()\"]/g, ' ').replace("url",'').trim()

        }
        return  tmpStr.split('?')[0].substring(tmpStr.lastIndexOf("/")+1, tmpStr.length)
    }

    function _findCSSResourceFromList (simpleName ){

        let found=false,
            selector,
            element

        // check in CSS Rules
        for(let key in _cssRulesJSON ){

            // locate background , background-image in _cssRulesJSON
            let rule = _cssRulesJSON[key]
            let bg= (rule['background'] || rule['background-image'])

            if (bg && bg.length >0 && bg.includes(simpleName)){
                selector= key
                found=true
            }
        }

        // Check Inlined styles
        if (!found){
            for( let elem of _inlineStyleElemArr){

                let bg = window.getComputedStyle(elem).getPropertyValue('background-image')

                if (bg && bg.length >0 && bg.includes(simpleName)){
                    selector= `[style*="${simpleName}"]`
                    element= elem
                    break;
                }
            }
        }

        return {selector, element}
    }

    function _createSelector(perfEntry){
        let {initiatorType, name}=  perfEntry
        
        let selector='',
            element,
            simpleName = _createSimpleNameFromUrl( name )

        switch(initiatorType){
            case "video":
                selector=  `[poster*="${simpleName}"]`
                break;
            case "link":
                selector=  `[href*="${simpleName}"]`
                break;
            case "css":
                ({selector, element} = _findCSSResourceFromList (simpleName))
                break;
            default:
                selector=  `[src*="${simpleName}"]`
        }

        // DEBUG(`simpleName[${simpleName}] selector[${selector}] element=${element}`)
        return {selector, simpleName, element}
    }



    function _createPerfProps(entry, overrides){
        if (!entry || (typeof entry !== 'object')) {
            ERROR ("ERROR _createPerfProps() argument is empty")
            return ""
        }

        if (!overrides){
            overrides={}
        }


        let name= overrides.name || entry.name,
            simpleName= overrides.simpleName|| _createSimpleNameFromUrl(entry.name),
            initiatorType= overrides.initiatorType ||  entry.initiatorType,
            entryType=  overrides.entryType || entry.entryType,
            element=    overrides.element,
            duration=   overrides.duration ||entry.duration,
            perfEntry= overrides.perfEntry,
            perfMeasure= overrides.perfMeasure,
            endTime = overrides.endTime || (entry.endTime || entry.responseEnd),
            selector= overrides.selector
        ;

        initiatorType = initiatorType || (entry.initiatorType)?entry.initiatorType:entry.entryType

        if ((entry.constructor) &&(entry.constructor.name === 'PerformanceResourceTiming')){
            let props =_createSelector(entry)
            simpleName = props.simpleName

            if (!overrides.element ){
                if  (!props.element && props.selector && props.selector.length>0) {
                    element = document.querySelector(props.selector)
                }else{
                    element = props.element
                }
            }
            perfEntry= entry

        }else{
            element = (overrides && overrides.element)? overrides.element : {}
            perfMeasure = entry
        }


        return {name,simpleName,initiatorType,entryType,  element, duration, endTime, perfEntry, perfMeasure, selector}
    }


    function _watchDog(){

            ( function(){ return new Promise( function(resolve, reject){
                _isWatchDogWatching = true

                _watchDogProc= setTimeout( _=>{

                        // check if last DOM mutation is >= lastAddedInterval
                        DEBUG(`DEBUG _watchDog() checking active DOM mutation`)

                        let _mutationArr= Array.from(_mutationElemMap)

                        if (_mutationArr.length ==0){
                            return resolve("no active DOM mutations")
                        }

                        let lastItemArr = _mutationArr.reduce((acc,curr)=> ( (acc.duration > curr.duration)?acc:curr ), {duration:0})
                        let  lastTime= lastItemArr[1].time,
                             elapsedTime= Date.now() - lastTime

                        if (elapsedTime >= lastAddedInterval ){
                            return resolve(`found stale/long (>${lastAddedInterval}) running active DOM mutation elapsed time=${elapsedTime}]`)
                        }

                        DEBUG(`DEBUG _watchDog() elapsedTime[${elapsedTime}] is over ${lastAddedInterval} =${(elapsedTime >= lastAddedInterval )} `)
                        return  reject("found active DOM mutation")

                    }, lastAddedInterval)
            })})()
            .then(
                e=>{
                    DEBUG(`DEBUG _watchDog() complete ending. ${e}`)
                    _emitEnd()
                },
                e=>{

                let elapsedSinceStart = Date.now() - _myselfStartTime
                    if (elapsedSinceStart < _maxRunningTime){
                        DEBUG("DEBUG _watchDog() active DOM mutation found, going back to sleep")
                        _watchDog()

                    }else{
                        // exceeded running time per harvest
                        DEBUG("DEBUG _watchDog() Over MAXIMUM running time of ${_maxRunningTime} detected flushing")
                        _emitEnd()

                    }
                })
    }


    function _createExportProps(){
        return {
            _cssRulesJSON,
            _inlineStyleElemArr,
            _visibleDocEleArr,
            _mutationElemMap,
            _isWatchDogWatching,
            time: Date.now()
        }
    }

    function _emitLoadComplete( name) {
        delete _mutationElemMap.delete( name )
        customEvents.progress.complete.data = _createExportProps()
        document.body.dispatchEvent(customEvents.progress.complete)
    }

    function _emitEnd() {
        customEvents.progress.end.data  = _createExportProps()
        document.body.dispatchEvent(customEvents.progress.end)

    }

    return{
        observe,
        pageLoadHandler:_pageLoadHandler,
        CODE_VERSION,
        customEvents,
        getVisibleElements:_=> _visibleDocEleArr,
        getCSSRules:_=> _cssRulesJSON,
        getInlinedStyleElements:_=>_inlineStyleElemArr,
        getMutationElemens: _=>_mutationElemMap,
        emitEnd:_emitEnd,
        emitLoadComplete: _emitLoadComplete,
    }
}


//
// Bootstrap custom performance library
//
document.addEventListener("DOMContentLoaded", _ => {
    //TODO: move the whole thing into NREUM the object
    
    // if (!window.newrelic){
    //     console.log("Error no New Relic agent found skipping custom library.")
    //     return
    // }
    // if (!window.NREUM.nrperfAgent){
    //     window.NREUM.nrperfAgent = window.NREUM.nrperflib()
    // }
    if (!window.nrperfAgent){
        window.nrperfAgent = window.nrperflib()
    }

}, false);
