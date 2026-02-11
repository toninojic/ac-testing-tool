function defaultTrackingScript(testData, variationServed) {
    const {
        analitycsID,
        defaultTrackingName,
        trackingScriptType = 'gtag'
    } = testData;

    if (!analitycsID || !defaultTrackingName) {
        return '';
    }

    const script = `
        window.acTrackingConfig = {
            analitycsID: '${analitycsID}',
            trackingScriptType: '${trackingScriptType}'
        };

        window.acSendTrackingEvent = function(eventName) {
            if (!eventName) {
                return;
            }

            if (window.acTrackingConfig.trackingScriptType === 'dataLayer') {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                    event: 'GA4event',
                    'ga4-event-name': 'cro_event',
                    'ga4-event-p1-name': 'event_category',
                    'ga4-event-p1-value': eventName,
                    'ga4-event-p2-name': 'event_label',
                    'ga4-event-p2-value': ''
                });
                return;
            }

            window.dataLayer = window.dataLayer || [];
            if (typeof window.gtag !== 'function') {
                window.gtag = function() {
                    window.dataLayer.push(arguments);
                };
                window.gtag('js', new Date());
                window.gtag('config', window.acTrackingConfig.analitycsID, { send_page_view: false });
            }

            window.gtag('event', eventName, {
                send_to: window.acTrackingConfig.analitycsID
            });
        };

        window.acObserveElements = function(selector, boundFlag, onElementDetected) {
            if (!selector || typeof onElementDetected !== 'function') {
                return;
            }

            const processElements = function() {
                document.querySelectorAll(selector).forEach(function(element) {
                    if (element.hasAttribute(boundFlag)) {
                        return;
                    }

                    element.setAttribute(boundFlag, 'true');
                    onElementDetected(element);
                });
            };

            processElements();

            const observer = new MutationObserver(function() {
                processElements();
            });

            const root = document.documentElement || document.body;
            if (!root) {
                return;
            }

            observer.observe(root, {
                childList: true,
                subtree: true
            });
        };

        window.acSendTrackingEvent('AB_${variationServed}_${defaultTrackingName}_Visit');
    `;

    return script;
}

module.exports = defaultTrackingScript;
