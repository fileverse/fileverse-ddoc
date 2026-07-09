import { chromium } from "/Users/bhaveshrawat/WDP/second-lvl-nav/consumer-second-lvl-nav/node_modules/playwright/index.mjs"
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
await page.goto(process.argv[2], { waitUntil: "networkidle" })
await page.waitForSelector(".ProseMirror", { timeout: 30000 })
const results = []
const check = (n, ok, x = "") => results.push(`${ok ? "PASS" : "FAIL"} ${n}${x ? " — " + x : ""}`)
const activeInfo = () => page.evaluate(() => {
  const a = document.activeElement
  return {
    inEditor: !!a?.closest(".ProseMirror"),
    inTableCell: !!a?.closest(".ProseMirror") && !!document.getSelection()?.anchorNode?.parentElement?.closest("td, th"),
    isTrigger: a?.getAttribute("data-testid")?.startsWith("slnav-") ?? false,
    tag: a?.tagName,
  }
})

const editor = page.locator(".ProseMirror").first()
await editor.click()
await page.keyboard.type("focus check ")

// 1. Insert ▸ Table → focus should be inside the editor (first cell), not the trigger
await page.locator("[data-testid='slnav-insert']").click()
await page.getByRole("menuitem", { name: "Table", exact: true }).click()
await page.waitForTimeout(600)
let a = await activeInfo()
check("focus in editor after Insert>Table", a.inEditor, JSON.stringify(a))
check("selection inside table cell", a.inTableCell)
check("focus NOT on menu trigger", !a.isTrigger)

// 2. Insert ▸ Code block → focus in editor
await page.locator("[data-testid='slnav-insert']").click()
await page.getByRole("menuitem", { name: "Code block", exact: true }).click()
await page.waitForTimeout(600)
a = await activeInfo()
check("focus in editor after Insert>Code block", a.inEditor, a.tag)

// 3. Escape-only close still returns focus to the trigger (a11y)
await page.locator("[data-testid='slnav-view']").click()
await page.waitForTimeout(300)
await page.keyboard.press("Escape")
await page.waitForTimeout(300)
a = await activeInfo()
check("Escape returns focus to trigger", a.isTrigger, JSON.stringify(a))

console.log(results.join("\n"))
await browser.close()
