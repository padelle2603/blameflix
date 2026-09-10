// Minimal browser-global shims for Node-based unit tests.
class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  key(i) {
    return [...this.store.keys()][i] ?? null;
  }
  get length() {
    return this.store.size;
  }
}

globalThis.localStorage = new MemoryStorage();
Object.defineProperty(globalThis, "navigator", { value: { language: "en" }, configurable: true });
Object.defineProperty(globalThis, "crypto", {
  value: {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) arr[i] = (Math.random() * 256) | 0;
      return arr;
    },
  },
  configurable: true,
});