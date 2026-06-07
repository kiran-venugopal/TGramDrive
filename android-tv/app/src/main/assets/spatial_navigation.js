(function() {
    if (window.spatialNavInitialized) return;
    window.spatialNavInitialized = true;

    console.log("Spatial Navigation Initialized");

    // Add a stylesheet for focused items on the TV screen
    const style = document.createElement('style');
    style.innerHTML = `
        /* TV Focus Indicator */
        *:focus, .tv-focused {
            outline: 4px solid #368bf9 !important;
            outline-offset: 2px !important;
            box-shadow: 0 0 15px rgba(54, 139, 249, 0.8) !important;
            transform: scale(1.02) !important;
            transition: transform 0.15s ease, box-shadow 0.15s ease, outline 0.15s ease !important;
            z-index: 9999 !important;
        }
    `;
    document.head.appendChild(style);

    // List of CSS selectors for focusable elements
    const FOCUSABLE_SELECTORS = [
        'a', 'button', 'input', 'select', 'textarea', 
        '[tabindex="0"]', '.cursor-pointer', '[onclick]', 
        'div[role="button"]', 'li[role="menuitem"]',
        'td > a', '.file-card'
    ];

    function getFocusableElements() {
        const elements = [];
        FOCUSABLE_SELECTORS.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                // Ignore elements that are hidden or disabled
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                if (rect.width > 0 && rect.height > 0 && 
                    style.visibility !== 'hidden' && 
                    style.display !== 'none' && 
                    !el.disabled) {
                    
                    // Set tabindex so the browser treats it as focusable
                    if (!el.hasAttribute('tabindex')) {
                        el.setAttribute('tabindex', '0');
                    }
                    elements.push(el);
                }
            });
        });
        return elements;
    }

    // Helper to calculate distance between two elements in a given direction
    function getDistance(fromRect, toRect, direction) {
        const fromCenterX = fromRect.left + fromRect.width / 2;
        const fromCenterY = fromRect.top + fromRect.height / 2;
        const toCenterX = toRect.left + toRect.width / 2;
        const toCenterY = toRect.top + toRect.height / 2;

        const dx = toCenterX - fromCenterX;
        const dy = toCenterY - fromCenterY;

        // Check if the candidate is in the correct direction
        if (direction === 'left' && dx >= 0) return Infinity;
        if (direction === 'right' && dx <= 0) return Infinity;
        if (direction === 'up' && dy >= 0) return Infinity;
        if (direction === 'down' && dy <= 0) return Infinity;

        // Distance formula: prioritize the primary direction of travel
        // e.g. if moving left/right, penalize vertical deviation (dy) more, and vice versa.
        if (direction === 'left' || direction === 'right') {
            return Math.abs(dx) + Math.abs(dy) * 2.5;
        } else {
            return Math.abs(dy) + Math.abs(dx) * 2.5;
        }
    }

    function navigate(direction) {
        const elements = getFocusableElements();
        let activeEl = document.activeElement;

        // If no element is currently focused, or the active element is the body, focus the first available element
        if (!activeEl || activeEl === document.body || !elements.includes(activeEl)) {
            if (elements.length > 0) {
                elements[0].focus();
                elements[0].scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
            }
            return;
        }

        const activeRect = activeEl.getBoundingClientRect();
        let closestEl = null;
        let minDistance = Infinity;

        elements.forEach(el => {
            if (el === activeEl) return;
            const rect = el.getBoundingClientRect();
            const dist = getDistance(activeRect, rect, direction);
            if (dist < minDistance) {
                minDistance = dist;
                closestEl = el;
            }
        });

        if (closestEl) {
            closestEl.focus();
            closestEl.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
        }
    }

    // Intercept keyboard arrow keys and Enter
    window.addEventListener('keydown', function(e) {
        let handled = false;
        
        switch (e.key) {
            case 'ArrowUp':
                navigate('up');
                handled = true;
                break;
            case 'ArrowDown':
                navigate('down');
                handled = true;
                break;
            case 'ArrowLeft':
                navigate('left');
                handled = true;
                break;
            case 'ArrowRight':
                navigate('right');
                handled = true;
                break;
            case 'Enter':
                // Click the currently focused element
                const activeEl = document.activeElement;
                if (activeEl && activeEl !== document.body) {
                    activeEl.click();
                    handled = true;
                }
                break;
        }

        if (handled) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    // Watch for DOM changes to automatically update tabindex
    const observer = new MutationObserver(() => {
        getFocusableElements();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial run to make existing items focusable
    setTimeout(getFocusableElements, 1000);
})();
