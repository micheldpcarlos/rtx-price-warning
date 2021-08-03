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
const useHeadless = false;

// Puppeteer import constant
const puppeteer = require("puppeteer-extra");

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

// Add adblocker plugin, which will transparently block ads in all pages you
// create using puppeteer.
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

// Axios to get data directly from API
const axios = require("axios");

// Random userAgent to avoid detection
const randomUseragent = require("random-useragent");

// Telegram Bot constants
const TelegramBot = require("node-telegram-bot-api");
const token = "1903828310:AAH3IReLGtI9ndkeF41F84wuPvRmpOYBFaQ";
const bot = new TelegramBot(token, { polling: true });

// LET ME LISTEN ALL BROWSERS
process.setMaxListeners(Infinity);

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

// Set telegram bot listener
bot.on("message", (msg) => {
  if (msg.text.toLowerCase() == "@RtxPriceBot pricebase".toLowerCase()) {
    const chatId = msg.chat.id;

    const message = itensToCheck.reduce((prevVal, currVal) => {
      return (
        prevVal +
        `<b>${currVal.name}</b> ==> ${currVal.minToAlert.toLocaleString(
          "pt-br",
          { style: "currency", currency: "BRL" }
        )}\n\n`
      );
    }, "");

    bot.sendMessage(chatId, message, { parse_mode: "HTML" });
  }
});

// Async delay function
function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

// Check Kabum prices for a give item and return an array with available products
async function checkKabum(item) {
  console.log("Processing Kabum", item);

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
        console.log("Processed Kabum", products.length);
      });

    return products;
  } catch (error) {
    console.log("ERROR WHILE PROCESSING KABUM => ", item, error);
  }
}

// Check Pichau prices for a give item and return an array with available products
async function checkPichau(item) {
  console.log("Processing Pichau", item);
  const browser = await puppeteer.launch({ headless: useHeadless });

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

    await browser.close();
    console.log("Processed Pichau", result.length);

    return result;
  } catch (error) {
    await browser.close();
    console.log("ERROR WHILE PROCESSING PICHAU => ", item, error);
  }
}

// Check Terabyte prices for a give item and return an array with available products
async function checkTerabyte(item) {
  console.log("Processing Terabyte", item);
  const browser = await puppeteer.launch({ headless: useHeadless });

  try {
    const page = await browser.newPage();

    await page.setViewport({ width: 1600, height: 900 });

    const url = config.terabyte.listingAddress.replace(
      "{{SearchTerm}}",
      item.name.replace(" ", "+")
    );

    // Set UserAgent to bypass Headless access protection
    await page.setUserAgent(randomUseragent.getRandom());

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

            console.log(product.innerHTML);

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

    await browser.close();

    console.log("Processed Terabyte", result.length);
    return result;
  } catch (error) {
    await browser.close();
    console.log("ERROR WHILE PROCESSING TERABYTE => ", item, error);
  }
}

function sendNotifications(itemsToNotify) {
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

// Start Async function
async function checkPrices() {
  let resultData = [];

  itensToCheck.forEach((item) => {
    resultData.push(Object.assign({}, item));
  });

  const pricesToNotify = [];

  // Price getters loop
  for (const [index, item] of resultData.entries()) {
    const kabumPrices = checkKabum(item);
    const pichauPrices = checkPichau(item);
    const terabytePrices = checkTerabyte(item);

    await Promise.all([kabumPrices, pichauPrices, terabytePrices]).then(
      async () => {
        resultData[index].kabum = await kabumPrices;
        resultData[index].pichau = await pichauPrices;
        resultData[index].terabyte = await terabytePrices;
      }
    );
  }

  // Check and notify loop
  resultData.forEach((item) => {
    const { kabum, pichau, terabyte } = item;

    kabum &&
      pricesToNotify.push(...kabum.filter((price) => price.shouldNotify));
    pichau &&
      pricesToNotify.push(...pichau.filter((price) => price.shouldNotify));
    terabyte &&
      pricesToNotify.push(...terabyte.filter((price) => price.shouldNotify));
  });

  console.log("=> HANDLE NOTIFICATIONS");
  sendNotifications(pricesToNotify);
}

// Initial run
checkPrices();

// Since it takes about 15sec to run, we run it every minute
// without tracking if it finished the first one
setInterval(() => {
  checkPrices();
}, 60000);
