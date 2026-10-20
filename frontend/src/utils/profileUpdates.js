export const notifyProfileUpdated = () => {
  window.dispatchEvent(new Event("profile-updated"));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("portfolio-profile");
    channel.postMessage("updated");
    channel.close();
  }
};

export const subscribeProfileUpdates = refresh => {
  window.addEventListener("profile-updated", refresh);
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("portfolio-profile") : null;
  if (channel) channel.onmessage = refresh;
  return () => { window.removeEventListener("profile-updated", refresh); channel?.close(); };
};
