/**
 * Main logic for modifying the TCU StWeb page.
 */

async function init() {
    if (window === window.top) {
        console.log('TCU StWeb Extension: Main Page Loaded');

        const isStmain = location.pathname.includes('Stmain.php');

        // Fix Navbar Link (Task Requirement 1) - Polling Retry
        const fixNavbar = setInterval(() => {
            const navLinkEl = Utils.getElementByXPath('/html/body/div[1]/nav/a');
            if (navLinkEl) {
                navLinkEl.href = 'https://admin.tcu.edu.tw/TCUstweb/Stmain.php';
                clearInterval(fixNavbar);
            }
        }, 200);
        // Stop polling after 5 seconds
        setTimeout(() => clearInterval(fixNavbar), 5000);

        const isCleanUrl = location.search === '';

        if (isStmain) {
            // Task 2 (Pinning Manager & Floating UI)
            // Note: PinningManager handles its own strict check for the *rendering* of the button container,
            // but the Floating UI will appear always.
            try {
                await handleTask2();
            } catch (e) {
                console.error('Task 2 failed:', e);
            }

            // Task 1: Replacement of Form Table
            // STRICT: Only on clean URL
            if (isCleanUrl) {
                try {
                    await handleTask1();
                } catch (e) {
                    console.error('Task 1 failed:', e);
                }
            }
        }
    }
}

// execute
init();
