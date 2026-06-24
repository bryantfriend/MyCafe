function getPublicDisplayName(user) {
  if (user && user.nickname) {
    return user.nickname;
  }

  return "Anonymous guest";
}

export { getPublicDisplayName };
