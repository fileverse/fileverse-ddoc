import { chromium } from "/Users/bhaveshrawat/WDP/second-lvl-nav/consumer-second-lvl-nav/node_modules/playwright/index.mjs"
const URL = process.argv[2]
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
const errors = []
page.on("pageerror", (e) => errors.push(e.message.slice(0, 100)))
await page.goto(URL, { waitUntil: "networkidle" })
await page.waitForSelector(".ProseMirror", { timeout: 30000 })
const results = []
const check = (n, ok, x = "") => results.push(`${ok ? "PASS" : "FAIL"} ${n}${x ? " — " + x : ""}`)
const trigger = (id) => page.locator(`[data-testid='slnav-${id}']`)
const editor = page.locator(".ProseMirror").first()

await editor.click()
await page.keyboard.type("round two")
await page.keyboard.press("Meta+a")

// 1. Checkbox dispatch keeps the menu open (Format > Text > Bold)
await trigger("format").click()
await page.getByRole("menuitem", { name: "Text", exact: true }).hover()
await page.waitForTimeout(400)
await page.locator("[role=menuitemcheckbox]:has-text('Bold')").click()
await page.waitForTimeout(500)
const menuStillOpen = await page.locator("[data-radix-menubar-content]").count()
const boldApplied = await page.evaluate(() => !!document.querySelector(".ProseMirror strong"))
check("Bold applied", boldApplied)
check("menu stays open after checkbox", menuStillOpen > 0, `${menuStillOpen} panels`)
// checkbox reflects new state without reopening
const boldChecked = await page.locator("[role=menuitemcheckbox]:has-text('Bold')").getAttribute("aria-checked")
check("checkbox state updates in-place", boldChecked === "true")
// pointer click outside still closes
await page.mouse.click(700, 500)
await page.waitForTimeout(400)
check("outside click closes menu", (await page.locator("[data-radix-menubar-content]").count()) === 0)

// 2. Radio dispatch keeps menu open (line height)
await trigger("format").click()
await page.getByRole("menuitem", { name: "Line height", exact: true }).hover()
await page.waitForTimeout(400)
await page.locator("[role=menuitemradio]:has-text('2')").first().click()
await page.waitForTimeout(400)
check("menu stays open after radio", (await page.locator("[data-radix-menubar-content]").count()) > 0)
await page.keyboard.press("Escape")
await page.waitForTimeout(200)

// 3. Outlines + Split view are plain action items (not checkboxes)
await trigger("view").click()
await page.waitForTimeout(300)
const outlinesRole = await page.locator("[role=menuitem]:has-text('outlines'), [role=menuitemcheckbox]:has-text('outlines')").first().getAttribute("role")
check("outlines is a trigger (menuitem)", outlinesRole === "menuitem")
const splitRole = await page.locator("[role=menuitem]:has-text('Split Markdown View'), [role=menuitemcheckbox]:has-text('Split Markdown View')").first().getAttribute("role")
check("Split view is a trigger (menuitem)", splitRole === "menuitem")
await page.keyboard.press("Escape")

// 4. Link uses the modal
await editor.click()
await page.keyboard.press("Meta+a")
await trigger("insert").click()
await page.getByRole("menuitem", { name: "Link", exact: true }).click()
await page.waitForTimeout(500)
const modalVisible = await page.getByPlaceholder("Paste URL").count()
check("Link opens modal", modalVisible > 0)
if (modalVisible) {
  const textPrefill = await page.getByPlaceholder("Link text").inputValue()
  check("modal prefills selected text", textPrefill.includes("round two"), textPrefill)
  await page.getByPlaceholder("Paste URL").fill("example.com")
  await page.getByRole("button", { name: "Save" }).click()
  await page.waitForTimeout(500)
  const hasLink = await page.evaluate(() => !!document.querySelector(".ProseMirror a[href*='example.com']"))
  check("modal Save applies link", hasLink)
}

check("no page errors", errors.length === 0, errors[0] || "")
console.log(results.join("\n"))
await browser.close()
