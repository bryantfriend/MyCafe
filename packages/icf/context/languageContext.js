function addLanguageContext(payload) {
  const contextPayload = Object.assign({}, payload || {});
  const context = Object.assign({}, contextPayload.context || {});
  context.selectedLanguage = contextPayload.language || "ru";
  contextPayload.context = context;
  return contextPayload;
}

export { addLanguageContext };
