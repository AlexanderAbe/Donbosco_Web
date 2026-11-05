(() => {
    const stickyElements = [...document.querySelectorAll('[data-scroll-sticky]')];
    if (!stickyElements.length) return;

    let previousScrollY = window.scrollY;
    let scrollUpdateScheduled = false;
    let ignoreScrollUntil = 0;
    let scrollBaselineTimer;
    const scrollStates = new Map(stickyElements.map(element => [
        element,
        { direction: 0, distance: 0, pendingDirectionDelta: 0 }
    ]));

    const resetState = (element, state) => {
        element.classList.remove('is-scroll-collapsed');
        state.direction = 0;
        state.distance = 0;
        state.pendingDirectionDelta = 0;
    };

    const setCollapsed = (element, state, collapsed) => {
        element.classList.toggle('is-scroll-collapsed', collapsed);
        state.direction = 0;
        state.distance = 0;
        state.pendingDirectionDelta = 0;
        ignoreScrollUntil = performance.now() + 400;
        previousScrollY = window.scrollY;
        window.clearTimeout(scrollBaselineTimer);
        scrollBaselineTimer = window.setTimeout(() => {
            previousScrollY = window.scrollY;
        }, 400);
    };

    window.addEventListener('scroll', () => {
        if (scrollUpdateScheduled) return;
        scrollUpdateScheduled = true;
        window.requestAnimationFrame(() => {
            const currentScrollY = window.scrollY;
            if (performance.now() < ignoreScrollUntil) {
                previousScrollY = currentScrollY;
                stickyElements.forEach(element => {
                    const state = scrollStates.get(element);
                    if (state) {
                        state.direction = 0;
                        state.distance = 0;
                        state.pendingDirectionDelta = 0;
                    }
                });
                scrollUpdateScheduled = false;
                return;
            }

            const scrollDelta = currentScrollY - previousScrollY;
            const currentDirection = Math.sign(scrollDelta);

            stickyElements.forEach(element => {
                const state = scrollStates.get(element);
                if (!state) return;

                if ((currentScrollY <= 120 && currentDirection <= 0)
                    || element.contains(document.activeElement)) {
                    resetState(element, state);
                    return;
                }
                if (!currentDirection) return;

                if (!state.direction) {
                    state.direction = currentDirection;
                }

                if (currentDirection === state.direction) {
                    state.pendingDirectionDelta = 0;
                    state.distance += Math.abs(scrollDelta);
                } else {
                    state.pendingDirectionDelta += Math.abs(scrollDelta);
                    if (state.pendingDirectionDelta < 48) return;
                    state.direction = currentDirection;
                    state.distance = state.pendingDirectionDelta;
                    state.pendingDirectionDelta = 0;
                }

                if (state.direction > 0 && !element.classList.contains('is-scroll-collapsed')
                    && state.distance >= 96) {
                    setCollapsed(element, state, true);
                } else if (state.direction < 0 && element.classList.contains('is-scroll-collapsed')
                    && state.distance >= 96) {
                    setCollapsed(element, state, false);
                }
            });

            previousScrollY = currentScrollY;
            scrollUpdateScheduled = false;
        });
    }, { passive: true });

    stickyElements.forEach(element => {
        element.addEventListener('focusin', () => {
            const state = scrollStates.get(element);
            if (state) {
                resetState(element, state);
                ignoreScrollUntil = performance.now() + 400;
                previousScrollY = window.scrollY;
            }
        });
    });
})();
