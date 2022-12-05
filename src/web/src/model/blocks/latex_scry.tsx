import * as React from "react";
import { Entity, Part } from "kotae-util";
import { EntityViewProps, useListenable } from "../../util/hooks";
import { BlockRegistry, IrBlock, ScryBlock, IrLine, IrFrame } from "kotae-common";
import { BLOCK_FACTORY_KEY, BLOCK_KIND_INFO_KEY, BLOCK_VIEW_KEY } from "./../registry";
//import { useSvgDrawing } from 'react-hooks-svgdrawing'
//import { ReactSketchCanvas } from 'react-sketch-canvas';
import { parse } from 'node-html-parser';

//const useCanvas = (draw, options={}) => {

//    const canvasRef = React.useRef(null)

//    React.useEffect(() => {

//        const canvas = canvasRef.current
//        const context = canvas.getContext(options.context || '2d')
//        let frameCount = 0
//        let animationFrameId;
//        const render = () => {
//            frameCount++
//                draw(context, frameCount)
//            animationFrameId = window.requestAnimationFrame(render)
//        }
//        render()
//        return () => {
//            window.cancelAnimationFrame(animationFrameId)
//        }
//    }, [draw])
//    return canvasRef
//}

//const Canvas = props => {  

//    const { draw, options, ...rest } = props
//    const { context, ...moreConfig } = options
//    const canvasRef = useCanvas(draw, {context})

//    const paintCanvas = canvasRef.current
//    context.lineCap = 'round';

//    let x = 0, y = 0;
//    let isMouseDown = false;

//    const stopDrawing = () => { isMouseDown = false; }
//    const startDrawing = event => {
//        isMouseDown = true;   
//        [x, y] = [event.offsetX, event.offsetY];  
//    }
//    const drawLine = event => {
//        if ( isMouseDown ) {
//            const newX = event.offsetX;
//            const newY = event.offsetY;
//            context.beginPath();
//            context.moveTo( x, y );
//            context.lineTo( newX, newY );
//            context.stroke();
//            //[x, y] = [newX, newY];
//            x = newX;
//            y = newY;
//        }
//    }

//    paintCanvas.addEventListener( 'mousedown', startDrawing );
//    paintCanvas.addEventListener( 'mousemove', drawLine );
//    paintCanvas.addEventListener( 'mouseup', stopDrawing );
//    paintCanvas.addEventListener( 'mouseout', stopDrawing );

//  return <canvas ref={canvasRef} {...rest}/>
//}


const Canvas = props => {

    let paths = [];
    let local_path = [];

    React.useEffect(() => {
        const canvas = props.canvasRef.current
        const context = canvas.getContext('2d')
        //Our first draw
        context.lineWidth = 5;


        let x = 0, y = 0;
        let isMouseDown = false;

        const stopDrawing = () => { 
            isMouseDown = false;
            if (local_path.length > 0) {
                paths.push(local_path);
                local_path = [];
                console.log(paths);
            }
        }
        const startDrawing = event => {
            isMouseDown = true;   
            [x, y] = [event.offsetX, event.offsetY];  
        }
        const drawLine = event => {
            if ( isMouseDown ) {
                const newX = event.offsetX;
                const newY = event.offsetY;
                context.beginPath();
                context.moveTo( x, y );
                context.lineTo( newX, newY );
                context.stroke();
                x = newX;
                y = newY;
                local_path.push({
                    "x": x, 
                    "y": y,
                    "t": Date.now()
                })
            }
        }

        canvas.addEventListener( 'mousedown', startDrawing );
        canvas.addEventListener( 'mousemove', drawLine );
        canvas.addEventListener( 'mouseup', stopDrawing );
        canvas.addEventListener( 'mouseout', stopDrawing );

    }, [])

    return <canvas ref={props.canvasRef} {...props}/>
}

export function createKind(parent: Part | null) {
	const kind = new Entity(parent, "scry block kind");
	kind.add(ScryBlockView, [BLOCK_VIEW_KEY]);
	kind.add({
		name: "Latex Scry Block",
		description: "don't know how to write a symbol? search for it!",
		icon: null!,
	}, [BLOCK_KIND_INFO_KEY]);
	kind.add((parent) => {
		const instance = new Entity(parent, "scry block");
		const instance_ir = instance.add(new IrBlock(instance, kind), [IrBlock.KEY]);
		const instance_text = instance.add(new ScryBlock(instance), [ScryBlock.KEY]);
		instance.setFinalizer(() => {
			instance_text.destroy();
			instance_ir.destroy();
		});

		return instance;
	}, [BLOCK_FACTORY_KEY]);

	return kind;
}

