function redirectToLogin(nextPath) {
  window.location.href = "/login.html?next=" + encodeURIComponent(nextPath || window.location.pathname);
}

export { redirectToLogin };
