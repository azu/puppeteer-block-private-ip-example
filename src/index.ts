import puppeteer from "puppeteer";
import { validatePublicIpAddress } from "./validatePublicIpAddress";

async function main({ url, outputPath }: { url: string; outputPath: string }) {
    const args = ["--no-sandbox", "--disable-setuid-sandbox"];
    const DEFAULT_VIEWPORT = {
        width: 800,
        height: 600
    };
    const browser = await puppeteer.launch({
        executablePath: process.env.CHROME_BIN,
        args,
        defaultViewport: DEFAULT_VIEWPORT,
        headless: true
    });
    let shouldStopScreenshot = false;
    try {
        const page = await browser.newPage();
        page.on("response", async (request) => {
            console.log("response url", request.url());
            // if the response is for private ip, close the connection asap
            const validateResult = validatePublicIpAddress(request.remoteAddress().ip);
            if (validateResult) {
                shouldStopScreenshot = true;
                await browser.close().catch((e) => console.error(e));
                console.error(validateResult);
            }
        });
        console.log("will go");
        await page.goto(url, { timeout: 40 * 1000, waitUntil: "domcontentloaded" });
        if (shouldStopScreenshot) {
            return;
        }
        console.log("capture it");
        const scrollHeight = await page.evaluate((_) => {
            return document.documentElement.scrollHeight;
        });
        const height = DEFAULT_VIEWPORT.height > scrollHeight ? DEFAULT_VIEWPORT.height : Math.trunc(scrollHeight);
        await page.setViewport(Object.assign({}, DEFAULT_VIEWPORT, { height }));
        await page.screenshot({ path: outputPath });
    } finally {
        if (browser.isConnected()) {
            await browser.close().catch((e) => console.error(e));
        }
    }
}

main({
    url: "http://localhost:8080/",
    outputPath: "example.png"
}).catch((error) => {
    console.error(error);
});
