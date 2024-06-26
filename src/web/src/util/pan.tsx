import * as React from "react";
import { mat3, ReadonlyMat3, ReadonlyVec2, vec2 } from "gl-matrix";
import PanClasses from "./pan.module.css";
import "../../styles/index.css"

//> Helpers
function approxEq(a: number, b: number) {
	return Math.abs(a - b) < 5;  // (chosen by a fair dice roll)
}

//> PanAndZoom
export type PanAndZoomProps = Readonly<{
	children?: React.ReactNode,
	virtual_scroll_margin?: number,
	viewport_props?: React.HTMLProps<HTMLDivElement>,
	overflow_props?: React.HTMLProps<HTMLDivElement>,
	container_props?: React.HTMLProps<HTMLDivElement>,
}>;

type PanAndZoomState = Readonly<{}>;

export class PanAndZoom extends React.Component<PanAndZoomProps, PanAndZoomState> {
	//> Fields
	private readonly viewport_ref = React.createRef<HTMLDivElement>();
	private readonly overflow_ref = React.createRef<HTMLDivElement>();
	private readonly container_ref = React.createRef<HTMLDivElement>();

	/**
	 * The position of the center of the "overflow" container.
	 * 
	 * This vector will not be mutated.
	 */
	private xform_center_: ReadonlyVec2 = vec2.create();

	/**
	 * The position at the center of the viewport, taking scroll into account.
	 * 
	 * This vector will not be mutated.
	 */
	private active_center_: ReadonlyVec2 = vec2.create();

	/**
	 * The zoom (scale) coefficient.
	 */
	private zoom_: number = 1;

	//> Constructors
	constructor(props: PanAndZoomProps) {
		super(props);

		this.state = {};
	}

	//> Public Interface
	get virtual_scroll_margin(): number {
		return Math.max(this.props.virtual_scroll_margin || 1500, 5) * this.zoom_;
	}

	get center(): ReadonlyVec2 {
		return this.active_center_;
	}

	set center(vec: ReadonlyVec2) {
		this.active_center_ = vec2.clone(vec);
		this.recenter();
	}

	get zoom(): number {
		return this.zoom_;
	}

	set zoom(value: number) {
		this.zoom_ = value;
		this.recenter();
	}

	computeOverflowToWorldXform(): mat3 {
		const overflow = this.overflow;

		const out = mat3.create();

		// N.B. Matrix multiplication is backwards. Deal with it.

		// Op 3: translate the origin to the xform center
		mat3.translate(out, out, this.xform_center_);

		// Op 2: scale the coordinate space.
		mat3.scale(out, out, [1 / this.zoom_, 1 / this.zoom_]);

		// Op 1: translate the center of the overflow container to the origin.
		mat3.translate(out, out, [
			-overflow.clientWidth / 2,
			-overflow.clientHeight / 2,
		]);

		return out;
	}

	computeViewportToWorldXform(overflow_to_world: ReadonlyMat3 = this.computeOverflowToWorldXform()): mat3 {
		const viewport = this.viewport;
		const overflow = this.overflow;

		const viewport_bb = viewport.getBoundingClientRect();
		const overflow_bb = overflow.getBoundingClientRect();

		const out = mat3.create();

		// Op 2: Apply "overflow to world" xform
		mat3.mul(out, out, overflow_to_world);

		// Op 1: Translate into overflow coordinates
		mat3.translate(out, out, [
			viewport_bb.left - overflow_bb.left,
			viewport_bb.top - overflow_bb.top,
		]);

		return out;
	}

	computeWorldToViewportXform() {
		const view_to_world = this.computeViewportToWorldXform();
		return mat3.invert(view_to_world, view_to_world);
	}

	xformWindowToWorld(pos: ReadonlyVec2) {
		const bb = this.viewport.getBoundingClientRect();
		const target: vec2 = [
			pos[0] - bb.left,
			pos[1] - bb.top,
		];

		return vec2.transformMat3(target, target, this.computeViewportToWorldXform());
	}

