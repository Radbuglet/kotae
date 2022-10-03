import * as ReactDOM from "react-dom/client";
import { Entity } from "kotae-util";
import { makeReactRoot } from "./view";
import { IrBoard } from "kotae-common";

const app = new Entity(null, "board");
app.add(new IrBoard(app), [IrBoard.KEY]);

const container = ReactDOM.createRoot(document.getElementById("root")!);
container.render(makeReactRoot(app));
