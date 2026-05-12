const VAR_REGEX = /\{(\w+)\}/g;

export function renderTemplate(
  template: string,
  vars: Record<string, string | null | undefined>,
): string {
  return template.replace(VAR_REGEX, (match, key: string) => {
    const value = vars[key];
    if (value === undefined || value === null) return match;
    return value;
  });
}

export function extractVariables(template: string): string[] {
  const keys: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(VAR_REGEX.source, 'g');
  while ((m = re.exec(template)) !== null) {
    const key = m[1];
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}
