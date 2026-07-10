from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Capture console logs
        page.on("console", lambda msg: print(f"CONSOLE [{msg.type}]: {msg.text}"))
        page.on("pageerror", lambda err: print(f"ERROR: {err}"))

        print("Navigating to http://localhost:8080...")
        page.goto("http://localhost:8080")
        page.wait_for_timeout(2000)
        
        print("Clicking Tasks...")
        page.click("text=Tasks")
        page.wait_for_timeout(1000)

        print("Clicking Add Task...")
        page.click("#tasks-add-btn")
        page.wait_for_timeout(1000)
        
        print("Filling form...")
        page.fill("#task-title", "Test Task")
        page.click("#modal-save-btn")
        page.wait_for_timeout(2000)
        
        browser.close()

if __name__ == "__main__":
    run()
