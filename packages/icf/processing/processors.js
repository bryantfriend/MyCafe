function createProcessResult(message, data) {
  return {
    message: message,
    data: data || {}
  };
}

export { createProcessResult };
