export function validateJSON(jsonString) {
  const errors = [];

  if (/,(\s*[}\]])/.test(jsonString)) {
    errors.push("Trailing comma after the last field");
  }

  if (/{\s*[^"']\w*\s*:/.test(jsonString)) {
    errors.push("Key not enclosed in double quotes");
  }

  return errors.length ? errors : null;

}