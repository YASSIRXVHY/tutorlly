'use client';

/**
 * Hand-built hash router. No dependencies, deep-linkable (#/browse?cat=math),
 * works identically under Next.js and in a plain Vite app.
 */
import { useCallback, useEffect, useState } from "react";
import { cx } from "../utils/misc";

export interface Route {
  path: string;
  query: Record<string, string>;
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, "");
  const [pathPart, queryPart] = raw.split("?");
  let path = pathPart || "/";
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/+$/, "") || "/";
  const query: Record<string, string> = {};
  if (queryPart) {
    new URLSearchParams(queryPart).forEach((v, k) => {
      query[k] = v;
    });
  }
  return { path, query };
}

export function navigate(to: string): void {
  if (window.location.hash === `#${to}`) return;
  window.location.hash = to;
}

/** Route pattern match: "/tutor/:id" against "/tutor/kenji" -> { id: "kenji" } */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const pParts = pattern.split("/").filter(Boolean);
  const uParts = path.split("/").filter(Boolean);
  if (pParts.length !== uParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pParts.length; i++) {
    const p = pParts[i];
    if (p.startsWith(":")) {
      params[p.slice(1)] = decodeURIComponent(uParts[i]);
    } else if (p !== uParts[i]) {
      return null;
    }
  }
  return params;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>({ path: "/", query: {} });

  useEffect(() => {
    const sync = () => setRoute(parseHash());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return route;
}

export function useNavigate() {
  return useCallback((to: string) => navigate(to), []);
}

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  activeClassName?: string;
  exact?: boolean;
  children?: React.ReactNode;
}

export function Link({
  to,
  activeClassName,
  exact = true,
  className,
  children,
  ...rest
}: LinkProps) {
  const route = useRoute();
  const active = exact
    ? route.path === to
    : route.path === to || route.path.startsWith(`${to}/`);
  return (
    <a
      href={`#${to}`}
      className={cx(className, active && activeClassName)}
      {...rest}
    >
      {children}
    </a>
  );
}

/** Scroll to top whenever the path portion of the hash changes. */
export function useScrollTopOnRoute(route: Route): void {
  const { path, query } = route;
  useEffect(() => {
    // Filter changes arrive as query updates — keep scroll position for those.
    if (!query || Object.keys(query).length === 0) {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [path, JSON.stringify(query)]);
}
