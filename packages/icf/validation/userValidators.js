function validateUserNickname(value) {
  return String(value || "").trim().length > 0;
}

export { validateUserNickname };
