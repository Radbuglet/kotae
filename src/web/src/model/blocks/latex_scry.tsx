import * as React from "react";
import { Entity, Part } from "kotae-util";
import { EntityViewProps, useListenable } from "../../util/hooks";
import { BlockRegistry, IrBlock, ScryBlock, IrLine, IrFrame } from "kotae-common";
import { BLOCK_FACTORY_KEY, BLOCK_KIND_INFO_KEY, BLOCK_VIEW_KEY } from "./../registry";

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

async function GetTeXResult(positions) {
    const repsonse = await fetch("https://detexify.kirelabs.org/api/classify", {
    "headers": {
	"accept": "application/json, text/javascript, */*; q=0.01",
	"accept-language": "en-US,en;q=0.9",
	"content-type": "application/x-www-form-urlencoded; charset=UTF-8",
	"sec-ch-ua": "\"Google Chrome\";v=\"107\", \"Chromium\";v=\"107\", \"Not=A?Brand\";v=\"24\"",
	"sec-ch-ua-mobile": "?0",
	"sec-ch-ua-platform": "\"macOS\"",
	"sec-fetch-dest": "empty",
	"sec-fetch-mode": "cors",
	"sec-fetch-site": "same-origin",
	"x-requested-with": "XMLHttpRequest",
	"cookie": "_ga=GA1.2.943797916.1670265125; _gid=GA1.2.845075545.1670265125; __gads=ID=36efcd96a0e29108-22ee6daa94d700c3:T=1670265125:RT=1670265125:S=ALNI_MZT8eT2UUPYHB66YidcWsSz7-WktA; __gpi=UID=0000090a20d605f4:T=1670265125:RT=1670265125:S=ALNI_MaWC54PqIZguojLuEvey4v4KnIdnQ",
	"Referer": "https://detexify.kirelabs.org/classify.html",
	"Referrer-Policy": "strict-origin-when-cross-origin"
    },
    "body": "strokes=`${encodeURIComponent(positions.toString())}`",
    "method": "POST"
    });
    return response.json().filter(element => element.symbol.package != undefined).filter(element => element.symbol.mathmode).slice(0, 5).filter(element => element.symbol.command);
}

function ScryBlockView({ target }: EntityViewProps) {
	const target_ir = target.get(ScryBlock.KEY);
	const text = useListenable(target_ir.text);
        
        const canvas_ref = React.useRef(null);

	const block_ref = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		block_ref.current!.focus();
        }, []);


	return <div
            ref={block_ref}
	>
            <Canvas canvasRef={canvas_ref} />

            <div className="border-red-4 border-2"
                onClick={() => { 
                    draw.clear()
                }}
            > clear </div>
	</div>;
}


