// ICF/Intents/intents.js

import intentRegistry from "../Engine/intentRegistry.js";

import demoIntentModule from "./DemoIntent.js";

/**
 * Registers all project Intents.
 *
 * Add new Intent registrations here as the project grows.
 *
 * @returns {Object} Registration result.
 */
function registerProjectIntents() {
  return intentRegistry.registerIntents({
    DemoIntent: demoIntentModule.createDemoIntent
  });
}

export default {
  registerProjectIntents: registerProjectIntents
};