function getTrimmedInputValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

export { getTrimmedInputValue };
