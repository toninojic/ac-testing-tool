function trackFormSubmissions(trackingGoal, testData, variationServed) {
    const { analitycsID } = testData;
    const { ac_test_goal, ac_test_goal_match, ac_test_element_name } = trackingGoal;

    if (ac_test_goal !== 'css_selector' || ac_test_goal_match === '') {
        return '';
    }



    const script = `
        document.addEventListener('DOMContentLoaded', () => {
            const interval = setInterval(() => {
            const submittedMessage = document.querySelector('${ac_test_goal_match}');
            if (submittedMessage) {
                clearInterval(interval);
                gtag('event', 'AB_${variationServed}_${ac_test_element_name}', {
                'send_to': '${analitycsID}'
                });
            }
            }, 1000);
        });
        `;

    return script;
}

module.exports = trackFormSubmissions;
