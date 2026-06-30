import { SC_PACKAGES, type PackageId } from './pricing';

const packageMap = new Map(SC_PACKAGES.map((p) => [p.id, p]));

export function getPackage(packageId: string) {
    return packageMap.get(packageId as PackageId) ?? null;
}

export function generateMockPiId(): string {
    return `pi_mock_${crypto.randomUUID()}`;
}

export function getPackages() {
    return SC_PACKAGES.map(({ id, name, sc, usd }) => ({ id, name, sc, usd }));
}

export function isValidPackage(packageId: string): packageId is PackageId {
    return packageMap.has(packageId as PackageId);
}
