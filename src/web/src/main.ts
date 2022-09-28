import * as ReactDOM from "react-dom/client";
import { Dismounter, Entity } from "kotae-util";
import { IrTodoList } from "../../common/src";
import { makeReactRoot } from "./view";

const list = new Entity(null);
list.add(new Dismounter(), [Dismounter.KEY]);
list.add(new IrTodoList(list), [IrTodoList.KEY]);

const container = ReactDOM.createRoot(document.getElementById("root")!);
container.render(makeReactRoot(list));
