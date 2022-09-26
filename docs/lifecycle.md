# Part Lifecycle

We need a lifecycle for our objects—we need something that can predictably notify objects that they've been logically destroyed and handle their cleanup in an organized manner. This is necessary because:

1. Threads raise exceptions unexpectedly and we need to avoid memory leaks in those scenarios.
2. Signals connect to other objects and they need to know when their listeners are gone.
3. Objects create a bunch of resources and we'd like to destroy them in a responsible manner without leaking anything.

Unlike Rust, JavaScript doesn't really have a defined object lifecycle so we are forced to come up with our own for this project.

It is very hard to come up with an object lifecycle which is efficiently applicable to all its use-cases. For example:

1. We'd like to destroy children before their ancestors because they depend on root-level services.
2. We'd like to destroy parents before their children because the parents depend on their children.
3. We'd like to know if a target is already in the process of being deleted so we can skip a bunch of cleanup steps if they end up not being necessary.

We handle destruction in the most generic fashion possible. When a user calls `Part.destroy`, the following happens:

1. Collect every target descendant into a list. This ensures that the operation is atomic.
2. For every descendant of the node, set their `is_condemned` flag to true.
2. Call their `.cleanup` virtual methods in an arbitrary order. `.cleanup` handlers are not expected to perform any actual cleanup logic. Instead, `.cleanup` handlers add tasks onto the provided `CleanupExecutor`.
3. Invoke the `CleanupExecutor`.
4. After the executor has finished running all its cleanup tasks, every node is marked as fully destroyed, making its instance invalid.

The executor is a do-before executor. Tasks are registered through the following interface:

```typescript
class Executor {
    register(target: object, needs: object[], task: () => void) {
        todo()
    }

    fire() {
        todo()
    }
}
```

The `needs` array communicates which objects cannot be destroyed before the current task runs. Objects that don't need anything will be destroyed first. The target doesn't necessarily have to be a `Part` although it typically is.

Orphan `Part`s are of special concern to the safety of this model. If the routine responsible for constructing an orphan `Part` raises an exception before that orphan is attached to the tree, the `Part` could very easily be leaked. To prevent this, we keep track of all extant orphans and destroy them at the next call to `Part.reapOrphans` if they haven't yet been attached to an alive object. Because of this behavior, users are expected to attach their part to the tree as soon as possible—even if that part isn't fully initialized yet. This requirement is easy to comply with, however, because there is no special behavior which occurs when a part is attached to the tree.

If a fallible routine is allocating parts with heavyweight associated resources that the user wishes to destroy ASAP if the routine raises an exception, users can associate the root with an `Orphanage` provided by `Part.wrapFallible`, which will reap all orphans associated with it when the routine provided to `Part.wrapFallible` returns or unwraps.

There are some special semantics to be decided for nodes which are added to an actively condemned node. Because `CleanupExecutor.register` cannot be called while its tasks are being executed, we don't want to add parts added to a dying part to the destructor queue. Instead, we chose to treat requests to parent to a condemned node as requests to orphan that node. This behavior is fine because we already automatically reap orphan instances. Additionally, because `.destroy`'s condemnation phase is atomic (i.e. it condemns all descendants before calling out to userland), there is no additional complexity relating to the time at which children are added.
