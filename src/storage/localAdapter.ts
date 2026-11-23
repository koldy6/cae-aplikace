import type { StorageLike } from './memoryAdapter';

/**
 * window.localStorage adapter. Accessing localStorage can itself throw (private mode,
 * blocked cookies), so it is resolved lazily and errors propagate to the store,
 * which switches to in-memory mode.
 */
export class LocalAdapter implements StorageLike {
  private get ls(): Storage {
    return globalThis.localStorage;
  }
  getItem(key: string): string | null {
    return this.ls.getItem(key);
  }
  setItem(key: string, value: string): void {
    this.ls.setItem(key, value);
  }
  removeItem(key: string): void {
    this.ls.removeItem(key);
  }
}
