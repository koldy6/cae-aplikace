export type Params = string[];
export interface Route {
  pattern: RegExp;
  /** Returns the screen content; it must contain exactly one <h1>. */
  render: (params: Params) => { title: string; content: Node };
}

/**
 * Minimal hash router. After each navigation (not the first load) focus moves to the page <h1>.
 * The last route is the not-found screen. `onRender` lets the layout update the nav state.
 */
export function startRouter(main: HTMLElement, routes: Route[], onRender: (path: string) => void): void {
  let first = true;
  const show = (): void => {
    const path = location.hash.replace(/^#/, '') || '/';
    let screen: ReturnType<Route['render']> | null = null;
    for (const r of routes) {
      const m = r.pattern.exec(path);
      if (m) {
        screen = r.render(m.slice(1).map(decodeURIComponent));
        break;
      }
    }
    screen ??= routes[routes.length - 1]!.render([]);
    main.replaceChildren(screen.content);
    document.title = `${screen.title} | CAE English`;
    onRender(path);
    if (!first) {
      const h1 = main.querySelector('h1');
      h1?.setAttribute('tabindex', '-1');
      h1?.focus();
      window.scrollTo(0, 0);
    }
    first = false;
  };
  window.addEventListener('hashchange', show);
  show();
}
