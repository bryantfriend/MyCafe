// ICF/Stages/Processors/domain/demo/setDemoResult.js

/**
 * Marks the demo intent as successfully processed.
 *
 * @param {Object} intent - Current intent.
 * @returns {Object} Updated intent.
 */
function setDemoResult(intent) {
  intent.result = {
    demoProcessed: true
  };

  return intent;
}

export default setDemoResult;