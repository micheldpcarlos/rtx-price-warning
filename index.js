const proxyList = [
  "45.226.218.34:5678",
  "177.126.198.1:5678",
  "170.78.93.63:5678",
  "201.182.9.206:5678",
  "177.75.161.77:5678",
  "138.97.2.215:4145",
  "187.86.153.254:30660",
  "164.163.181.115:5678",
  "191.7.161.73:5678",
  "186.235.33.186:5678",
  "179.189.254.14:5678",
  "177.8.169.94:5678",
  "189.45.129.138:5678",
  "143.0.208.25:5678",
  "138.219.147.27:5678",
  "177.52.193.142:5678",
  "177.87.36.162:5678",
  "164.163.181.174:5678",
  "143.137.4.148:5678",
  "177.74.136.6:5678",
  "177.38.13.135:5678",
  "170.254.11.212:5678",
  "186.251.250.10:3629",
  "186.251.250.15:5678",
  "177.37.104.250:5678",
  "177.137.223.53:5678",
  "164.163.181.159:5678",
  "179.189.178.6:5678",
  "177.137.160.95:5678",
  "177.75.6.138:5678",
  "170.233.230.39:5678",
  "138.36.1.54:5678",
  "168.181.63.243:5678",
  "201.182.174.160:5678",
  "168.195.229.27:5678",
  "187.60.149.61:5678",
  "189.84.118.206:5678",
  "186.235.33.2:5678",
  "170.231.64.93:5678",
  "177.75.11.98:5678",
  "201.33.58.10:5678",
  "177.47.203.21:5678",
  "186.235.1.2:5678",
  "138.204.82.20:5678",
  "168.196.42.78:5678",
  "177.74.136.21:5678",
  "131.255.132.189:5678",
  "201.182.11.186:5678",
  "201.182.9.206:5678",
  "187.17.163.141:5678",
  "179.197.84.9:5678",
  "177.87.36.162:5678",
  "177.152.175.58:5678",
  "177.137.163.62:4145",
  "177.69.229.57:5678",
  "177.44.28.159:5678",
  "170.79.83.9:5678",
  "45.227.149.166:5678",
  "138.204.74.233:5678",
  "177.126.157.4:5678",
  "201.18.144.234:5678",
  "131.221.233.150:5678",
  "191.6.55.212:5678",
  "187.95.120.138:5678",
  "170.79.158.229:5678",
  "131.100.219.65:5678",
  "177.74.136.6:5678",
  "168.232.122.35:5678",
  "177.74.157.107:5678",
  "177.135.205.90:5678",
];

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
      "https://servicespub.prod.api.aws.grupokabum.com.br/catalog/v1/products?query={{SearchTerm}}&page_number=1&page_size=100&facet_filters=&sort=price&include=gift",
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
    seccondTitleSelector: ".MuiTypography-root.jss58.jss59.MuiTypography-h6",
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
const messagedItems = [];
const useHeadless = true;

// Puppeteer import constant
const puppeteer = require("puppeteer");

// Axios to get data directly from API
const axios = require("axios");

// Random userAgent to avoid detection
const randomUseragent = require("random-useragent");

// Telegram Bot constants
const TelegramBot = require("node-telegram-bot-api");
const token = "1903828310:AAH3IReLGtI9ndkeF41F84wuPvRmpOYBFaQ";
const bot = new TelegramBot(token);

