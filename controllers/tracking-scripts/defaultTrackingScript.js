function defaultTrackingScript( testData, variationServed) {
    const { analitycsID, defaultTrackingName } = testData;

    if (analitycsID === '') {
        return '';
    }

    const script = `
        if (typeof gtag !== 'function') {
        window.dataLayer = window.dataLayer || [];
        function gtag() {
            dataLayer.push(arguments);
        }
        gtag('js', new Date());
        gtag('config', '${analitycsID}', { 'send_page_view': false });
        }

        function waitForGtag(callback) {
        if (typeof gtag !== 'undefined') {
            callback();
        } else {
            setTimeout(function () {
            waitForGtag(callback);
            }, 100);
        }
        }
        waitForGtag(() => {
        gtag('event', 'AB_${variationServed}_${defaultTrackingName}_Visit', {
            'send_to': '${analitycsID}'
        });
        });
    `;

    return script;
}

module.exports = defaultTrackingScript;



