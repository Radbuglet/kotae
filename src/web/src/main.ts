import * as ReactDOM from "react-dom/client";
import { Entity } from "kotae-util";
import { makeReactRoot } from "./view";
import { IrDocument } from "kotae-common";

const app = new Entity(null, "app");
app.add(new IrDocument(app), [IrDocument.KEY]);

const container = ReactDOM.createRoot(document.getElementById("root")!);
container.render(makeReactRoot(app));
