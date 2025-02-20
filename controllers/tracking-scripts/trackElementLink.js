function trackElementLink(trackingGoal, testData, variationServed) {
    const { analitycsID } = testData;
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

    const script = `
        document.addEventListener('DOMContentLoaded', () => {
        const links = document.querySelectorAll('${querySelector}');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
            gtag('event', 'AB_${variationServed}_${ac_test_element_name}', {
                'send_to': '${analitycsID}'
            });
            });
        });
        });
    `;

    return script;
}

module.exports = trackElementLink;
