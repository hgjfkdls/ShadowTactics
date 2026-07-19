export function yieldEventLoop(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}
