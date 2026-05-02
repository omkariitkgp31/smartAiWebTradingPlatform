// ===== FAKE GBM WEBSOCKET SIMULATOR =====
// Replaces real WebSocket with a frontend-only GBM price generator.
// Emits TRADE_PRINT events at 500ms intervals for all subscribed symbols.
import { generateLiveTrade } from './dummyData';

const TICK_INTERVAL_MS = 500;

const activeSubscriptions = new Set<string>();
const listeners = new Set<(msg: any) => void>();
let tickTimer: ReturnType<typeof setInterval> | null = null;

function notifyListeners(msg: any) {
    listeners.forEach(fn => {
        try { fn(msg); } catch (_) { }
    });
}

function startTicker() {
    if (tickTimer) return;
    tickTimer = setInterval(() => {
        activeSubscriptions.forEach(symbol => {
            notifyListeners(generateLiveTrade(symbol));
        });
    }, TICK_INTERVAL_MS);
}

function stopTicker() {
    if (tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
    }
}

export function connect() {
    startTicker();
}

export function disconnect() {
    stopTicker();
}

export function subscribe(symbol = '') {
    if (symbol) activeSubscriptions.add(symbol);
    startTicker();
}

export function unsubscribe(symbol = '') {
    activeSubscriptions.delete(symbol);
    if (activeSubscriptions.size === 0) stopTicker();
}

export function onMessage(handler: (msg: any) => void) {
    listeners.add(handler);
    return () => listeners.delete(handler);
}

export function sendLimitOrder(_order: any): boolean {
    return true;
}

export function sendCancelOrder(_clientOrderId: string): boolean {
    return true;
}
