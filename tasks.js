async function handleTask1() {
    const targetXPath = '/html/body/div/form/div[3]/div[2]/div[2]/div/div[2]';
    const targetElement = Utils.getElementByXPath(targetXPath);

    if (!targetElement) {
        console.warn('Task 1: Target element not found:', targetXPath);
        return;
    }

    // Calculate dates for current month (Taiwan Year)
    const now = new Date();
    const rocYear = now.getFullYear() - 1911;
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const paramStart = `${rocYear}${month}01`;
    const paramEnd = `${rocYear}${month}32`;

    const url = 'https://admin.tcu.edu.tw/TCUstweb/acc/stMscQry.php';
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `fmAplyDay1=&fmAplyDay2=&fmPayDay1=${paramStart}&fmPayDay2=${paramEnd}&OpType=Qry&Op=`
    };

    try {
        const htmlContent = await Utils.fetchContent(url, options);
        const sourceDoc = Utils.parseHTML(htmlContent);

        const sourceXPath = '/html/body/div/form/table/tbody/tr[3]/td/table';
        const sourceElement = Utils.getElementByXPath(sourceXPath, sourceDoc);

        if (sourceElement) {
            const importedNode = document.importNode(sourceElement, true);
            targetElement.innerHTML = '';
            targetElement.appendChild(importedNode);
            targetElement.replaceWith(importedNode);
            console.log('Task 1: Success');
        } else {
            console.warn('Task 1: Source element not found in response');
        }
    } catch (e) {
        console.error('Task 1 Error:', e);
    }
}

async function handleTask2() {
    // Delegate to Manager
    await PinningManager.init();
}
