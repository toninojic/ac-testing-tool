const defaultTrackingScript = require('./tracking-scripts/defaultTrackingScript');
const trackClicksOnElements = require('./tracking-scripts/trackClicksOnElements');
const trackElementInView = require('./tracking-scripts/trackElementInView');
const trackClicksOnElementsWhenUrlMatches = require('./tracking-scripts/trackClicksOnElementsWhenUrlMatches');
const trackFormSubmissions = require('./tracking-scripts/trackFormSubmissions');
const trackElementLink = require('./tracking-scripts/trackElementLink');

const SUPPORTED_TRACKING_SCRIPT_TYPES = ['gtag', 'dataLayer'];

const trackingScriptsHandler = (trackingGoals, currentVariation, testData = {}) => {
    const variationServed = parseInt(currentVariation, 10) === 0 ? 'C' : `V${parseInt(currentVariation, 10)}`;

    const normalizedTrackingScriptType = SUPPORTED_TRACKING_SCRIPT_TYPES.includes(testData.trackingScriptType)
        ? testData.trackingScriptType
        : 'gtag';

    const trackingConfig = {
        ...testData,
        trackingScriptType: normalizedTrackingScriptType
    };

    let concatenatedScripts = defaultTrackingScript(trackingConfig, variationServed);

    for (const goal of trackingGoals || []) {
        switch (goal.ac_test_goal_type) {
        case 'track_element_click':
            concatenatedScripts += trackClicksOnElements(goal, trackingConfig, variationServed);
            break;
        case 'track_element_in_view':
            concatenatedScripts += trackElementInView(goal, trackingConfig, variationServed);
            break;
        case 'track_form_submits':
            concatenatedScripts += trackFormSubmissions(goal, trackingConfig, variationServed);
            break;
        case 'track_element_clicks_url_matches':
            concatenatedScripts += trackClicksOnElementsWhenUrlMatches(goal, trackingConfig, variationServed);
            break;
        case 'track_element_link':
            concatenatedScripts += trackElementLink(goal, trackingConfig, variationServed);
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
