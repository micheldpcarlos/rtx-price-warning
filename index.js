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

const messagedItems = [];

// Puppeteer import constant
const puppeteer = require("puppeteer");

// Telegram Bot constants
const TelegramBot = require("node-telegram-bot-api");
const token = "1903828310:AAH3IReLGtI9ndkeF41F84wuPvRmpOYBFaQ";
const bot = new TelegramBot(token, { polling: true });

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

// Check Kabum prices for a give item and return an array with available products
async function checkKabum(item) {
  console.log("Processing Kabum", item);
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();

    const url = config.kabum.listingAddress.replace(
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
              name: item.name,
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

    await browser.close();

    console.log("Processed Kabum", result.length + 1);
    return result;
  } catch (error) {
    await browser.close();
    console.log("ERROR WHILE PROCESSING KABUM => ", item, error);
  }
}

// Check Pichau prices for a give item and return an array with available products
async function checkPichau(item) {
  console.log("Processing Pichau", item);
  const browser = await puppeteer.launch({ headless: true });

  try {
    const page = await browser.newPage();

    const url = config.pichau.listingAddress.replace(
      "{{SearchTerm}}",
      item.name
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
    console.log("Processed Pichau", result.length + 1);

    return result;
  } catch (error) {
    await browser.close();
    console.log("ERROR WHILE PROCESSING PICHAU => ", item, error);
  }
}

// Check Terabyte prices for a give item and return an array with available products
async function checkTerabyte(item) {
  console.log("Processing Terabyte", item);
  const browser = await puppeteer.launch({ headless: true });

  try {
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

    console.log("Processed Terabyte", result.length + 1);
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