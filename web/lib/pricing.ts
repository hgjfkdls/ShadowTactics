export function effectivePrice(price: number, discountPercent: number, discountEndsAt: Date | null): number {
    if (discountPercent > 0 && discountEndsAt && new Date() < discountEndsAt) {
        return Math.round(price * (1 - discountPercent / 100));
    }
    return price;
}

export function computeCoins(
    isWinner: boolean,
    streak: number,
    isRanked: boolean,
    firstOfDay: boolean,
    score: number
): number {
    let base = 10;
    if (isWinner) base += 5;
    if (streak >= 3) base += 3;
    if (isRanked) base += 2;
    if (firstOfDay) base += 5;

    const mult = 0.5 + Math.max(0, Math.min(100, score)) / 100;
    return Math.round(base * mult);
}
