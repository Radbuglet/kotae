# Kotae Architecture

This document details the details of Kotae's bespoke architecture, going from broad-strokes package separation to the fine-level primitives used to power our application.

## App Terminology

In Kotae, users open documents called *boards*. Boards contain *frames* positioned on an infinite canvas. These frames contain *lines* (really paragraphs when wrapping is enabled) of content containing multiple inline *blocks*. There are several types of blocks: text blocks, math blocks, and unimplemented blocks that we promised to the user but never delivered upon.

## Organization

Before we talk about the organization of the project, it is important to know some of the project's history. This is necessary to understand the motivation for a lot of our architectural decisions; a lot *feels* over-engineered until you consider the original context in which we were developing the application.

Originally, Kotae would include two main features: whiteboard editing and math validation. Whiteboard editing represented the frontend of the application. It included the boards in which you could write, the frames you could type in and link together, and all the various block types and their editors. Math validation, meanwhile, would analyze the equations you put on the board, validate them for algebraic correctness, and propose relevant operations. While the whiteboard editor was intended to be the frontend of the project, math validation was intended to be a background *headless* task. By headless, we mean that math validation would be entirely decoupled from the frontend—it didn't need the frontend to work whatsoever—making it possible to work on the subsystem in a manner entirely independent from the frontend team.