function ScryBlockView({ target }: EntityViewProps) {
	const target_ir = target.get(ScryBlock.KEY);
	const text = useListenable(target_ir.text);
        //const [renderRef, draw] = useSvgDrawing({
        //    penWidth: 5, // pen width
        //})
        
        const canvas_ref = React.useRef(null);

	const block_ref = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		block_ref.current!.focus();
        }, []);


        const PathToPoints = (path, resolution, onDone) => {
            console.log("RUNNING")
            var ctx = {};
            ctx.resolution = resolution;
            ctx.onDone = onDone;
            ctx.points = [];
            ctx.interval = null;


            // Walk up nodes until we find the root svg node
            var svg = path;


            while (!(svg instanceof SVGSVGElement)) {
                console.log(svg instanceof SVGSVGElement, "here")
                svg = svg.parentElement;
            }
            // Create a rect, which will be used to trace the path

            var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            ctx.rect = rect;
            svg.appendChild(rect);

            var motion = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
            motion.setAttribute("path", path.getAttribute("d"));
            motion.setAttribute("begin", "0");
            motion.setAttribute("dur", "3"); // TODO: set this to some larger value, e.g. 10 seconds?
            motion.setAttribute("repeatCount", "1");
            motion.onbegin = PathToPoints.beginRecording.bind(this, ctx);
            motion.onend = PathToPoints.stopRecording.bind(this, ctx);

            // Add rect
            rect.appendChild(motion);
        }

        PathToPoints.beginRecording = function(ctx) {
            var m = ctx.rect.getScreenCTM();
            ctx.points.push({x: m.e, y: m.f});
            ctx.interval = setInterval(PathToPoints.recordPosition.bind(this, ctx), 1000*3/ctx.resolution);
        }

        PathToPoints.stopRecording = function(ctx) {
            clearInterval(ctx.interval);

            // Remove the rect
            ctx.rect.remove();

            ctx.onDone(ctx.points);
        }

        PathToPoints.recordPosition = function(ctx) {
            var m = ctx.rect.getScreenCTM();
            ctx.points.push({x: m.e, y: m.f});
        }









	return <div
            ref={block_ref}
	>
            {/*<div style={{ width: 300, height: 300 }} ref={renderRef}
                onMouseEnter={(e) => {
                    //console.log(e.clientX, e.clientY, "cliekd!")

                    var rect = e.target.getBoundingClientRect();
                    var x = e.clientX - rect.left; //x position within the element.
                    var y = e.clientY - rect.top;  //y position within the element.
                    console.log("Left? : " + x + " ; Top? : " + y + ".");
                }}
                />*/}
            {/*<ReactSketchCanvas
                width="300"
                height="300"
                strokeWidth={4}
                strokeColor="black"
            />*/}

            {/*<Canvas 
                draw={(ctx, frameCount) => {
                    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
                    ctx.fillStyle = '#000000'
                    ctx.beginPath()
                    ctx.arc(50, 100, 20*Math.sin(frameCount*0.05)**2, 0, 2*Math.PI)
                    ctx.fill()
                }}

                options={{
                    context: canvas_ref.current,
                    onClick: (e) => { console.log(e) }
                }}

                />*/}
            <Canvas canvasRef={canvas_ref} />

            <div className="border-red-4 border-2"
                onClick={() => { 
                    draw.clear()
                }}
            > clear </div>
            <div className="border-red-4 border-2"
                onClick={() => { 
                    let el = renderRef.current.children[0].children
                    let paths = []
                    //for (const child of el) {
                    //    //console.log(child.parentElement, "whee")
                    //    PathToPoints(child, 100, function(p){
                    //        paths.append(p)
                    //    })
                    //}
                    let cur_i = 0;

                    //PathToPoints(el[cur_i], 10, function(p){
                    //    console.log(p)
                    //})

                    //const recurse = (i) => {
                    //    PathToPoints(el[cur_i], 100, function(p){
                    //        console.log(p)
                    //        paths.push(p)
                    //        cur_i += 1
                    //        if (el[cur_i] !== undefined) { 
                    //            console.log("recursing!", cur_i, el[cur_i])
                    //            recurse(cur_i) 
                    //        }
                    //    })
                    //}

                    //recurse(cur_i)

                }}
            > log </div>
	</div>;
}


