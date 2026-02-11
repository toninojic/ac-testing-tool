function trackElementLink(trackingGoal, _testData, variationServed) {
    const { ac_test_goal, ac_test_goal_match, ac_test_element_name } = trackingGoal;

    if (ac_test_goal === 'css_selector' || ac_test_goal_match === '') {
        return '';
    }

    let querySelector = '';

    switch (ac_test_goal) {
    case 'url_matches':
        querySelector = `a[href="${ac_test_goal_match}"]`;
        break;
    case 'url_contains':
        querySelector = `a[href*="${ac_test_goal_match}"]`;
        break;
    case 'url_start_with':
        querySelector = `a[href^="${ac_test_goal_match}"]`;
        break;
    default:
        break;
    }

    if (querySelector === '') {
        return '';
    }

    const eventName = `AB_${variationServed}_${ac_test_element_name}`;
    const flagName = `data-ac-bound-link-${variationServed}-${ac_test_element_name}`;

    const script = `
        window.acObserveElements('${querySelector}', '${flagName}', function(link) {
            window.acSendTrackingEvent('${eventName}_Appear');

            link.addEventListener('click', function() {
                window.acSendTrackingEvent('${eventName}');
            });
        });
    `;

    return script;
}

module.exports = trackElementLink;
