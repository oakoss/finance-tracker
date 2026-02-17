'use client';

import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
} from 'react';

type ScrollspyProps = {
  children: ReactNode;
  targetRef?: RefObject<
    HTMLElement | HTMLDivElement | Document | null | undefined
  >;
  onUpdate?: (id: string) => void;
  offset?: number;
  smooth?: boolean;
  className?: string;
  dataAttribute?: string;
  history?: boolean;
  throttleTime?: number;
};

export function Scrollspy({
  children,
  targetRef,
  onUpdate,
  className,
  offset = 0,
  smooth = true,
  dataAttribute = 'scrollspy',
  history = true,
}: ScrollspyProps) {
  const selfRef = useRef<HTMLDivElement | null>(null);
  const anchorElementsRef = useRef<Element[] | null>(null);
  const prevIdTrackerRef = useRef<string | null>(null);

  // Sets active nav, hash, prevIdTracker, and calls onUpdate
  const setActiveSection = useCallback(
    (sectionId: string | null, force = false) => {
      if (!sectionId) return;
      const anchors = anchorElementsRef.current ?? [];
      for (const item of anchors) {
        const id = item.getAttribute(`data-${dataAttribute}-anchor`);
        if (id === sectionId) {
          (item as HTMLElement).dataset.active = 'true';
        } else {
          delete (item as HTMLElement).dataset.active;
        }
      }
      if (onUpdate) onUpdate(sectionId);
      if (history && (force || prevIdTrackerRef.current !== sectionId)) {
        globalThis.history.replaceState({}, '', `#${sectionId}`);
      }
      prevIdTrackerRef.current = sectionId;
    },
    [dataAttribute, history, onUpdate],
  );

  const handleScroll = useCallback(() => {
    if (!anchorElementsRef.current || anchorElementsRef.current.length === 0)
      return;

    let scrollElement =
      targetRef?.current === document
        ? document.documentElement
        : (targetRef?.current as HTMLElement);

    if (!scrollElement) return;

    // If the scrollElement has a data-slot="scroll-area-viewport" inside, use that
    const viewport = scrollElement.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    if (viewport instanceof HTMLElement) {
      scrollElement = viewport;
    }

    const globalWindow = globalThis as unknown as Window;
    const scrollTop =
      scrollElement === document.documentElement
        ? (globalWindow.scrollY ?? document.documentElement.scrollTop)
        : scrollElement.scrollTop;

    // Find the anchor whose section is closest to but not past the top
    let activeIdx = 0;
    let minDelta = Infinity;

    for (const [idx, anchor] of anchorElementsRef.current.entries()) {
      const sectionId = anchor.getAttribute(`data-${dataAttribute}-anchor`);
      const sectionElement = document.querySelector<HTMLElement>(
        `#${CSS.escape(sectionId ?? '')}`,
      );
      if (!sectionElement) continue;

      let customOffset = offset;
      const dataOffset = anchor.getAttribute(`data-${dataAttribute}-offset`);
      if (dataOffset) customOffset = Number.parseInt(dataOffset, 10);

      const delta = Math.abs(
        sectionElement.offsetTop - customOffset - scrollTop,
      );

      if (
        sectionElement.offsetTop - customOffset <= scrollTop &&
        delta < minDelta
      ) {
        minDelta = delta;
        activeIdx = idx;
      }
    }

    // If at bottom, force last anchor
    const scrollHeight = scrollElement.scrollHeight;
    const clientHeight = scrollElement.clientHeight;

    if (scrollTop + clientHeight >= scrollHeight - 2) {
      activeIdx = anchorElementsRef.current.length - 1;
    }

    // Set only one anchor active and sync the URL hash
    const activeAnchor = anchorElementsRef.current[activeIdx];
    const sectionId =
      activeAnchor?.getAttribute(`data-${dataAttribute}-anchor`) ?? null;

    setActiveSection(sectionId);
  }, [targetRef, dataAttribute, offset, setActiveSection]);

  const scrollTo = useCallback(
    (anchorElement: HTMLElement) => (event?: Event) => {
      if (event) event.preventDefault();
      const sectionId =
        anchorElement
          .getAttribute(`data-${dataAttribute}-anchor`)
          ?.replace('#', '') ?? null;
      if (!sectionId) return;
      const sectionElement = document.querySelector<HTMLElement>(
        `#${CSS.escape(sectionId)}`,
      );
      if (!sectionElement) return;

      const globalWindow = globalThis as unknown as Window;
      let scrollToElement: HTMLElement | Window | null =
        targetRef?.current === document
          ? globalWindow
          : (targetRef?.current as HTMLElement);

      if (scrollToElement instanceof HTMLElement) {
        const viewport = scrollToElement.querySelector(
          '[data-slot="scroll-area-viewport"]',
        );
        if (viewport instanceof HTMLElement) {
          scrollToElement = viewport;
        }
      }

      let customOffset = offset;
      const dataOffset = anchorElement.getAttribute(
        `data-${dataAttribute}-offset`,
      );
      if (dataOffset) {
        customOffset = Number.parseInt(dataOffset, 10);
      }

      const scrollTop = sectionElement.offsetTop - customOffset;

      if (scrollToElement && 'scrollTo' in scrollToElement) {
        scrollToElement.scrollTo({
          behavior: smooth ? 'smooth' : 'auto',
          left: 0,
          top: scrollTop,
        });
      }
      setActiveSection(sectionId, true);
    },
    [dataAttribute, offset, smooth, targetRef, setActiveSection],
  );

  // Scroll to the section if the ID is present in the URL hash
  const scrollToHashSection = useCallback(() => {
    const hash = CSS.escape(globalThis.location.hash.replace('#', ''));

    if (hash) {
      const targetElement = document.querySelector(
        `[data-${dataAttribute}-anchor="${hash}"]`,
      );
      if (targetElement instanceof HTMLElement) {
        scrollTo(targetElement)();
      }
    }
  }, [dataAttribute, scrollTo]);

  useEffect(() => {
    // Query elements and store them in the ref, avoiding unnecessary re-renders
    if (selfRef.current) {
      anchorElementsRef.current = [
        ...selfRef.current.querySelectorAll(`[data-${dataAttribute}-anchor]`),
      ];
    }

    const handleAnchorClick = (event: Event) => {
      if (!(event.target instanceof HTMLElement)) return;
      const anchor = event.target.closest(`[data-${dataAttribute}-anchor]`);
      if (!anchor || !(anchor instanceof HTMLElement)) return;
      scrollTo(anchor)(event);
    };

    selfRef.current?.addEventListener('click', handleAnchorClick);

    const onScroll = (event: Event) => {
      const scrollElement =
        targetRef?.current === document
          ? globalThis
          : (targetRef?.current as HTMLElement);
      if (!scrollElement) return;

      if (
        scrollElement === globalThis ||
        (scrollElement instanceof HTMLElement &&
          scrollElement.contains(event.target as Node))
      ) {
        handleScroll();
      }
    };

    // Use window listener with capture to catch scroll events from targetRef even if set later
    window.addEventListener('scroll', onScroll, true);

    // Check if there's a hash in the URL and scroll to the corresponding section
    const initialTimeout = setTimeout(() => {
      scrollToHashSection();
      handleScroll();
    }, 100);

    return () => {
      window.removeEventListener('scroll', onScroll, true);
      selfRef.current?.removeEventListener('click', handleAnchorClick);
      clearTimeout(initialTimeout);
    };
  }, [targetRef, handleScroll, dataAttribute, scrollTo, scrollToHashSection]);

  return (
    <div ref={selfRef} className={className} data-slot="scrollspy">
      {children}
    </div>
  );
}
