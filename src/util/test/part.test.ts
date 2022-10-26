import { describe, test, expect } from "@jest/globals";
import { assert, Bindable, Part, setStrictAssertsEnabled } from "../src";

setStrictAssertsEnabled(true);

describe("part semantics", () => {
	test("bindable equality is reflexive", () => {
		class Example extends Bindable {
			readonly me: Example;

			constructor() {
				super();
				this.me = this;
			}

			runTest(outer: Example) {
				assert(this === outer);
				assert(this === this.me);
				assert(this.me === outer);
			}

			get test_as_prop() {
				assert(this === this.me);
				return this;  // We gotta return something...
			}

			set test_as_prop(outer: Example) {
				assert(this === outer);
				assert(this === this.me);
				assert(this.me === outer);
			}
		}

		const example = new Example();
		example.runTest(example);
		example.test_as_prop = example;

		const example2 = example.test_as_prop;
		example.runTest(example2);
		example2.runTest(example);
	});

	test("part self-parenting is illegal", () => {
		expect(() => {
			const a = new Part(null);
			a.parent = a;
		}).toThrow();
	});

	test("cyclic part parent chains are illegal", () => {
		const a = new Part(null);
		const b = new Part(a);
		const c = new Part(b);

		// This is legal.
		c.parent = b;
		a.parent = null;
		c.parent = a;
		b.parent = c;

		// This is illegal
		expect(() => {
			a.parent = b;
		}).toThrow();
	});

	test("child sets are correct", () => {
		const a = new Part(null);
		const b = new Part(a);
		const c = new Part(b);
		const d = new Part(a);

		expect([...a.children]).toEqual(expect.arrayContaining([b, d]));
		expect([...b.children]).toEqual(expect.arrayContaining([c]));
		expect([...c.children]).toEqual([]);

		d.parent = c;
		expect([...c.children]).toEqual([d]);
		expect([...a.children]).toEqual(expect.arrayContaining([b]));
	});
});
