import * as React from "react";
import { ReadonlyMat3, ReadonlyVec2, vec2 } from "gl-matrix";
import PanClasses from "./pan.module.css";

//> Helpers
function rectToVec(rect: DOMRect): vec2 {
    return [rect.width, rect.height];
}

function approxEq(a: number, b: number) {
    return Math.abs(a - b) < 5;
}

//> PanAndZoom
export type PanAndZoomProps = Readonly<{
    children?: React.ReactNode,
    virtual_scroll_margin?: number,
    viewport_props?: React.HTMLProps<HTMLDivElement>,
}>;

type PanAndZoomState = Readonly<{}>;

export class PanAndZoom extends React.Component<PanAndZoomProps, PanAndZoomState> {
    //> Fields
    private readonly viewport = React.createRef<HTMLDivElement>();
    private readonly overflow = React.createRef<HTMLDivElement>();
    private readonly container = React.createRef<HTMLDivElement>();

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
        this.center = vec2.clone(vec);
        this.recenter();
    }

    get zoom(): number {
        return this.zoom_;
    }

    set zoom(value: number) {
        this.zoom_ = value;
        this.recenter();
    }

    //> Internals
    private computeActiveCenter(out: vec2 = vec2.create()) {
        const viewport = this.viewport.current!;

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

        return out;
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
        this.container.current!.style.transform = this.computeViewportTransformStr();
        Object.assign(this.overflow.current!.style, this.computeOverflowStyles());

        // Register this component for a complete re-rendering.
        this.forceUpdate();

        // Now, we just reset the actual scroll bar position.
        this.moveBarsToCenter();
    }

    private moveBarsToCenter() {
        const scroll_target = this.virtual_scroll_margin;
        this.viewport.current!.scrollTo(scroll_target, scroll_target);
    }

    //> Lifecycle
    override componentDidMount() {
        this.moveBarsToCenter();
    }

    override render() {
        const overflow_styles = this.computeOverflowStyles();
        const container_styles: React.CSSProperties = {
            transform: this.computeViewportTransformStr(),
        };

        return <div
            ref={this.viewport}
            className={`${PanClasses["viewport"]} ${PanClasses["hide-scrollbars"]}`}
            onScroll={() => {
                const viewport = this.viewport.current!;

                // Update visible center cache
                this.active_center_ = this.computeActiveCenter();

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
            {...this.props.viewport_props}
        >
            <div ref={this.overflow} className={PanClasses["overflow"]} style={overflow_styles}>
                <div ref={this.container} className={PanClasses["container"]} style={container_styles}>
                    {this.props.children}
                </div>
            </div>
        </div>;
    }
}
