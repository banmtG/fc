// sortUtils.js
export function sortRows(data, idKey, key, dir) {
  return [...data].sort((a, b) => {
      const ax = a[key] == null ? "" : a[key];
      const bx = b[key] == null ? "" : b[key];
      if (ax === bx) return 0;
      return dir === "asc" ? (ax > bx ? 1 : -1) : (ax < bx ? 1 : -1);
    })
    .map(o => String(o[idKey]));
}

export function sortRowsFullObject(data, key, dir) {
  return [...data].sort((a, b) => {
    const ax = a[key] == null ? "" : a[key];
    const bx = b[key] == null ? "" : b[key];
    if (ax === bx) return 0;
    return dir === "asc" ? (ax > bx ? 1 : -1) : (ax < bx ? 1 : -1);
  });
}
