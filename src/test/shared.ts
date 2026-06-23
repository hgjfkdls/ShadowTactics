let passed = 0;
let failed = 0;

export function assert(condition: boolean, label: string) {
    if (condition) {
        console.log(`  PASS: ${label}`);
        passed++;
    } else {
        console.log(`  FAIL: ${label}`);
        failed++;
    }
}

export function assertEqual<T>(actual: T, expected: T, label: string) {
    if (actual === expected) {
        console.log(`  PASS: ${label}`);
        passed++;
    } else {
        console.log(`  FAIL: ${label} — expected ${expected}, got ${actual}`);
        failed++;
    }
}

export function assertThrows(fn: () => any, label: string) {
    try {
        fn();
        console.log(`  FAIL: ${label} (no error thrown)`);
        failed++;
    } catch {
        console.log(`  PASS: ${label}`);
        passed++;
    }
}

export function getPassed() { return passed; }
export function getFailed() { return failed; }
