const itensToCheck = [
  {
    name: "RTX 3060",
    minToAlert: 3500,
  },
  {
    name: "RTX 3060 Ti",
    minToAlert: 4600,
  },
  {
    name: "RTX 3070",
    minToAlert: 5000,
  },
  {
    name: "RTX 3070 Ti",
    minToAlert: 5850,
  },
];

const config = {
  kabum: {
    rootAddress: "www.kabum.com.br",
    listingAddress:
      "https://www.kabum.com.br/cgi-local/site/listagem/listagem.cgi?string={{SearchTerm}}&btnG=&pagina=1&ordem=3&limite=100&prime=false&marcas=[]&tipo_produto=[]&filtro=[]",
    itemsSelector: ".eITELq",
    titleLinkSelector: ".item-nome",
    priceSelector: ".qatGF",
  },
  pichau: {
    rootAddress: "www.pichau.com.br",
    listingAddress:
      "https://www.pichau.com.br/search?q={{SearchTerm}}&sort=price-asc",
    itemsSelector:
      ".MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-12.MuiGrid-grid-sm-6.MuiGrid-grid-md-4.MuiGrid-grid-lg-3.MuiGrid-grid-xl-2",
    titleSelector: ".MuiTypography-root.jss63.jss64.MuiTypography-h6",
    priceSelector: ".jss66",
  },
  terabyte: {
    rootAddress: "www.terabyteshop.com.br",
    listingAddress: "https://www.terabyteshop.com.br/busca?str={{SearchTerm}}",
    itemsSelector: ".pbox",
    titleLinkSelector: ".prod-name",
    priceSelector: ".prod-new-price > span",
  },
};

const puppeteer = require("puppeteer");

async function checkKabum(item) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const url = config.kabum.listingAddress.replace(
    "{{SearchTerm}}",
    item.name.replace(" ", "+")
  );
  await page.goto(url, { waitUntil: "domcontentloaded" });

  const result = await page.evaluate(
    (config, item) => {
      // Get all products
      const products = [
        ...document.querySelectorAll(config.kabum.itemsSelector),
      ]
        // filter by only products enabled to buy
        .filter((productEl) => !productEl.innerHTML.includes("comprar_off"))
        // filter by only containing the name (To avoid listing non Ti when searching Ti)
        .filter((productEl) =>
          productEl.innerHTML.toLowerCase().includes(item.name.toLowerCase())
        )
        // Map to a serializable value to return to evaluate method
        .map((product) => {
          // Title and Link
          const titleLink = product.querySelector(
            config.kabum.titleLinkSelector
          );
          const link = titleLink.getAttribute("href");
          const title = titleLink.textContent;

          //Price and numericPrice
          const price = product.querySelector(
            config.kabum.priceSelector
          ).textContent;

          const numericPrice = Number(
            price.replace("R$", "").replace(",", ".").replace(".", "").trim()
          );

          return {
            title: title,
            link: config.kabum.rootAddress + link,
            price: price,
            numericPrice: numericPrice,
            shouldNotify: numericPrice <= item.minToAlert,
          };
        });
      return products;
    },
    config,
    item
  );

  // TODO: ALERT IF PRICE IS GOOD
  // result.forEach((res) => {
  //   console.log(res);
  // });

  await browser.close();
  return result;
}

async function checkPichau(item) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const url = config.pichau.listingAddress.replace("{{SearchTerm}}", item.name);
  await page.goto(url, { waitUntil: "domcontentloaded" });

  const result = await page.evaluate(
    (config, item) => {
      // Get all products
      const products = [
        ...document.querySelectorAll(config.pichau.itemsSelector),
      ]
        // filter by only products enabled to buy
        .filter((productEl) => !productEl.innerHTML.includes("Esgotado"))
        // filter by only containing the name (To avoid listing non Ti when searching Ti)
        .filter((productEl) =>
          productEl.innerHTML.toLowerCase().includes(item.name.toLowerCase())
        )
        // Map to a serializable value to return to evaluate method
        .map((product) => {
          // Title
          const title = product.querySelector(
            config.pichau.titleSelector
          ).textContent;

          // Link
          const link = product.firstChild.getAttribute("href");

          //Price and numericPrice
          const price = product.querySelector(
            config.pichau.priceSelector
          ).textContent;

          const numericPrice = Number(
            price.replace("R$", "").replace(",", ".").replace(".", "").trim()
          );

          return {
            title: title,
            link: config.pichau.rootAddress + link,
            price: price,
            numericPrice: numericPrice,
            shouldNotify: numericPrice <= item.minToAlert,
          };
        });
      return products;
    },
    config,
    item
  );

  // TODO: ALERT IF PRICE IS GOOD
  // result.forEach((res) => {
  //   console.log(res);
  // });

  await browser.close();
  return result;
}

async function checkTerabyte(item) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const url = config.terabyte.listingAddress.replace(
    "{{SearchTerm}}",
    item.name.replace(" ", "+")
  );
  // Set UserAgent to bypass Headless access protection
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36"
  );
  await page.goto(url, { waitUntil: "domcontentloaded" });

  const result = await page.evaluate(
    (config, item) => {
      // Get all products
      const products = [
        ...document.querySelectorAll(config.terabyte.itemsSelector),
      ]
        // filter by only products enabled to buy
        .filter((productEl) => !productEl.innerHTML.includes("tbt_avise"))
        // filter by only containing the name (To avoid listing non Ti when searching Ti)
        .filter((productEl) =>
          productEl.innerHTML.toLowerCase().includes(item.name.toLowerCase())
        )
        // Map to a serializable value to return to evaluate method
        .map((product) => {
          // Title and Link
          const titleLink = product.querySelector(
            config.terabyte.titleLinkSelector
          );
          const link = titleLink.getAttribute("href");
          const title = titleLink.textContent;

          //Price and numericPrice
          const price = product.querySelector(
            config.terabyte.priceSelector
          ).textContent;

          const numericPrice = Number(
            price.replace("R$", "").replace(",", ".").replace(".", "").trim()
          );

          return {
            title: title,
            link: link,
            price: price,
            numericPrice: numericPrice,
            shouldNotify: numericPrice <= item.minToAlert,
          };
        });
      return products;
    },
    config,
    item
  );

  // TODO: ALERT IF PRICE IS GOOD
  // result.forEach((res) => {
  //   console.log(res);
  // });

  await browser.close();

  return result;
}

(async () => {
  for (const item of itensToCheck) {
    console.log(
      " ===========================  " + item.name + "  ======================"
    );

    const kabumPrices = checkKabum(item);
    const pichauPrices = checkPichau(item);
    const terabytePrices = checkTerabyte(item);

    await Promise.all([kabumPrices, pichauPrices, terabytePrices]);
  }
})();
