function trackClicksOnElements(trackingGoal, _testData, variationServed) {
    const { ac_test_goal, ac_test_goal_match, ac_test_element_name } = trackingGoal;

    if (ac_test_goal !== 'css_selector' || ac_test_goal_match === '') {
        return '';
    }

    const eventName = `AB_${variationServed}_${ac_test_element_name}`;
    const flagName = `data-ac-bound-click-${variationServed}-${ac_test_element_name}`;

    const script = `
        window.acObserveElements('${ac_test_goal_match}', '${flagName}', function(element) {
            window.acSendTrackingEvent('${eventName}_Appear');

            element.addEventListener('click', function() {
                window.acSendTrackingEvent('${eventName}');
            });
        });
    `;

    return script;
}

module.exports = trackClicksOnElements;
