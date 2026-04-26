---
name: Composite
category: Structural
popularity: 2/3
tier: 2
source: refactoring.guru/design-patterns/composite/typescript/example
---

# Composite

## Intent

Composite is a structural design pattern that lets you compose objects into tree structures and then work with these
structures as if they were individual objects.

## Applicability

- Your app's core model can be represented as a hierarchical tree structure with both simple and complex elements
- You want client code to handle simple and complex elements uniformly through a shared interface
- You need to avoid tight coupling between clients and concrete component classes in a tree structure

## Pros

- Work with complex tree structures more conveniently using polymorphism and recursion
- Open/Closed Principle: introduce new element types without breaking existing code
- Clients treat all elements equally regardless of complexity

## Cons

- Difficult to establish common interfaces when component functionalities differ significantly
- May require overgeneralizing the component interface, reducing clarity
- Can be unnecessarily complex for simple, non-hierarchical object structures

## Don't use when

- The hierarchy is one or two levels deep → flat array is enough
- Leaves and composites have nothing meaningful in common → forcing a shared interface hurts clarity
- A simple recursive function over a plain object tree would suffice

## TypeScript Example

```typescript
/**
 * The base Component class declares common operations for both simple and
 * complex objects of a composition.
 */
abstract class Component {
    protected parent!: Component | null;

    /**
     * Optionally, the base Component can declare an interface for setting and
     * accessing a parent of the component in a tree structure. It can also
     * provide some default implementation for these methods.
     */
    public setParent(parent: Component | null) {
        this.parent = parent;
    }

    public getParent(): Component | null {
        return this.parent;
    }

    /**
     * In some cases, it would be beneficial to define the child-management
     * operations right in the base Component class. This way, you won't need to
     * expose any concrete component classes to the client code, even during the
     * object tree assembly. The downside is that these methods will be empty
     * for the leaf-level components.
     */
    public add(component: Component): void {
    }

    public remove(component: Component): void {
    }

    /**
     * You can provide a method that lets the client code figure out whether a
     * component can bear children.
     */
    public isComposite(): boolean {
        return false;
    }

    /**
     * The base Component may implement some default behavior or leave it to
     * concrete classes (by declaring the method containing the behavior as
     * "abstract").
     */
    public abstract operation(): string;
}

/**
 * The Leaf class represents the end objects of a composition. A leaf can't have
 * any children.
 *
 * Usually, it's the Leaf objects that do the actual work, whereas Composite
 * objects only delegate to their sub-components.
 */
class Leaf extends Component {
    public operation(): string {
        return 'Leaf';
    }
}

/**
 * The Composite class represents the complex components that may have children.
 * Usually, the Composite objects delegate the actual work to their children and
 * then "sum-up" the result.
 */
class Composite extends Component {
    protected children: Component[] = [];

    public add(component: Component): void {
        this.children.push(component);
        component.setParent(this);
    }

    public remove(component: Component): void {
        const componentIndex = this.children.indexOf(component);
        this.children.splice(componentIndex, 1);

        component.setParent(null);
    }

    public isComposite(): boolean {
        return true;
    }

    /**
     * The Composite executes its primary logic in a particular way. It
     * traverses recursively through all its children, collecting and summing
     * their results. Since the composite's children pass these calls to their
     * children and so forth, the whole object tree is traversed as a result.
     */
    public operation(): string {
        const results = [];
        for (const child of this.children) {
            results.push(child.operation());
        }

        return `Branch(${results.join('+')})`;
    }
}

function clientCode(component: Component) {
    console.log(`RESULT: ${component.operation()}`);
}

const simple = new Leaf();
console.log('Client: I\'ve got a simple component:');
clientCode(simple);
console.log('');

const tree = new Composite();
const branch1 = new Composite();
branch1.add(new Leaf());
branch1.add(new Leaf());
const branch2 = new Composite();
branch2.add(new Leaf());
tree.add(branch1);
tree.add(branch2);
console.log('Client: Now I\'ve got a composite tree:');
clientCode(tree);
```

## Pairs well with

Iterator (Iterator walks the Composite); Visitor (Visitor performs operations across the whole tree); Decorator (both
share the recursive wrapping shape).
