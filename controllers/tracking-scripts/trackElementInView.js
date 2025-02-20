function trackElementInView(trackingGoal, testData, variationServed) {
    const { ac_test_goal, ac_test_goal_match, ac_test_element_name } = trackingGoal;
    const { analitycsID } = testData;

    if (ac_test_goal !== 'css_selector' || ac_test_goal_match === '') {
        return '';
    }



  const script = `
        let scrollEventSent = false;

        function isInViewport(element) {
            const elementTop = element.offsetTop;
            const elementBottom = elementTop + element.offsetHeight;
            const viewportTop = window.pageYOffset;
            const viewportBottom = viewportTop + window.innerHeight;
            return elementBottom > viewportTop && elementTop < viewportBottom;
        }

        window.addEventListener('resize', function() {
            if (!scrollEventSent && isInViewport(document.querySelector('${ac_test_goal_match}'))) {
                gtag('event', 'AB_${variationServed}_${ac_test_element_name}', {
                    'send_to': '${analitycsID}'
                });
                scrollEventSent = true;
            }
        });

        window.addEventListener('scroll', function() {
            if (!scrollEventSent && isInViewport(document.querySelector('${ac_test_goal_match}'))) {
                gtag('event', 'AB_${variationServed}_${ac_test_element_name}', {
                    'send_to': '${analitycsID}'
                });
                scrollEventSent = true;
            }
        });
    `;

  return script;
}

module.exports = trackElementInView;
