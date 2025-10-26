function convertToLocalTimestamp(utcIsoString) {
  const date = new Date(utcIsoString);
  // offset in milliseconds (local - UTC)
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return (date.getTime() - offsetMs) / 1000; // seconds
}

export { convertToLocalTimestamp };
