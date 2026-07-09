import { chromium } from "/Users/bhaveshrawat/WDP/second-lvl-nav/consumer-second-lvl-nav/node_modules/playwright/index.mjs"
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
const errors = []
page.on("pageerror", (e) => errors.push(e.message.slice(0, 100)))
await page.goto(process.argv[2], { waitUntil: "networkidle" })
await page.waitForSelector(".ProseMirror", { timeout: 30000 })
const results = []
const check = (n, ok, x = "") => results.push(`${ok ? "PASS" : "FAIL"} ${n}${x ? " — " + x : ""}`)
const menuCount = () => page.locator("[data-testid^='slnav-']").count()

check("menu visible initially", (await menuCount()) === 6, `${await menuCount()}`)

// Enable split view via the menu
await page.locator("[data-testid='slnav-view']").click()
await page.locator("[role=menuitem]:has-text('Split Markdown View')").click()
await page.waitForTimeout(800)
check("menu hidden in split view", (await menuCount()) === 0, `${await menuCount()} triggers`)
const splitPane = await page.locator(".cm-editor, .cm-content").count()
check("markdown pane active", splitPane > 0)

// Exit via the pane's own control ("Back to editor" PenLine button)
const exitBtn = page.locator("button:has([class*='lucide-pen-line'])").last()
check("exit control exists", (await exitBtn.count()) > 0)
await exitBtn.click()
await page.waitForTimeout(800)
check("menu returns after exit", (await menuCount()) === 6, `${await menuCount()}`)

check("no page errors", errors.length === 0, errors[0] || "")
console.log(results.join("\n"))
await browser.close()
