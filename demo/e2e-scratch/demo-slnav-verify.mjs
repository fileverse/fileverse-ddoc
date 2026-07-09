// End-to-end verification of the demo second-level nav (capability engine).
import { chromium } from "/Users/bhaveshrawat/WDP/second-lvl-nav/consumer-second-lvl-nav/node_modules/playwright/index.mjs"

const URL = process.argv[2] || "http://localhost:5174/"
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
const errors = []
page.on("pageerror", (e) => errors.push(e.message))
await page.goto(URL, { waitUntil: "networkidle" })
await page.waitForSelector(".ProseMirror", { timeout: 30000 })
const results = []
const check = (name, ok, extra = "") => {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`)
}

const editor = page.locator(".ProseMirror").first()
const trigger = (id) => page.locator(`[data-testid='slnav-${id}']`)

// 0. six owner menus render
const menus = await page.locator("[data-testid^='slnav-']").allInnerTexts()
check("owner menus", JSON.stringify(menus) === JSON.stringify(["File","Edit","View","Insert","Format","Tools"]), menus.join(","))

// 1. Format ▸ Text ▸ Bold — dispatch + toolbar sync without re-selecting
await editor.click()
await page.keyboard.type("engine check")
await page.keyboard.press("Meta+a")
await trigger("format").click()
await page.getByRole("menuitem", { name: "Text", exact: true }).hover()
await page.waitForTimeout(400)
await page.locator("[role=menuitemcheckbox]:has-text('Bold')").click()
await page.waitForTimeout(400)
const hasBold = await page.evaluate(() => !!document.querySelector(".ProseMirror strong"))
const toolbarBoldActive = /brand/.test(
  (await page.locator("button:has([class*='lucide-bold'])").first().getAttribute("class")) || "",
)
check("Format>Text>Bold dispatch", hasBold)
check("toolbar Bold syncs (no re-select)", toolbarBoldActive)

// 2. Insert ▸ Table, then Edit ▸ Undo
await trigger("insert").click()
await page.locator("[role=menuitem]:has-text('Table')").first().click()
await page.waitForTimeout(400)
const hasTable = await page.evaluate(() => !!document.querySelector(".ProseMirror table"))
check("Insert>Table", hasTable)
await trigger("edit").click()
await page.locator("[role=menuitem]:has-text('Undo')").first().click()
await page.waitForTimeout(400)
const tableGone = await page.evaluate(() => !document.querySelector(".ProseMirror table"))
check("Edit>Undo removes table", tableGone)

// 3. View ▸ Zoom ▸ 150%
await trigger("view").click()
await page.getByRole("menuitem", { name: "Zoom", exact: true }).hover()
await page.waitForTimeout(400)
await page.locator("[role=menuitemradio]:has-text('150%')").click()
await page.waitForTimeout(400)
const zoomed = await page.evaluate(() =>
  [...document.querySelectorAll("[style*='scale']")].some((el) => el.getAttribute("style")?.includes("1.5")),
)
check("View>Zoom>150%", zoomed)
// radio reflects immediately (menu stays open after radio select)
const checked = await page.locator("[role=menuitemradio][aria-checked='true']").allInnerTexts()
check("zoom radio reflects", checked.some((t) => t.includes("150")), checked.join(","))
await page.keyboard.press("Escape")
await page.waitForTimeout(300)

// 4. View ▸ Focus mode (D6 round-trip)
await trigger("view").click()
await page.locator("[role=menuitem]:has-text('Focus mode')").click()
await page.waitForTimeout(600)
const navHidden = await page.evaluate(() => {
  const nav = document.querySelector("nav")
  return nav ? nav.className.includes("translate-y-[-100%]") : false
})
check("View>Focus mode hides navbar", navHidden)
await page.keyboard.press("Escape") // menu stays open by design; dismiss it
await page.waitForTimeout(200)
await page.keyboard.press("Meta+Shift+F")
await page.waitForTimeout(600)
const navBack = await page.evaluate(() => {
  const nav = document.querySelector("nav")
  return nav ? !nav.className.includes("translate-y-[-100%]") : false
})
check("Cmd+Shift+F exits (D6 round-trip)", navBack)
if (navBack) {
  await trigger("view").click()
  const fmCount = await page.locator("[role=menuitem]:has-text('Focus mode')").count()
  check("focus mode action present after exit", fmCount > 0)
  await page.keyboard.press("Escape")
}

// 5. Viewer mode: only File/View
// cycleMode button cycles edit → preview modes; click once and inspect
const modeBtn = page.locator("button[title*='mode — click to switch']").first()
if (await modeBtn.count()) {
  await modeBtn.click()
  await page.waitForTimeout(800)
  const viewerMenus = await page.locator("[data-testid^='slnav-']").allInnerTexts()
  check("viewer menus collapse", JSON.stringify(viewerMenus) === JSON.stringify(["File","View"]), viewerMenus.join(","))
} else {
  check("viewer menus collapse", false, "mode button not found")
}

check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "))
console.log(results.join("\n"))
await browser.close()
