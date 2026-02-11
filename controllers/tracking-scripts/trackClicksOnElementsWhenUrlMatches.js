function trackClicksOnElementsWhenUrlMatches(trackingGoal, _testData, variationServed) {
    const { ac_test_goal_match, ac_test_url_match_click, ac_test_element_name } = trackingGoal;

    if (ac_test_url_match_click === '' || ac_test_goal_match === '') {
        return '';
    }

    const eventName = `AB_${variationServed}_${ac_test_element_name}`;
    const flagName = `data-ac-bound-url-click-${variationServed}-${ac_test_element_name}`;

    const script = `
        if (window.location.href === '${ac_test_url_match_click}') {
            window.acObserveElements('${ac_test_goal_match}', '${flagName}', function(element) {
                window.acSendTrackingEvent('${eventName}_Appear');

                element.addEventListener('click', function() {
                    window.acSendTrackingEvent('${eventName}');
                });
            });
        }
    `;

    return script;
}

module.exports = trackClicksOnElementsWhenUrlMatches;
