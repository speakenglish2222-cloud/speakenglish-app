export function getDeviceId(): string {
  if (typeof window === "undefined") return "";

  const key = "speakenglish_device_id";
  let deviceId = localStorage.getItem(key);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(key, deviceId);
  }

  return deviceId;
}