To accommodate this desire, we decided to store all document state in a custom data storage mechanism which this document will call the *model*. The model is implemented using mechanisms defined in the `src/util/` submodule, which are detailed in the subsection titled ["the model"](#The-Model). The data structures representing the document (excluding client-specific state such as whether a frame had focus) were written in the `src/common/` submodule. The structure of the model defined in `common` is detailed in the subsection titled ["common"](#common). Finally, the views used to render this model, their client-specific interaction handlers, and additional client-specific model state, were all written in `src/client/`. As expected, the structure of the client (*and how to even get it to run!*) is detailed in the subsection titled ["client"](#client).

Originally, we were planning on adding a fourth module to handle the mathematics backend. This subsystem, however, was scrapped as we focused all our efforts on the whiteboard portion of the project. The `src/math/` submodule still exists in the project tree, although it is virtually empty.

## The Model

The model is implemented using mechanisms defined in the `src/util/` submodule, with some support from `src/client/util/hooks.ts` for frontend React integration. The mechanisms the former module implements are very similar to a Godot Engine [`Node`](https://docs.godotengine.org/en/stable/classes/class_node.html) or Unity [`GameObject`](https://docs.unity3d.com/ScriptReference/GameObject.html).

### `Part` Trees

The base class of most of the model is the `Part` (defined in `src/primitive/node.ts` in the `util ` submodule). A `Part` is an object which can be logically organized into a tree. The basic tree interface works as follows:

```typescript
// A user spawns a Part with a specified parent or `null` if it doesn't have
// a parent. This parent is specified as the first parameter of the `Part`'s
// constructor and is typically the first parameter of constructors of types
// derived from it.
const root = new Part(null);
const child = new Part(root);
const descendant = new Part(child);
const sibling = new Part(root);

// The tree now looks like this:
// - root
//   - child
//      - descendant
//   - sibling

// We can reassign parents at any time so long as the part is not condemned
// (special destruction behavior is described later)
sibling.parent = child;
child.parent = null;

// The tree now looks like this:
// - root
//
// - child
//   - descendant
//   - sibling

// `Part` defines a bunch of additional tree querying methods which are not
// really used too frequently in the project but could be of some use to you.
// Feel free to check them out in `src/primitive/node.ts`!
```

The application's model is built by writing classes that extend this base `Part` class:

```typescript
// Note: the real interface in the application is slightly more complicated.
// We'll detail these additional complexities in the section on "common" code.

import { assert, Part, ListenValue, ListenArray } from "kotae-common";

class TextBlock extends Part {
	// `ListenValue` is another `Part` defining a value that can be listened to
    // for changes. Remember that the first parameter specifies its parent:
    // the `ListenValue` is alive so long as its `TextBlock` is alive.
    readonly text = new ListenValue(this, "initial text");
}

class Line extends Part {
    readonly blocks = new ListenArray(this);

    addTextBlock(block: TextBlock) {
    	assert(block.parent === this, "blocks must be parented to their parent line");
        this.blocks.push(block);
    }
}

// Define a line of text.
const line = new Line(null);
line.addBlock(new TextBlock(line));

// The tree now looks like this:
// - Line
//   - ListenArray (held in the `blocks` field)
//     This object holds a reference to the `TextBlock` but doesn't actually own it.
//   - TextBlock
//     - ListenValue (held in the `text` field)
```

This tree is mainly used for two different things:

- To specify how objects should be deleted (an object being parented to another object implies that it should be deleted when its parent gets deleted)
- To specify the places from which context could be derived (`Part.deepGet`—detailed later—will search for dependencies from its ancestors)

These use-cases are detailed in sections to come.

### `Part` Destruction

Explicit deletion of `Parts` is necessary in this application. We need this feature, despite working in a garbage-collected language, because we want to have a single definition of an object being "destroyed."

Removing an object (e.g. a block) from the lines list might not have destroyed it entirely. Indeed, some other actor (e.g. the math runtime) might still hold a reference to it and might not have been notified of its destruction, expecting the user to call *its* object removal method.

```typescript
class Line {
    private blocks: Block[] = [];

    removeBlock(block: Block) {
        this.blocks.splice(this.blocks.indexOf(block), 1);
    }
}

class MathRuntime {
    private blocks_needing_updating = new Set<Block>();
    
    blockRemoved(block: Block) {
        if (this.blocks_needing_updating.remove(block)) {
            // ... handle additional task cancellation?
        }
    }
}

class Block {
    // ...
}

// Innocent but foolish user, trying to delete a block.
line.removeBlock(my_block);
// ^ forgets to remove it from the `MathRuntime`, causing weird bugs where
// removed blocks continue to affect the math validator.
```

By unifying the notion of a destructor, we can make sure that all subsystems can properly implement their own forms of removal without knowledge of one another. This ensures that users can just call `.destroy()` on the thing they want to destroy, without having to worry about the million places they might have to unregister that object.

```typescript
class Line extends Part {
    private blocks: Block[] = [];

    removeBlock(block: Block) {
        this.blocks.splice(this.blocks.indexOf(block), 1);
    }
    
    // To specify a routine to run upon destruction, just override
    // the `Part.onDestroy` virtual method.
    protected override onDestroy() {
        for (const block of this.blocks) {
            // ...and call `Part.destroy()` when you want to
            // destroy something.
            block.destroy();
        }
    }
}

class Block extends Part {
    readonly doc_state = new BlockDocumentState(this);
    readonly math_state = new BlockMathState(this);
    
    protected override onDestroy() {
        // The math runtime might need to see what the doc_state contains
        // before deletion is over.
        this.math_state.destroy();
        this.doc_state.destroy();
    }
}

class BlockDocumentState extends Part {
    public line?: Line;
    
   	protected override onDestroy() {
        this.line?.removeBlock(this.parent as Block);
    }
}

class BlockMathState {
    public math_rt?: MathRuntime;
    
    protected override onDestroy() {
        this.math_rt?.blockRemoved(this.parent as Block);
    }
}

const math_rt = new MathRuntime(null);

const line = new Line(null);
const block = new Block(line);

// Presumably, the `addLine` and `registerMathBlock` methods would do
// this for you.
block.doc_state.line = line;
block.math_state.math_rt = math_rt;

// Automatically removes the block from both subsystems.
block.destroy();

// You could also delete the line.
line.destroy();
```

How convenient is that?

#### Defensive Programming

There are two safety features baked into this system.

The first feature is memory-leak detection. `.destroy()` expects all its descendants to be destroyed before its corresponding `.onDestroy()` method returns. This helps avoid memory leaks when you forget to destroy a descendant `Part` and ensures that `.destroy`'s semantics are consistent: when you delete something, you immediately delete its descendants as well.

Note that you don't always have to call the `.destroy()` method of your children immediately. For example, if the `MathRuntime` expects you to preserve the entire document tree until it gets deleted, you could call `.destroy()` on every `BlockMathState` instance before calling `.destroy()` on the entire `Block`.

```typescript
class Line extends Part {
    protected override onDestroy() {
        // Unmount the math state
        for (const block of this.blocks) {
            block.math_rt.destroy();
        }
        
        // Delete the blocks.
        for (const block of this.blocks) {
            block.destroy();
        }
    }
}

class Block extends Part {
    readonly doc_state = new BlockDocumentState(this);
    readonly math_state = new BlockMathState(this);
    
    protected override onDestroy() {
        // this.math_state.destroy();
        // ^ replaced with:
        assert(
            !this.math_state.is_alive,  // set to false once `.destroy()` is finished.
            "Math state must be destroyed before the main block destructor is called.",
       	);
        
        this.doc_state.destroy();
    }
}
```

Second, `Part` (well, technically its `Bindable` superclass) will detect when you attempt to call a method on a `.destroy()`'ed instance and raise an error. This helps detect use-after-destroy bugs, which are notoriously difficult to find and replicate. You can detect whether a `Bindable` is still alive through its `is_alive` property. We also expose a useful type constructor `Weak<T>` which transforms the provided type `T` into a TypeScript [type union](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types) of `{ is_alive: false } | { is_alive: true, ...T }`. Combined with TypeScript's [type narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html), this can help ensure that you check whether a given weak target reference `is_alive` before accessing its members.

```typescript
const target = new Part();

// `T` is assignable to `Weak<T>`.
const weak_target: Weak<Part> = target;

// This helper can help perform the cast in a more ergonomic manner.
const weak_target_2 = target.asWeak();

// The following access would not type-check because TypeScript still thinks
// that `weak_target` could be `{ is_alive: false }`.
// weak_target.getAncestors();

if (weak_target.is_alive) {
    // TypeScript now knows that `weak_target` couldn't possibly be
    // of type `{ is_alive: false }`, allowing us to access its members.
    weak_target.getAncestors();
}
```

#### `Part` Identifiers

All `Part` instances have a unique `part_id` number. The ID associated with a `Part` cannot be customized. Part IDs can be used, for example, as a React [component key]().

### Entities

The second important primitive implemented by the `util` module is the `Entity`. These are defined in `src/primitive/node.ts` in the `util` submodule.

Entities map from `TypedKey`s to some correspondingly typed instance, which we call an entity's *component*.

```typescript
// Entities are `Part`s so the constructor's first parameter is its parent.
// The second parameter is a debug name. It does not have to be unique.
const my_entity = new Entity(null, "my cool entity and good friend, Gherald");

// `TypedKey`s are unique identifiers which have been associated to a specific
// type.
//
// The `NAME_KEY`, for example, is an identifier for a name value, which is
// expected to be a `string`.
const NAME_KEY = new TypedKey<string>("NAME");
const AGE_KEY = new TypedKey<number>("AGE");

// Components are added onto entities using the `Entity.add()` method.
// The first parameter takes the component *instance* and the second
// takes a list of keys with which that instance should be associated.
my_entity.add("Gherald", [NAME_KEY]);
my_entity.add(42, [AGE_KEY]);

function sayItsName(target: Entity) {
    console.log(`Its name is ${target.get(NAME_KEY)}`);
}

sayItsName(my_entity);
```

Entities are a powerful mechanism for [polymorphism](https://en.wikipedia.org/wiki/Polymorphism_(computer_science)). Routines can consume `Entity` instances with some arbitrary set of components and the routine can fetch the components it cares about while ignoring the rest.

```typescript
// First, we define our component classes.
class Position {
    static readonly KEY = new TypedKey<Position>("Position");
    
    constructor(public x: number, public y: number) {}
}

class Colorful {
    static readonly KEY = new TypedKey<Colorful>("Colorful");
    
    constructor(public color: string) {}

	randomize() {
		this.color = ...;
	}
}

// Now, we instantiate our entity instances and attach some components to them.
// Note how we can mix and match components as we please? Such an object hierarchy
// would be impossible to implement with pure class inheritance
// (which inherits from which?)

// A box is colorful and has a position.
const box = new Entity(null, "my box");
box.add(new Position(3, 2), [Position.KEY]);
box.add(new Colorful("red"), [Colorful.KEY]);

// A background is colorful but has no position because it's in the background.
const background = new Entity(null, "my background");
background.add(new Colorful("#fff"), [Colorful.KEY]);

// A sad box has a position but has no color (it's sad).
const sad_box = new Entity(null, "a very sad box :(");
sad_box.add(new Position(4, 2), [Position.KEY]);

// Finally, let's define a routine that operates on entities with positions...
function moveEverythingUp(positionals: Entity[]) {
	for (const positional of positionals) {
		// This routine expects a list of entities with position components and thus
		// has no logic for handling entities without a position.
		positional.get(Position.KEY).y += 1;
	}
}

// And here's another routine which operates on entities which have a `colorful` component
// but may or may not have a position.
function randomizeColorsIfFarAway(colorfuls: Entity[]) {
	for (const colorful of colorfuls) {
		const colorful_pos = colorful.tryGet(Position.KEY);
		
		// Ignore entities with positions that are too close. Accept all entities that lack
		// a `Position` component.
		if (colorful_pos !== null && Math.abs(colorful_pos.x) < 1000) {
			continue;
		}
		
		// Expect the entity to have a `Colorful` component so that it can randomize its
		// color.
		colorful.get(Colorful.KEY).randomize();
	}
}

// Now to run them!
moveEverythingUp([box, sad_box]);
randomizeColorsIfFarAway([background, box]);
```

This polymorphism provides an important mechanism for subsystem isolation. In writing routines that only consume the components relevant to their subsystem, developers can minimize the chance of stepping on one another's toes. This isolation also reduces the impact of "breaking" interfaces changes to members of the same subsystem or code written on the thin barrier between systems.

Entities are your friends.

#### Dependency Injection

Entities also provide a really nice dependency injection scheme. Each `Part` keeps track of their closest `Entity` ancestor, exposing it as the readonly property `parent_entity`.

```typescript
class MyComponent extends Part {
	static readonly KEY = new TypedKey<MyComponent>("MyComponent");

	doSomething() {
		this.parent_entity
			.get(MyOtherComponent.KEY)
			.doSomethingElse();
	}
}

class MyOtherComponent extends Part {
	static readonly KEY = new TypedKey<MyOtherComponent>("MyOtherComponent");

	doSomethingElse() {
		console.log("Hi!");
	}
}

const my_entity = new Entity(null, "my entity");
my_entity.add(new MyComponent(my_entity), [MyComponent.KEY]);
my_entity.add(new MyOtherComponent(my_entity), [MyOtherComponent.KEY]);

my_entity.get(MyComponent.KEY).doSomething();
```

`Parts` access their `parent_entity` so frequently that `parent_entity` is defined as having the type `Entity` rather than the type `Entity | null` and will trip an assert on access if the parent entity is `null`. If you really want to access an optionally present entity, you should use the `opt_parent_entity` property instead.

If you're looking for a component stored in an entity higher up in the `Part` tree, you can also use `deepGet` and its fallible counterpart `tryDeepGet`.

```typescript
const app = new Entity(null, "application");
app.add(new BlockRegistry(app), [BlockRegistry.KEY]);

// ... a board, containing a frame, containing a line, containing a...

const block = new Entity(my_line, "some block");
block.add(new TextBlock(block), [TextBlock.KEY]);

class TextBlock extends Part {
	static readonly KEY = new TypedKey<TextBlock>("TextBlock");

	extendMyLine() {
		// Gets its `line` and its `block_registry`, despite neither being an
		// immediate ancestor of this component.
		const line = this.deepGet(Line.KEY);
		const block_registry = this.deepGet(BlockRegistry.KEY);
		
		const line = block_registry.getKind("text_block")
			.get(FACTORY_KEY)
			.spawn(line, "some default text");

		line.blocks.push(line);
	}
}

block.get(TextBlock.KEY).extendMyLine();
```

### Signals

Signals are JavaScript `EventListeners` reimplemented for the part infrastructure: both signals and their handlers are `Part` instances. Signals allow their users to hook into events (e.g. "on frame added," "on newline requested") using callbacks.

They are defined in `src/primitive/signal.ts` in the `util` module.

```typescript
const on_block_removed = new Signal<(block: Entity) => void>(null);

// The first parameter to `Signal.connect()` specifies the parent of the returned
// `SignalConnection` instance. The second parameter specifies its associated
// handler callback.
const handler = on_block_removed.connect(null, block => {
	console.log("Block deleted:", block);
	
	// NOTE: It is perfectly valid to disconnect a signal handler in the middle of
	// an event handler because JavaScript `Sets` are magical.
});

// To fire a signal and trigger all its handlers, call the `Signal.fire()` method
// with its user-defined arguments.
on_block_removed.fire(new Entity(null, "A block that we want our handlers to remove."));

// To disconnect a signal, just `.destroy()` the `SignalConnection`.
handler.destroy();

// Destroying a signal will destroy all its `handlers`. Be careful!
// NOTE: The main reason you would keep a `SignalConnection` around would be to
// eventually destroy it in its parent's `onDestroyed()` virtual handler. In the
// future, `Part`s could be designed to automatically destroy `SignalHandlers`
// without user intervention.
const handler_2 = on_block_removed.connect(null, _block => {});
on_block_removed.destroy();
assert(!handler_2.is_alive);
```

Signals aren't used too frequently in the model because *the order in which they trigger handlers is completely arbitrary*. In conjunction with `ListenValue`, `ListenArray`, and `ListenSet` however, they become useful for client interop.

`ListenValue` is another `Part` that wraps a value and exposes a `Signal` for when that value changes:

```typescript
const age = new ListenValue(null, 3);

age.on_changed.connect(() => {
	// This event handler is called after the value has been updated. There is currently
	// no way to see what exactly has changed.
	console.log("The age has changed to", age.value, "!");
});

age.value += 1;
```

A similar interface is exposed for `ListenArray` and `ListenSet`. Just note that readonly access to the underlying container is obtained through `.value` instead of `.values` for implementation simplicity and that modification is done using the `ListenArray` and `ListenSet` wrapper methods:

```typescript
const blocks = new ListenArray<Entity>(null);

blocks.on_changed.connect(() => {
	console.log("We now have", blocks.value.length, "block(s).");
});

blocks.push(new Entity(null, "my block 1"));
blocks.push(new Entity(null, "my block 2"));
blocks.removeAt(0);
```

### Notes on Client Integration

Listen containers are mainly implemented for React interop. We expose a custom functional hook called `useListenable` (defined in `src/util/hooks.ts` in the `client` module), which takes a `ListenableXYZ` instance, registers an `on_change` handler to update the calling component on value change, and returns its current value snapshot.

```jsx
function NumberView({ value }: Readonly<{ value: ListenValue<number> }>) {
	value = useListenable(value);
	
	return <p> The current value is: {value} </p>;
}
```

It is also worth remembering that React 18 does not rerender its components immediately. That means that a view component for an object that has been `.destroyed()` in the model may persist for several frames. If user event handlers do not check that their target is alive before doing things to it, they run the risk of triggering use-after-destroy bugs that only occur when the app is lagging.

```jsx
function NumberView({ value }: Readonly<{ value: ListenValue<number> }>) {
	const value_snapshot = useListenable(value);
	
	function doAddOne() {
		if (value.is_alive) {
			value.value += 1;
		}
	}
	
	// Alternatively, you can use `wrapWeakReceiver` (also defined in `src/util/hooks.ts`) to
	// construct a closure that checks that the first parameter is still alive before calling into
	// the callback specified as its second parameter, ignoring the call otherwise.
	//
	// The first parameter of the wrapped method is the target being validated against. It's only
	// really useful if `value` is a `Weak<T>` instance; otherwise, you can safely ignore it.
	const doAddTwo = wrapWeakReceiver(value, (_value) => {
		value.value += 1;
	});

	return <p>
		The current value is: {value_snapshot} {}
		<button onclick={doAddOne}> Add One </button>
		<button onclick={doAddTwo}> Add Two </button>
	</p>;
}
```

When rendering lists of `Parts`, users can use the parts' `part_id` property as a [React `key`](https://reactjs.org/docs/lists-and-keys.html).

```jsx
const NUMBER_COMP_KEY = new TypedKey<ListenValue<number>>("NUMBER_COMP");

function ListView({ list }: Readonly<{ list: ListenArray<Entity> }>) {
	const items = useListenable(list);

	const doAdd = wrapWeakListener(list, _list => {
		const item = new Entity(list, "item");
		item.add(new ListenValue(0), [NUMBER_COMP_KEY]);

		list.push(item);
	});
	
	return <div>
		<p> Items <button onClick={doAdd}> Add Item </button> </p>
		{items.value.map(item =>
			<NumberView
				key={item.part_id}
				value={item.get(NUMBER_COMP_KEY)}
			/>
		)}
	</div>;
}

```

We call React components that render model entities "views." The pattern of writing React components that take a single target `Entity` property is so common that we defined a type alias called `EntityViewProps` for that exact property list.

```typescript!
// TODO
```

### Other Helpers

TODO

### Example

Here's one large todo list app example featuring all these primitives in action.

```jsx
//> model.ts
export class IrTodoList extends Part {
    static readonly KEY = new TypedKey<IrTodoList>();

    readonly title = new ListenValue(this, "untitled todo list");
    readonly items = new ListenArray<Entity>(this);
    readonly checked_count = new ListenValue(this, 0);

    constructor(parent: Part | null) {
        super(parent);
    }

    addItem(item: Entity) {
        this.items.push(item);
    }

    removeChecked() {
        for (const item of this.items.value) {
            const item_ir = item.get(IrTodoItem.KEY);

            if (item_ir.checked.value) {
                item.destroy();
            }
        }
    }

	protected override onDestroy() {
        for (const item of this.items.value) {
            item.destroy();
        }
    }
}

export class IrTodoItem extends Part {
    static readonly KEY = new TypedKey<IrTodoItem>();

    readonly text: ListenValue<string>;
    readonly checked = new ListenValue(this, false);

    constructor(parent: Part | null, text: string) {
        super(parent);

        this.text = new ListenValue(this, text);
        this.checked.on_changed.connect(this, new_value => {
            this.getIrList()
                .checked_count
                .value += new_value ? 1 : -1;
        });
    }

    private getIrList() {
        return this.deepGet(IrTodoList.KEY);
    }

    flipChecked() {
        this.checked.value = !this.checked.value;
    }

    protected override onDestroy() {
        this.getIrList().items.remove(this.parent_entity);
    }
}

//> view.tsx
export function TodoListView({ target }: EntityViewProps) {
    const target_ir = target.get(IrTodoList.KEY);

    const title = hookValue(target_ir.title);
    const items = hookArray(target_ir.items);
    const checked_count = hookValue(target_ir.checked_count);

    const do_add_item = wrapWeakReceiver(target_ir, target_ir => {
        const item = new Entity(target_ir);
        item.add(new IrTodoItem(item, `todo item #${target_ir.items.length + 1}`), [IrTodoItem.KEY]);
        target_ir.addItem(item);
    });

    const do_remove_checked = wrapWeakReceiver(target_ir, target_ir => {
        target_ir.removeChecked();
    });

    return <div>
        <h1> {title} </h1>
        <p> Completed: {checked_count} / {items.length} </p>
        <p>
            <button onClick={do_add_item}> Add Item </button> | { }
            <button onClick={do_remove_checked}> Remove Checked </button>
        </p>
        <ul>
            {items.map(item => <TodoItemView key={item.part_id} target={item} />)}
        </ul>
    </div>;
}

