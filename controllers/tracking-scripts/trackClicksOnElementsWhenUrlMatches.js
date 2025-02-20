function trackClicksOnElementsWhenUrlMatches(trackingGoal, testData, variationServed) {
    const { analitycsID } = testData;
    const { ac_test_goal_match, ac_test_url_match_click, ac_test_element_name } = trackingGoal;

    if (ac_test_url_match_click === '' || ac_test_goal_match === '') {
        return '';
    }


    const script = `
        document.addEventListener('DOMContentLoaded', () => {
        if (window.location.href === '${ac_test_url_match_click}') {
            document.querySelectorAll('${ac_test_goal_match}').forEach(element => {
            element.addEventListener('click', () => {
                gtag('event', 'AB_${variationServed}_${ac_test_element_name}', {
                'send_to': '${analitycsID}'
                });
            });
            });
        }
        });
    `;

    return script;
}

module.exports = trackClicksOnElementsWhenUrlMatches;
