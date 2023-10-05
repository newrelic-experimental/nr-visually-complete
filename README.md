<a href="https://opensource.newrelic.com/oss-category/#new-relic-experimental"><picture><source media="(prefers-color-scheme: dark)" srcset="https://github.com/newrelic/opensource-website/raw/main/src/images/categories/dark/Experimental.png"><source media="(prefers-color-scheme: light)" srcset="https://github.com/newrelic/opensource-website/raw/main/src/images/categories/Experimental.png"><img alt="New Relic Open Source experimental project banner." src="https://github.com/newrelic/opensource-website/raw/main/src/images/categories/Experimental.png"></picture></a>

# NR Visually Complete

This module captures the Visually Complete (VC) metric on a web page. VC is the time requiered for all visible elements on the screen to load.

## Value

It makes use of the New Relic Browser Agent to attach an attributed, called `vcValue`, to [BrowserInteraction](https://docs.newrelic.com/attribute-dictionary/?event=BrowserInteraction) events of type `initialPageLoad`.

This attribute is an integer that represents a time in milliseconds.

Additionally, it generates another attribute called `vcStopOrig`, to indicate what caused the event. In normal ciscumstances the value will be `pageload`, which means the page loaded normally. If the value is `watchdog`, it means the page load requiered too much time and the watchdog timer fired. In this case, the `vcValue` will indicate the time of the last element loaded before the watchdog triggered.

## Build

Clone this repo and then run:

```
npm install
```

Then build it by running either:

```
npm run build:dev
```

To obtain a dev build, or:

```
npm run build
```

For a production build.

Results will be located in `dist`.

## Usage

Load the script in your index HTML and call init method:

```html
    <head>
        <!-- ... -->
        <script type="text/javascript" src="nrvcm-X.Y.Z.bundle.js"></script>
        <script>
            nrvcm.init();
        </script>
    </head>
```

NR Visually Complete requieres the [New Relic Browser Agent](https://docs.newrelic.com/docs/browser/browser-monitoring/installation/install-browser-monitoring-agent/) to generate data. You should load it early in your page's head.

After calling `init()`, it will immediately start observing changes in the page to calculate the VC metric. It will also register listeners for navigation events and trigger the VC metric observer automatically when a route change happens. But in some situations this automatic behavior might not be required/desired, for these cases the VC observer can be called manually. For example after a custom action, like a user clicking a tab or an AJAX request that will update the DOM. The way to call it is:

```javascript
nrvcm.observer.startObserving(document);
```

Instead of `document`, it's possible to use any DOM element, to further restrict the scope of monitoring.

## Example

To run the example just open a terminal on the `example` folder and run:

```
python3 -m http.server 8008
```

Then open the following [link](http://0.0.0.0:8008/).

## Support

New Relic has open-sourced this project. This project is provided AS-IS WITHOUT WARRANTY OR DEDICATED SUPPORT. Issues and contributions should be reported to the project here on GitHub.

>We encourage you to bring your experiences and questions to the [Explorers Hub](https://discuss.newrelic.com) where our community members collaborate on solutions and new ideas.


## Contributing

We encourage your contributions to improve NR Visually Complete! Keep in mind when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project. If you have any questions, or to execute our corporate CLA, required if your contribution is on behalf of a company, please drop us an email at opensource@newrelic.com.

**A note about vulnerabilities**

As noted in our [security policy](../../security/policy), New Relic is committed to the privacy and security of our customers and their data. We believe that providing coordinated disclosure by security researchers and engaging with the security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any of New Relic's products or websites, we welcome and greatly appreciate you reporting it to New Relic through [HackerOne](https://hackerone.com/newrelic).

## License

NR Visually Complete is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.
