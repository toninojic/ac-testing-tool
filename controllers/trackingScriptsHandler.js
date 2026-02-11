const defaultTrackingScript = require('./tracking-scripts/defaultTrackingScript');
const trackClicksOnElements = require('./tracking-scripts/trackClicksOnElements');
const trackElementInView = require('./tracking-scripts/trackElementInView');
const trackClicksOnElementsWhenUrlMatches = require('./tracking-scripts/trackClicksOnElementsWhenUrlMatches');
const trackFormSubmissions = require('./tracking-scripts/trackFormSubmissions');
const trackElementLink = require('./tracking-scripts/trackElementLink');

const trackingScriptsHandler = (trackingGoals, currentVariation, testData) => {
    let concatenatedScripts = defaultTrackingScript(testData, parseInt(currentVariation) === 0 ? 'C' : `V${parseInt(currentVariation)}`);
    let variationServed = parseInt(currentVariation) === 0 ? 'C' : `V${parseInt(currentVariation)}`;

    for (const goal of trackingGoals) {
        switch (goal.ac_test_goal_type) {
        case 'track_element_click':
            concatenatedScripts += trackClicksOnElements(goal, testData, variationServed);
            break;
        case 'track_element_in_view':
            concatenatedScripts += trackElementInView(goal, testData, variationServed);
            break;
        case 'track_form_submits':
            concatenatedScripts += trackFormSubmissions(goal, testData, variationServed);
            break;
        case 'track_element_clicks_url_matches':
            concatenatedScripts += trackClicksOnElementsWhenUrlMatches(goal, testData, variationServed);
            break;
        case 'track_element_link':
            concatenatedScripts += trackElementLink(goal, testData, variationServed);
            break;
        default:
            console.error('Unknown tracking goal type:', goal.ac_test_goal_type);
    }
  }

    return concatenatedScripts;
};

module.exports = {
    trackingScriptsHandler
};
