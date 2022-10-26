let STRICT_ASSERT_MODE = false;

export function error(...data: any[]) {
	console.error(...data);
	debugger;
}

export function assert(cond: boolean, ...data: any[]): boolean {
	if (!cond) {
		if (STRICT_ASSERT_MODE) {
			throw new Error(`Assertion failed: ${data.join(" ")}`);
		} else {
			error("Assertion failed:", ...data);
		}
	}

	return !cond;
}

export function todo(): never {
	throw "not implemented";
}

export function unreachable(): never {
	throw "unreachable code reached";
}

export function setStrictAssertsEnabled(is_enabled: boolean) {
	STRICT_ASSERT_MODE = is_enabled;
}

export function areStrictAssertsEnabled() {
	return STRICT_ASSERT_MODE;
}
