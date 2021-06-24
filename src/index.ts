import puppeteer from "puppeteer";
import * as net from "net";
import ipaddr from "ipaddr.js";

export interface RequestFilteringAgentOptions {
    // Allow to connect private IP address
    // This includes Private IP addresses and Reserved IP addresses.
    // https://en.wikipedia.org/wiki/Private_network
    // https://en.wikipedia.org/wiki/Reserved_IP_addresses
    // Example, http://127.0.0.1/, http://localhost/, https://169.254.169.254/
    // Default: false
    allowPrivateIPAddress?: boolean;
    // Allow to connect meta address 0.0.0.0
    // 0.0.0.0 (IPv4) and :: (IPv6) a meta address that routing another address
    // https://en.wikipedia.org/wiki/Reserved_IP_addresses
    // https://tools.ietf.org/html/rfc6890
    // Default: false
    allowMetaIPAddress?: boolean;
    // Allow address list
    // This values are preferred than denyAddressList
    // Default: []
    allowIPAddressList?: string[];
    // Deny address list
    // Default: []
    denyIPAddressList?: string[];
}

/**
 * validate the address that is matched the validation options
 * @param address ip address
 * @param host optional
 * @param family optional
 * @param options
 */
const validateIPAddress = ({ address }: { address: string }, options: Required<RequestFilteringAgentOptions>) => {
    // if it is not IP address, skip it
    if (net.isIP(address) === 0) {
        return;
    }
    try {
        const addr = ipaddr.parse(address);
        const range = addr.range();
        // prefer allowed list
        if (options.allowIPAddressList.length > 0 && options.allowIPAddressList.includes(address)) {
            return;
        }
        if (!options.allowMetaIPAddress) {
            // address === "0.0.0.0" || address == "::"
            if (range === "unspecified") {
                return new Error(`${address}  is not allowed. Because, It is meta IP address.`);
            }
        }
        // TODO: rename option name
        if (!options.allowPrivateIPAddress && range !== "unicast") {
            return new Error(`${address}  is not allowed. Because, It is private IP address.`);
        }

        if (options.denyIPAddressList.length > 0 && options.denyIPAddressList.includes(address)) {
            return new Error(`${address}  is not allowed. Because It is defined in denyIPAddressList.`);
        }
    } catch (error) {
        return error; // if can not parsed IP address, throw error
    }
    return;
};

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
    let shouldStop = false;
    try {
        const page = await browser.newPage();
        page.on("response", async (request) => {
            const isIP = validateIPAddress(
                {
                    address: request.remoteAddress().ip
                },
                {
                    allowMetaIPAddress: false,
                    allowPrivateIPAddress: false,
                    allowIPAddressList: [],
                    denyIPAddressList: []
                }
            );
            if (isIP) {
                shouldStop = true;
                await browser.close().catch((e) => console.error(e));
                console.log("STOP BROWSER!", isIP, request.remoteAddress());
            }
        });
        console.log("will go");
        await page.goto(url, { timeout: 40 * 1000, waitUntil: "domcontentloaded" });
        if (shouldStop) {
            return;
        }
        console.log("capture ");
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
    url: "https://g7fdb.csb.app/",
    outputPath: "example.png"
}).catch((error) => {
    console.error(error);
});
