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
const menuTexts = async () => (await page.locator("[data-radix-menubar-content] [role=menuitem], [data-radix-menubar-content] [role=menuitemcheckbox]").allInnerTexts()).map(t => t.split("\n")[0])

await editor.click()
await page.keyboard.type("audit items")

// Edit: Delete + Find and replace
await trigger("edit").click()
await page.waitForTimeout(300)
let items = await menuTexts()
check("Edit has Delete", items.includes("Delete"))
check("Edit has Find and replace", items.includes("Find and replace"))
await page.keyboard.press("Escape")

// Insert: new items
await trigger("insert").click()
await page.waitForTimeout(300)
items = await menuTexts()
for (const want of ["Mermaid diagram","Plain text","Video","Tweet","Soundcloud","Tab","Comment"])
  check(`Insert has ${want}`, items.includes(want))
await page.keyboard.press("Escape")

// View: comments 2 items + Split Markdown View
await trigger("view").click()
await page.waitForTimeout(300)
items = await menuTexts()
check("View has Split Markdown View", items.includes("Split Markdown View"))
await page.getByRole("menuitem", { name: "Comments" }).hover()
await page.waitForTimeout(500)
const sub = await page.locator("[role=menu] [role=menuitem]").allInnerTexts()
check("Comments has Hide comments", sub.some(t => t.includes("Hide comments")))
check("Comments has Show all comments", sub.some(t => t.includes("Show all comments")))
await page.keyboard.press("Escape")

// Format ▸ Table disabled outside table
await trigger("format").click()
await page.waitForTimeout(300)
const tableTrigger = page.getByRole("menuitem", { name: "Table", exact: true })
check("Format Table present", (await tableTrigger.count()) > 0)
check("Table disabled outside table", (await tableTrigger.getAttribute("data-disabled")) !== null)
await page.keyboard.press("Escape")

// Insert a table, then Format ▸ Table enabled + Add row below works
await trigger("insert").click()
await page.getByRole("menuitem", { name: "Table", exact: true }).click()
await page.waitForTimeout(500)
await page.locator(".ProseMirror td").first().click() // cursor into table
await page.waitForTimeout(300)
await trigger("format").click()
await page.waitForTimeout(300)
const tt = page.getByRole("menuitem", { name: "Table", exact: true })
check("Table enabled inside table", (await tt.getAttribute("data-disabled")) === null)
await tt.hover()
await page.waitForTimeout(500)
const rowsBefore = await page.locator(".ProseMirror tr").count()
await page.getByRole("menuitem", { name: "Add row below" }).click()
await page.waitForTimeout(400)
const rowsAfter = await page.locator(".ProseMirror tr").count()
check("Add row below works", rowsAfter === rowsBefore + 1, `${rowsBefore}->${rowsAfter}`)

// Insert ▸ Link: prompt-driven, no longer a no-op
page.once("dialog", (d) => d.accept("example.com"))
await editor.click()
await page.keyboard.press("Meta+a")
await trigger("insert").click()
await page.getByRole("menuitem", { name: "Link", exact: true }).click()
await page.waitForTimeout(500)
const hasLink = await page.evaluate(() => !!document.querySelector(".ProseMirror a[href*='example.com']"))
check("Insert>Link applies via prompt", hasLink)

// View ▸ Split Markdown View toggles
await trigger("view").click()
await page.locator("[role=menuitemcheckbox]:has-text('Split Markdown View')").click()
await page.waitForTimeout(700)
const splitOn = await page.evaluate(() => document.body.innerText.includes("Markdown") || !!document.querySelector(".cm-editor, [class*='split']"))
check("Split view engages", splitOn)
await page.keyboard.press("Escape")

check("no page errors", errors.length === 0, errors[0] || "")
console.log(results.join("\n"))
await browser.close()
