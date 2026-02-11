function trackElementInView(trackingGoal, _testData, variationServed) {
    const { ac_test_goal, ac_test_goal_match, ac_test_element_name } = trackingGoal;

    if (ac_test_goal !== 'css_selector' || ac_test_goal_match === '') {
        return '';
    }

    const eventName = `AB_${variationServed}_${ac_test_element_name}`;
    const flagName = `data-ac-bound-in-view-${variationServed}-${ac_test_element_name}`;

    const script = `
        const acInViewObserver_${variationServed}_${ac_test_element_name.replace(/[^a-zA-Z0-9_]/g, '_')} = new IntersectionObserver(function(entries, observer) {
            entries.forEach(function(entry) {
                if (!entry.isIntersecting) {
                    return;
                }

                window.acSendTrackingEvent('${eventName}');
                observer.unobserve(entry.target);
            });
        });

        window.acObserveElements('${ac_test_goal_match}', '${flagName}', function(element) {
            window.acSendTrackingEvent('${eventName}_Appear');
            acInViewObserver_${variationServed}_${ac_test_element_name.replace(/[^a-zA-Z0-9_]/g, '_')}.observe(element);
        });
    `;

    return script;
}

module.exports = trackElementInView;
