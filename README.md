# puppeteer-block-private-ip-example

A puppeteer example that block request to private ip like http://metadata

It is hard that block request on puppeteer.
Instead of it, block the response that is request for private ip address.

- [Cooperative request intercepts by benallfree · Pull Request #6735 · puppeteer/puppeteer](https://github.com/puppeteer/puppeteer/pull/6735)
- [Support response interception · Issue #1191 · puppeteer/puppeteer](https://github.com/puppeteer/puppeteer/issues/1191)
- [How to modify a response · Issue #599 · puppeteer/puppeteer](https://github.com/puppeteer/puppeteer/issues/599)

:warning: Warning :warning:

This approach can not prevent to request for internal ip address.
It is means that it can not prevent to POST request to internal.

You should use it with another mitigation if you use this approach.

## Usage

```ts
import puppeteer from "puppeteer";
import { validatePublicIpAddress } from "./validatePublicIpAddress";

async function main({ url, outputPath }: { url: string; outputPath: string }) {
    const args = ["--no-sandbox", "--disable-setuid-sandbox"];
    const browser = await puppeteer.launch({
        executablePath: process.env.CHROME_BIN,
        args,
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
```

## Changelog

See [Releases page](https://github.com/azu/puppeteer-block-private-ip-example/releases).

## Running tests

Install devDependencies and Run `npm test`:

    npm test

## Contributing

Pull requests and stars are always welcome.

For bugs and feature requests, [please create an issue](https://github.com/azu/puppeteer-block-private-ip-example/issues).

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## Author

- azu: [GitHub](https://github.com/azu), [Twitter](https://twitter.com/azu_re)

## License

MIT © azu