// set random timout to avoid ddos block
function randomIntFromInterval(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// Async delay function
function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

// SEND INITIAL MESSAGE TO GROUP
const initialMessage =
  "<b>BOT STARTED</b>\n\n\n" +
  itensToCheck.reduce((prevVal, currVal) => {
    return (
      prevVal +
      `<b>${currVal.name}</b> ==> ${currVal.minToAlert.toLocaleString("pt-br", {
        style: "currency",
        currency: "BRL",
      })}\n\n`
    );
  }, "");

bot.sendMessage("-587267780", initialMessage, { parse_mode: "HTML" });

// Check Kabum prices for a give item and return an array with available products
async function checkKabum(item) {
  const url = config.kabum.listingAddress.replace(
    "{{SearchTerm}}",
    item.name.replace(" ", "+")
  );

  try {
    const products = [];
    await axios
      .get(url, { headers: { "User-Agent": randomUseragent.getRandom() } })
      .then((result) => {
        const filteredResult = result.data.data.filter(
          (product) =>
            product.attributes.title
              .toLowerCase()
              .includes(item.name.toLowerCase()) && product.attributes.available
        );

        filteredResult.forEach((product) => {
          const price = product.attributes.offer
            ? product.attributes.offer.price_with_discount
            : product.attributes.price;

          products.push({
            name: item.name,
            title: product.attributes.title,
            link: item.rootAddress + product.links.self,
            price: price.toLocaleString("pt-br", {
              style: "currency",
              currency: "BRL",
            }),
            numericPrice: price,
            shouldNotify: price <= item.minToAlert,
          });
        });
        console.log(`Processed ${item.name} - Kabum - Qtd: ${products.length}`);
      });

    return products;
  } catch (error) {
    console.log("ERROR WHILE PROCESSING KABUM => ", item, error);
  }
}

// Check Pichau prices for a give item and return an array with available products
async function checkPichau(item) {
  const proxyIndex = randomIntFromInterval(0, proxyList.length - 1);
  const browser = await puppeteer.launch({
    headless: useHeadless,
    args: [`--proxy-server=socks4://${proxyList[proxyIndex]}`],
  });

  try {
    const page = await browser.newPage();

    await page.setViewport({ width: 1600, height: 900 });

    const url = config.pichau.listingAddress.replace(
      "{{SearchTerm}}",
      item.name
    );

    // Set UserAgent to bypass Headless access protection
    await page.setUserAgent(randomUseragent.getRandom());

    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Wair a bit for rendering
    await page.waitForTimeout(1000);

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
            console.log(product);
            // Title
            const titleEl =
              product.querySelector(config.pichau.titleSelector) ||
              product.querySelector(config.pichau.seccondTitleSelector);

            const title = titleEl.innerHTML;

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
              name: item.name,
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

    const pages = await browser.pages();
    await Promise.all(pages.map((page) => page.close()));

    await browser.close();
    console.log(`Processed ${item.name} - Pichau - Qtd: ${result.length}`);

    return result;
  } catch (error) {
    const pages = await browser.pages();
    await Promise.all(pages.map((page) => page.close()));
    await browser.close();
    console.log("ERROR WHILE PROCESSING PICHAU => ", item, error);
  }
}

// Check Terabyte prices for a give item and return an array with available products
async function checkTerabyte(item) {
  const proxyIndex = randomIntFromInterval(0, proxyList.length - 1);
  const browser = await puppeteer.launch({
    headless: useHeadless,
    args: [`--proxy-server=socks4://${proxyList[proxyIndex]}`],
  });

  try {
    const page = await browser.newPage();

    await page.setViewport({ width: 1600, height: 900 });

    // Set UserAgent to bypass Headless access protection
    await page.setUserAgent(randomUseragent.getRandom());

    const url = config.terabyte.listingAddress.replace(
      "{{SearchTerm}}",
      item.name.replace(" ", "+")
    );

    // Set UserAgent to bypass Headless access protection
    await page.setUserAgent(randomUseragent.getRandom());

    await page.goto(url, {
      waitUntil: "domcontentloaded",
    });

    // Wair for the element
    await page.waitForSelector(config.terabyte.itemsSelector, {
      timeout: 30000,
    });

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
              name: item.name,
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

    const pages = await browser.pages();
    await Promise.all(pages.map((page) => page.close()));
    await browser.close();
    console.log(`Processed ${item.name} - Terabyte - Qtd: ${result.length}`);

    return result;
  } catch (error) {
    const pages = await browser.pages();
    await Promise.all(pages.map((page) => page.close()));
    await browser.close();
    console.log("ERROR WHILE PROCESSING TERABYTE => ", item, error);
  }
}

function sendNotifications(itemsToNotify, storeTitle) {
  console.log(`==== SENDING NOTIFICATIONS: ${storeTitle} ====`);
  // filter only if it is not notified yet (considering name and price)
  const filteredItems = itemsToNotify.filter(
    (item) =>
      !messagedItems.some(
        (messagedItem) =>
          messagedItem.title == item.title &&
          messagedItem.numericPrice == item.numericPrice
      )
  );

  filteredItems.forEach((item, index) => {
    const message = `🚨🚨 <b>ALERTA ${item.name}</b> 🚨🚨\n\n${item.title}\n\n\n➡️  <b>${item.price}</b>\n\n\n${item.link}`;

    // delay per message to avoid span filter when a lot of notifications to do
    setTimeout(() => {
      bot.sendMessage("-587267780", message, { parse_mode: "HTML" });
    }, index * 200 * index);
  });

  messagedItems.push(...filteredItems);
}

async function checkKabumPrices() {
  let resultData = [];

  itensToCheck.forEach((item) => {
    resultData.push(Object.assign({}, item));
  });

  const products = [];
  for (const [index, item] of resultData.entries()) {
    try {
      const terabytePrices = await checkKabum(item);
      products.push(...terabytePrices.filter((price) => price.shouldNotify));
    } catch {
      console.log("Unhandled Error Kabum");
    }
  }
  sendNotifications(products, "Kabum");

  // Fixed Timout - no problems with blockers
  const nextRoundTimeout = 60000;

  setTimeout(() => {
    checkKabumPrices();
  }, nextRoundTimeout);
}

async function checkTerabytePrices() {
  let resultData = [];

  itensToCheck.forEach((item) => {
    resultData.push(Object.assign({}, item));
  });

  const products = [];

  for (const [index, item] of resultData.entries()) {
    let errCounter = 0;
    let success = false;
    // Try different proxy while not success (5 times);
    while (!success && errCounter < 5) {
      try {
        await checkTerabyte(item).then((terabytePrices) => {
          products.push(
            ...terabytePrices.filter((price) => price.shouldNotify)
          );
          success = true;
        });
      } catch {
        if (errCounter < 5) {
          console.log(`Terabyte error getting ${item.name} trying again...`);
          errCounter++;
        } else {
          console.log(`Terabyte ${item.name} - all attempts failed`);
        }
      }
    }
  }

  sendNotifications(products, "Terabyte");

  // From 2 to 5 minutes
  const nextRoundTimeout = 60000;

  setTimeout(() => {
    checkTerabytePrices();
  }, nextRoundTimeout);
}

async function checkPichauPrices() {
  let resultData = [];

  itensToCheck.forEach((item) => {
    resultData.push(Object.assign({}, item));
  });

  const products = [];
  for (const [index, item] of resultData.entries()) {
    let errCounter = 0;
    let success = false;
    // Try different proxy while not success (5 times);
    while (!success && errCounter < 5) {
      try {
        await checkPichau(item).then((pichauPrices) => {
          products.push(...pichauPrices.filter((price) => price.shouldNotify));
          success = true;
        });
      } catch {
        if (errCounter < 5) {
          console.log(`Pichau error getting ${item.name} trying again...`);
          errCounter++;
        } else {
          console.log(`Pichau ${item.name} - all attempts failed`);
        }
      }
    }
  }
  sendNotifications(products, "Pichau");

  // Fixed Timout - no problems with blockers
  const nextRoundTimeout = 60000;

  setTimeout(() => {
    checkPichauPrices();
  }, nextRoundTimeout);
}

// Initial run
checkKabumPrices();
checkTerabytePrices();
checkPichauPrices();
