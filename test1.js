(product_price_sale = await page
    .$eval(".product-detail-price__cost--final", el =>
        el.innerText
            .replace(/au lieu de /g, "")
            .replace(/CHF /g, "")
            .replace(/\.-/g, "")
            .replace(/'/g, "")
    )
    .catch(error => null)),
    (product_price = await page
        .$eval(".product-detail-price__cost--old", el =>
            el.innerText
                .replace(/au lieu de /g, "")
                .replace(/CHF /g, "")
                .replace(/\.-/g, "")
                .replace(/'/g, "")
        )
        .catch(error => null));
