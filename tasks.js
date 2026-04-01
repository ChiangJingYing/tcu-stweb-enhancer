async function handleTask1() {
    const parentXPath = '/html/body/form/div[3]/div[2]/div[2]/div';
    const parentElement = Utils.getElementByXPath(parentXPath);

    let targetElement = null;
    if (parentElement && parentElement.children.length >= 3) {
        // Task 1 is 3rd to last (倒數第3個)
        targetElement = parentElement.children[parentElement.children.length - 3];
    }

    if (!targetElement) {
        console.warn('Task 1: Target element not found (Parent or 3rd to last child missing)');
        return;
    }

    // Calculate dates for current month (Taiwan Year)
    const now = new Date();
    const rocYear = now.getFullYear() - 1911;
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const paramStart = `${rocYear}${month}01`;
    const paramEnd = `${rocYear}${month+1}32`;

    const url = 'https://admin.tcu.edu.tw/TCUstweb/acc/stMscQry.php?&nPg=';
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

        const sourceXPath = '/html/body/form/div/div/div[2]/div[2]/table';
        const sourceElement = Utils.getElementByXPath(sourceXPath, sourceDoc);

        if (sourceElement) {
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    // iframe.style.height = '500px';

    const iframeHTML = `
    <html>
    <head>
        <base href="${url}">
        <style>
            table {
                border-collapse: collapse;
                margin: 0 auto; /* 表格本身置中 */
                font-size: 80%;
            }
            th, td {
                text-align: center; /* 內容置中 */
                vertical-align: middle;
            }
        </style>
    </head>
    <body>
        ${sourceElement.outerHTML}
    </body>
    </html>
`;

    iframe.srcdoc = iframeHTML;

    targetElement.innerHTML = '';
    targetElement.appendChild(iframe);

    console.log('Task 1: Success (iframe)');
}
    } catch (e) {
        console.error('Task 1 Error:', e);
    }
}

async function handleTask2() {
    // Delegate to Manager
    await PinningManager.init();
}
