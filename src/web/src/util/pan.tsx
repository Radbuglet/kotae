import * as React from "react";
import { ReadonlyVec2, vec2 } from "gl-matrix";
import PanClasses from "./pan.module.css";

function rectToVec(rect: DOMRect): vec2 {
    return [rect.width, rect.height];
}

function approxEq(a: number, b: number) {
    return Math.abs(a - b) < 5;
}

export type PanAndZoomProps = Readonly<{
    children?: React.ReactNode,
    virtual_scroll_margin?: number,
    viewport_props?: React.HTMLProps<HTMLDivElement>,
}>;

type PanAndZoomState = Readonly<{
    center: ReadonlyVec2,
}>;

export class PanAndZoom extends React.Component<PanAndZoomProps, PanAndZoomState> {
    //> Fields
    private readonly viewport = React.createRef<HTMLDivElement>();
    private readonly overflow = React.createRef<HTMLDivElement>();
    private readonly container = React.createRef<HTMLDivElement>();

    //> Constructors

    constructor(props: PanAndZoomProps) {
        super(props);

        this.state = {
            center: vec2.create(),
        };
    }

    //> Public Interface
    get virtual_scroll_margin(): number {
        return Math.max(this.props.virtual_scroll_margin || 1500, 100);
    }

    recenterScrollBars() {
        this.recenterScrollBarsInner(/* is_forced */ true, /* skip_state_update */ false);
    }

    //> Internals
    private getViewportTransformFor(center: ReadonlyVec2) {
        return `scale(1.0) translate(${center[0]}px, ${center[1]}px) translate(50%, 50%)`;
    }

    private recenterScrollBarsInner(is_forced: boolean, skip_state_update: boolean) {
        const viewport = this.viewport.current!;
        const overflow = this.overflow.current!;

        // Compute scroll difference
        const viewport_rect = rectToVec(viewport.getBoundingClientRect());
        const overflow_rect = rectToVec(overflow.getBoundingClientRect());

        const padding = vec2.sub(vec2.create(), overflow_rect, viewport_rect);
        const target = vec2.scale(vec2.create(), padding, 1 / 2);
        vec2.floor(target, target);

        const delta: vec2 = [
            target[0] - viewport.scrollLeft,
            target[1] - viewport.scrollTop,
        ];

        // Check if we need to reset scroll
        const should_reset_scroll = is_forced ||
            approxEq(viewport.scrollLeft, 0) ||
            approxEq(viewport.scrollWidth - viewport.scrollLeft, viewport.clientWidth) ||
            approxEq(viewport.scrollTop, 0) ||
            approxEq(viewport.scrollHeight - viewport.scrollTop, viewport.clientHeight);

        // Reset scroll
        if (should_reset_scroll) {
            // Update state unless requested otherwise
            if (!skip_state_update) {
                const center = vec2.add(vec2.create(), this.state.center, delta);

                this.setState({
                    center,
                });

                // We update this immediately to avoid a 1 frame delay in React state hydration.
                // (this also future-proofs this code against concurrent React)
                this.container.current!.style.transform = this.getViewportTransformFor(center);
            }

            // Recenter viewport
            viewport.scrollTo(target[0], target[1]);
        }
    }

    //> Lifecycle
    override componentDidMount() {
        this.recenterScrollBarsInner(/* is_forced */ true, /* skip_state_update */ true);
    }

    override render() {
        const vs_margin = this.virtual_scroll_margin;
        const overflow_styles: React.CSSProperties = {
            width: `calc(100% + ${2 * vs_margin}px)`,
            height: `calc(100% + ${2 * vs_margin}px)`,
        };

        const container_styles: React.CSSProperties = {
            transform: this.getViewportTransformFor(this.state.center),
        };

        return <div
            ref={this.viewport}
            className={`${PanClasses["viewport"]} ${PanClasses["hide-scrollbars"]}`}
            onScroll={() => {
                this.recenterScrollBarsInner(/* is_forced */ false, /* skip_state_update */ false);
            }}
            {...this.props.viewport_props}
        >
            <div ref={this.overflow} className={PanClasses["overflow"]} style={overflow_styles}>
                <div ref={this.container} className={PanClasses["container"]} style={container_styles}>
                    {this.props.children}
                </div>
            </div>
        </div >;
    }
}
