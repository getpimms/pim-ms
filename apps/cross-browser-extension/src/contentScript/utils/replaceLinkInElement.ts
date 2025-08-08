import { logger } from "../../utils/logger";

function ensureHttpPrefixed(url: string): string {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//i, "");
}

function stripTrailingSlashes(s: string): string {
  return s.replace(/\/+$/, "");
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function truncate(s: string, max = 220): string {
  if (!s) return s;
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function buildSearchCandidates(oldHref: string, oldText?: string): string[] {
  const candidates: string[] = [];
  if (oldHref) {
    const noProto = stripProtocol(oldHref);
    candidates.push(oldHref, stripTrailingSlashes(oldHref));
    candidates.push(noProto, stripTrailingSlashes(noProto));
  }
  if (oldText && oldText.length >= 3) {
    candidates.push(oldText, stripTrailingSlashes(oldText));
  }
  // Order by length desc to avoid partial replacements first
  return unique(candidates).sort((a, b) => b.length - a.length);
}

function replaceAllVariants(
  haystack: string,
  variants: string[],
  replacement: string,
): string {
  let result = haystack;
  for (const variant of variants) {
    if (!variant) continue;
    if (result.includes(variant)) {
      result = result.split(variant).join(replacement);
    }
  }
  return result;
}

export function replaceLinkInElement(params: {
  element: HTMLElement;
  oldHref: string; // normalized old href (likely with protocol)
  oldText?: string; // the exact text originally detected in content, if any
  newShortened: string; // the shortened form as returned (may be without protocol)
  forceAnchorToText?: boolean; // when true, replace <a> with plain text URL
}): { changed: boolean } {
  const {
    element,
    oldHref,
    oldText,
    newShortened,
    forceAnchorToText = false,
  } = params;

  try {
    const elementType =
      element instanceof HTMLAnchorElement
        ? "anchor"
        : element instanceof HTMLInputElement
          ? "input"
          : element instanceof HTMLTextAreaElement
            ? "textarea"
            : (element as HTMLElement).isContentEditable
              ? "contenteditable"
              : element.tagName.toLowerCase();

    logger.debug("[PIMMS] replaceLinkInElement:start", {
      elementType,
      tag: element.tagName,
      oldHref,
      oldText: truncate(oldText || ""),
      newShortened,
      forceAnchorToText,
    });

    // Case 1: Force replace to plain text by rebuilding the parent's content
    if (forceAnchorToText && element instanceof HTMLAnchorElement) {
      const newHref = ensureHttpPrefixed(newShortened);
      if (element.href !== newHref) {
        element.href = newHref;
        element.textContent = newHref;
        return { changed: true };
      }
      return { changed: false };
    }

    // Case 2: <a> — update href when not forcing to text
    if (element instanceof HTMLAnchorElement) {
      const newHref = ensureHttpPrefixed(newShortened);
      if (element.href !== newHref) {
        element.href = newHref;
        return { changed: true };
      }
      return { changed: false };
    }

    const candidates = buildSearchCandidates(oldHref, oldText);

    // Case 3: Inputs/Textareas — replace inside value, keep surrounding text
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      const originalValue = element.value ?? "";
      const matched = candidates.filter(
        (c) => !!c && originalValue.includes(c),
      );
      const replaced = replaceAllVariants(
        originalValue,
        candidates,
        newShortened,
      );
      if (replaced !== originalValue) {
        element.value = replaced;
        logger.debug("[PIMMS] replaceLinkInElement:input-textarea:changed", {
          matched,
          before: truncate(originalValue),
          after: truncate(replaced),
        });
        return { changed: true };
      }
      logger.debug("[PIMMS] replaceLinkInElement:input-textarea:no-change", {
        matched,
        value: truncate(originalValue),
      });
      return { changed: false };
    }

    // Case 4: ContentEditable or generic elements — replace textContent
    const htmlEl = element as HTMLElement;
    const originalText = htmlEl.textContent ?? "";
    const matched = candidates.filter((c) => !!c && originalText.includes(c));
    const replacedText = replaceAllVariants(
      originalText,
      candidates,
      newShortened,
    );
    if (replacedText !== originalText) {
      htmlEl.textContent = replacedText;
      logger.debug("[PIMMS] replaceLinkInElement:generic:changed", {
        matched,
        beforeLen: originalText.length,
        afterLen: replacedText.length,
        before: truncate(originalText),
        after: truncate(replacedText),
      });
      return { changed: true };
    }
    logger.debug("[PIMMS] replaceLinkInElement:generic:no-change", {
      matched,
      text: truncate(originalText),
    });
    return { changed: false };
  } catch (error) {
    try {
      const el = params.element;
      const elementType =
        el instanceof HTMLAnchorElement
          ? "anchor"
          : el instanceof HTMLInputElement
            ? "input"
            : el instanceof HTMLTextAreaElement
              ? "textarea"
              : (el as HTMLElement).isContentEditable
                ? "contenteditable"
                : el.tagName.toLowerCase();
      logger.error("[PIMMS] replaceLinkInElement:error", {
        error,
        elementType,
        tag: el.tagName,
        oldHref: params.oldHref,
        oldText: truncate(params.oldText || ""),
        newShortened: params.newShortened,
      });
    } catch {}
    return { changed: false };
  }
}

export default replaceLinkInElement;