	isHelperElement(target: EventTarget) {
		return target === this.viewport ||
			target === this.overflow ||
			target === this.container
	}

	get viewport(): HTMLDivElement {
		return this.viewport_ref.current!;
	}

	get overflow(): HTMLDivElement {
		return this.overflow_ref.current!;
	}

	get container(): HTMLDivElement {
		return this.container_ref.current!;
	}

	//> Internals
	recomputeCenter() {
		const viewport = this.viewport;
		const out = vec2.create();

		// Get the offset of the `target` from the actual scroll position
		// (this corresponds to delta center scaled by the zoom scaling factor)
		const scroll_target = this.virtual_scroll_margin;
		out[0] = viewport.scrollLeft - scroll_target;
		out[1] = viewport.scrollTop - scroll_target;

		// Account for zoom
		// (this is now the offset of actual centers)
		vec2.scale(out, out, 1 / this.zoom_);

		// Now, return the center plus this delta
		vec2.add(out, this.xform_center_, out);

		// Write it!
		this.active_center_ = out;
	}

	private computeViewportTransformStr() {
		return `scale(${this.zoom_}) translate(${-this.xform_center_[0]}px, ${-this.xform_center_[1]}px) translate(50%, 50%)`;
	}

	private computeOverflowStyles(): React.CSSProperties {
		const vs_margin = this.virtual_scroll_margin;

		return {
			width: `calc(100% + ${2 * vs_margin}px)`,
			height: `calc(100% + ${2 * vs_margin}px)`,
		};
	}

	recenter() {
		// Move the transform center to the previously computed active center.
		this.xform_center_ = this.active_center_;

		// Update the container style immediately to avoid going through React re-rendering, which
		// could introduce delays because of async reconciliation. This is just a heuristic and should
		// not be relied upon for correctness (hence the `forceUpdate`—manual re-rendering is not
		// really a good thing to rely upon)
		this.container.style.transform = this.computeViewportTransformStr();
		Object.assign(this.overflow.style, this.computeOverflowStyles());

		// Register this component for a complete re-rendering.
		this.forceUpdate();

		// Now, we just reset the actual scroll bar position.
		this.moveBarsToCenter();
	}

	private moveBarsToCenter() {
		const scroll_target = this.virtual_scroll_margin;
		this.viewport.scrollTo(scroll_target, scroll_target);
	}

	//> Lifecycle
	override componentDidMount() {
		this.moveBarsToCenter();
	}

	override render() {
		const { viewport_props, overflow_props, container_props, children } = this.props;

		const overflow_styles = this.computeOverflowStyles();
		const container_styles: React.CSSProperties = {
			transform: this.computeViewportTransformStr(),
		};

		let viewportClassName = `${PanClasses["viewport"]} ${PanClasses["hide-scrollbars"]}`;
		if (viewport_props !== undefined && viewport_props.className !== undefined) {
			viewportClassName += ` ${viewport_props.className}`;
		}

		return <div
			// viewport
			{...viewport_props}
			ref={this.viewport_ref}
			className={viewportClassName}
			onScroll={() => {
				const viewport = this.viewport;

				// Update visible center cache
				this.recomputeCenter();

				// Recenter the scroll bars if necessary
				const should_reset_scroll =
					// TODO: Check portability of implementation
					approxEq(viewport.scrollLeft, 0) ||
					approxEq(viewport.scrollWidth - viewport.scrollLeft, viewport.clientWidth) ||
					approxEq(viewport.scrollTop, 0) ||
					approxEq(viewport.scrollHeight - viewport.scrollTop, viewport.clientHeight);

				if (should_reset_scroll) {
					this.recenter();
				}
			}}
		>
			<div
				// overflow
				{...overflow_props}
				ref={this.overflow_ref}
				className={PanClasses["overflow"]}
				style={overflow_styles}
			>
				<div
					// container
					{...container_props}
					ref={this.container_ref}
					className={PanClasses["container"]}
					style={container_styles}
				>
					{children}
				</div>
			</div>
		</div>;
	}
}
