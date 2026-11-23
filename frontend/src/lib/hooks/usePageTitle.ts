import { useEffect } from "react";

/**
 * Set document title conforming to the `%s | GetSwydd` convention for Client Components.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | GetSwydd`;
  }, [title]);
}

