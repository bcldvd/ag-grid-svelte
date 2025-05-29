import {
  BaseComponentWrapper,
  VanillaFrameworkOverrides,
  type FrameworkComponentWrapper,
  type IComponent,
  type WrappableInterface
} from 'ag-grid-community';
import { mount, unmount, flushSync } from 'svelte';
import type {
  ComponentType as SvelteComponentType,
  // Only used for typing – not referenced at runtime
  SvelteComponent
} from 'svelte';

// Called when a Svelte component is provided to override a default grid component
export class SvelteFrameworkComponentWrapper
  extends BaseComponentWrapper<WrappableInterface>
  implements FrameworkComponentWrapper
{
  override createWrapper(UserSvelteComponent: SvelteComponentType): WrappableInterface {
    return new NewSvelteComponent(UserSvelteComponent);
  }
}

class NewSvelteComponent<P> implements IComponent<P>, WrappableInterface {
  private eParentElement!: HTMLElement;
  // Whatever `mount` returns (it’s an opaque instance to us)
  private componentInstance: unknown | null = null;
  private methods: { [name: string]: (...args: P[]) => void } = {
    // Provide a default refresh method
    refresh: (params: P) => {
      // Simple strategy: tear down and re-mount with new props
      if (this.componentInstance) {
        unmount(this.componentInstance);
      }
      this.componentInstance = mount(this.SvelteComponent, {
        target: this.eParentElement,
        props: { params }
      });
      flushSync?.();
      return true;
    }
  };

  constructor(private readonly SvelteComponent: SvelteComponentType) {}

  init(params: P): void {
    // Guaranteed to be called
    this.eParentElement = document.createElement('div');
    this.eParentElement.style.width = '100%';
    this.eParentElement.style.height = '100%';
    this.componentInstance = mount(this.SvelteComponent, {
      target: this.eParentElement,
      props: { params }
    });
    flushSync?.();
  }

  getGui(): HTMLElement {
    return this.eParentElement;
  }

  destroy(): void {
    if (this.componentInstance) {
      unmount(this.componentInstance);
      this.componentInstance = null;
    }
  }

  hasMethod(name: string): boolean {
    return this.methods[name] != null;
  }

  callMethod(name: string, args: IArguments): void {
    this.methods[name]?.apply(this.componentInstance as never, [...args] as P[]);
  }

  addMethod(name: string, callback: (...args: unknown[]) => unknown): void {
    this.methods[name] = callback;
  }
}

export class SvelteFrameworkOverrides extends VanillaFrameworkOverrides {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override isFrameworkComponent(comp: any): boolean {
    // In Svelte 5 compiled output, a component is just a plain function.
    // A simple, cheap heuristic is therefore sufficient.
    return typeof comp === 'function';
  }
}