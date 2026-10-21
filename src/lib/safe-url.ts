/** Returns the URL only if it is a valid https:// link; otherwise an empty string. */
export function httpsUrlOrEmpty(value: string): string {
  try {
    return new URL(value).protocol === "https:" ? value : "";
  } catch {
    return "";
  }
}