// React.memo can help ensure that we don't re-render item views when the parent list view updates.
export const TodoItemView = React.memo(({ target }: EntityViewProps) => {
    const target_ir = target.get(IrTodoItem.KEY);

    const is_checked = hookValue(target_ir.checked);
    const text = hookValue(target_ir.text);

    const do_remove_self = wrapWeakReceiver(target_ir, target_ir => {
        target_ir.parent_entity.destroy();
    });

    const do_flip_checkbox = wrapWeakReceiver(target_ir, target_ir => {
        target_ir.flipChecked();
    });

    const do_set_text = wrapWeakReceiver(target_ir, (target_ir, e: React.ChangeEvent<HTMLInputElement>) => {
        target_ir.text.value = e.target.value;
    });

    return <li>
        <input type="checkbox" value={is_checked ? "yes" : "no"} onChange={do_flip_checkbox} />
        {" "}
        <input
            type="textbox"
            value={text}
            onChange={do_set_text}
        />
        {" "}
        <button onClick={do_remove_self}> Remove </button>
        {" "}
        {target_ir.part_id}
    </li>;
});

//> main.tsx
const list = new Entity(null);
list.add(new IrTodoList(list), [IrTodoList.KEY]);

const container = ReactDOM.createRoot(document.getElementById("root")!);
container.render(<TodoListView target={list} />);
```

## Common

TODO (understanding `common` is left as an exercise to the reader)

## Client

TODO
