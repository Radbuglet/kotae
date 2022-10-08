import * as React from "react";
import { ReadonlyVec2, vec2 } from "gl-matrix";
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

    private xform_center_ = vec2.create();
    private visible_center_ = vec2.create();
    private zoom_: number = 1;

    //> Constructors
    constructor(props: PanAndZoomProps) {
        super(props);

        this.state = {};
    }

    //> Public Interface
    get virtual_scroll_margin(): number {
        return Math.max(this.props.virtual_scroll_margin || 1500, 5);
    }

    get center(): ReadonlyVec2 {
        return this.visible_center_;
    }

    set center(vec: ReadonlyVec2) {
        vec2.copy(this.visible_center_, vec);
        this.recenterScrollBars();
    }

    get zoom(): number {
        return this.zoom_;
    }

    set zoom(value: number) {
        this.zoom_ = value;
        this.recenterScrollBars();
    }

    //> Internals
    private computeScrollCenter(out: vec2 = vec2.create()) {
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

    recenterScrollBars() {
        vec2.copy(this.xform_center_, this.visible_center_);

        // We update this immediately to avoid going through React re-rendering, which would
        // introduce a 1 frame delay.
        this.container.current!.style.transform = this.computeViewportTransformStr();

        // Now, we just reset the actual scroll bar position.
        this.centerScrollBarsPassive();
    }

    private centerScrollBarsPassive() {
        const scroll_target = this.virtual_scroll_margin;
        this.viewport.current!.scrollTo(scroll_target, scroll_target);
    }

    //> Lifecycle
    override componentDidMount() {
        this.centerScrollBarsPassive();
    }

    override render() {
        const vs_margin = this.virtual_scroll_margin;
        const overflow_styles: React.CSSProperties = {
            width: `calc(100% + ${2 * vs_margin}px)`,
            height: `calc(100% + ${2 * vs_margin}px)`,
        };

        const container_styles: React.CSSProperties = {
            transform: this.computeViewportTransformStr(),
        };

        return <div
            ref={this.viewport}
            className={`${PanClasses["viewport"]} ${PanClasses["hide-scrollbars"]}`}
            onScroll={() => {
                const viewport = this.viewport.current!;

                // Update visible center cache
                this.computeScrollCenter(this.visible_center_);

                // Recenter the scroll bars if necessary
                const should_reset_scroll =
                    // TODO: Check portability of implementation
                    approxEq(viewport.scrollLeft, 0) ||
                    approxEq(viewport.scrollWidth - viewport.scrollLeft, viewport.clientWidth) ||
                    approxEq(viewport.scrollTop, 0) ||
                    approxEq(viewport.scrollHeight - viewport.scrollTop, viewport.clientHeight);

                if (should_reset_scroll) {
                    this.recenterScrollBars();
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
