export const assetRegistry: Record<string, string> = {};

function discoverAssets(): Record<string, string> {
  const modules = import.meta.glob('./themes/**/*.png', {
    eager: true,
    query: '?url',
    import: 'default',
  }) as Record<string, string>;

  const map: Record<string, string> = {};
  for (const [absPath, url] of Object.entries(modules)) {
    const relative = absPath.replace('./themes/', 'themes/');
    map[relative] = url;
  }
  return map;
}

const registry = discoverAssets();
Object.assign(assetRegistry, registry);
