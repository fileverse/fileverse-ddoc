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
const panels = () => page.locator("[data-radix-menubar-content]").count()

// 1. Submenu stacking fixed: open Format, hover into Text submenu, then hover File trigger
await trigger("format").click()
await page.getByRole("menuitem", { name: "Text", exact: true }).hover()
await page.waitForTimeout(500)
const withSub = await panels()
await trigger("file").hover()
await page.waitForTimeout(600)
const afterSwitch = await panels()
const fileVisible = await page.locator("[data-radix-menubar-content] >> text=Import/Export").count()
check("submenu was open", withSub >= 2, `${withSub} panels`)
check("hover-switch closes stacked submenus", afterSwitch === 1, `${afterSwitch} panels`)
check("switched to File menu", fileVisible > 0)
await page.keyboard.press("Escape")
await page.waitForTimeout(200)

// 2. Focus mode is a plain action item
await trigger("view").click()
await page.waitForTimeout(300)
const fmRole = await page.locator("[role=menuitem]:has-text('Focus mode'), [role=menuitemcheckbox]:has-text('Focus mode')").first().getAttribute("role")
check("Focus mode is a trigger (menuitem)", fmRole === "menuitem")
await page.keyboard.press("Escape")

// 3. Table subtrigger visually disabled outside a table
await trigger("format").click()
await page.waitForTimeout(300)
const tt = page.getByRole("menuitem", { name: "Table", exact: true })
const disabledAttr = await tt.getAttribute("data-disabled")
const color = await tt.evaluate((el) => getComputedStyle(el).color)
check("Table has data-disabled", disabledAttr !== null)
// color-text-disabled is a grey; default text is near-black (#363b3f = rgb(54,59,63))
check("Table is visually greyed", color !== "rgb(54, 59, 63)", color)
await page.keyboard.press("Escape")

check("no page errors", errors.length === 0, errors[0] || "")
console.log(results.join("\n"))
await browser.close()
