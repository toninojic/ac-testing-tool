function trackClicksOnElements(trackingGoal, testData, variationServed) {
    const { analitycsID } = testData;
    const { ac_test_goal, ac_test_goal_match, ac_test_element_name } = trackingGoal;

    if (ac_test_goal !== 'css_selector' || ac_test_goal_match === '') {
        return '';

    }


    const script = `
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('${ac_test_goal_match}').forEach(element => {
                element.addEventListener('click', function(e) {
                    e.preventDefault();
                    gtag('event', 'AB_${variationServed}_${ac_test_element_name}', {
                        'send_to': '${analitycsID}'
                    });
                });
            });
        });
    `;


    return script;
}

module.exports = trackClicksOnElements;
