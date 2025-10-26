import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import { TextDecoder, TextEncoder } from "node:util";

if (!("TextEncoder" in globalThis)) {
	(globalThis as any).TextEncoder = TextEncoder;
}

if (!("TextDecoder" in globalThis)) {
	(globalThis as any).TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}

if (!("__vite_ssr_exports__" in globalThis)) {
	(globalThis as any).__vite_ssr_exports__ = {};
}

if (typeof (globalThis as any).__vite_ssr_exportName__ !== "function") {
	(globalThis as any).__vite_ssr_exportName__ = (targetOrName: any, nameOrGetter?: any, maybeGetter?: any) => {
		if (typeof targetOrName === "object" && typeof nameOrGetter === "string" && typeof maybeGetter === "function") {
			Object.defineProperty(targetOrName, nameOrGetter, {
				configurable: true,
				enumerable: true,
				get: maybeGetter,
			});
			return;
		}

		if (typeof targetOrName === "string" && typeof nameOrGetter === "function") {
			const exportsObj = (globalThis as any).__vite_ssr_exports__;
			Object.defineProperty(exportsObj, targetOrName, {
				configurable: true,
				enumerable: true,
				get: nameOrGetter,
			});
		}
	};
}

class MockResizeObserver {
	private callback: ResizeObserverCallback;

	constructor(callback: ResizeObserverCallback) {
		this.callback = callback;
	}

	observe(target: Element) {
		const width = (target as HTMLElement).clientWidth || 1280;
		const height = (target as HTMLElement).clientHeight || 720;
		this.callback([{ contentRect: { width, height } } as ResizeObserverEntry], this as unknown as ResizeObserver);
	}

	unobserve() {
		//
	}

	disconnect() {
		//
	}
}

Object.defineProperty(globalThis, "ResizeObserver", {
	writable: true,
	value: MockResizeObserver,
});

if (!HTMLElement.prototype.scrollTo) {
	HTMLElement.prototype.scrollTo = function scrollTo() {
		//
	};
}

if (!("scrollTo" in window)) {
	// @ts-expect-error - define stub
	window.scrollTo = () => {};
}

Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
	value() {
		return {
			x: 0,
			y: 0,
			top: 0,
			left: 0,
			bottom: (this as HTMLElement).clientHeight || 720,
			right: (this as HTMLElement).clientWidth || 1280,
			width: (this as HTMLElement).clientWidth || 1280,
			height: (this as HTMLElement).clientHeight || 720,
			toJSON() {
				return this;
			},
		};
	},
});

vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
	return setTimeout(() => cb(performance.now()), 16) as unknown as number;
});

vi.spyOn(window, "cancelAnimationFrame").mockImplementation((handle: number) => {
	clearTimeout(handle);
});
