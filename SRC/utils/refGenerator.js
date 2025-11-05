export function generateBookingRef() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `NB-${y}${m}${d}-${rnd}`;
}