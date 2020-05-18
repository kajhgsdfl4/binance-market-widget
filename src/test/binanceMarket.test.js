/* eslint-disable no-undef */
const expect = require('expect')
const {By} = require('selenium-webdriver')
const waitTimeout = 6000
const pageUrl = 'http://localhost:3000'
const {prepareDriver, cleanupDriver} = require('./index.test')

function loadPageElement (driver, className) {
    return driver.wait(async function () {
        try {
            return await driver.findElement(By.className(className))
        } catch (e) {}
    })
}

describe('Binance Market Widget', function () {
    this.timeout(waitTimeout)
    let driver
    before(async function () {
      driver = await prepareDriver()
      await driver.get(pageUrl)
    })
    
    after(function () {
        cleanupDriver(driver)
    })

    it('Change widget tabs', function (done) {
        loadPageElement(driver, 'binance-widget__tabs').then(async function () {
            try {
                const beforeActiveTab = await driver.findElement(By.className('binance-widget__tab--active'))
                const [,activeTab] = await driver.findElements(By.className('binance-widget__tab'))
                await activeTab.click()
                const afterActiveTab = await driver.findElement(By.className('binance-widget__tab--active'))
    
                const beforeActiveText = await beforeActiveTab.getText()
                const activeText = await activeTab.getText()
                const afterActiveText = await afterActiveTab.getText()
                
                expect(beforeActiveText).not.toEqual(activeText)
                expect(activeText).toEqual(afterActiveText)
                done()
            } catch (e) {
                done(e)
            }            
        })
    })

    it('Search', function (done) {
        loadPageElement(driver, 'binance-widget__search').then(async function () {
            try {
                const searchInput = await driver.findElement(By.xpath('//div[@class="binance-widget__search"]//input'))
                const beforetPair = await driver.findElement(By.className('binance-widget__table-cell'))
                const beforePairText = await beforetPair.getText()
                const beforeTableRows = await driver.findElements(By.className('binance-widget__table-row')) 
                await searchInput.sendKeys(beforePairText.split('/')[0])
                const afterTableRows = await driver.findElements(By.className('binance-widget__table-row')) 
                const afterPair = await driver.findElement(By.className('binance-widget__table-cell')) 
                const afterPairText = await afterPair.getText()
                expect(beforeTableRows.length).not.toEqual(afterTableRows.length)
                expect(afterPairText).toEqual(beforePairText)
                done()
            } catch (e) {
                done(e)
            }
        })
    })

    it('Start/Stop buttons', function (done) {
        loadPageElement(driver, 'binance-widget__tabs').then(async function () {
            const beforeStartButton = await driver.findElement(By.className('binance-widget__action'))
            const beforeStartButtonText = await beforeStartButton.getText()
            const startButton = await driver.wait(async function () {
                try {
                    const startButton = await driver.findElement(By.className('binance-widget__action'))
                    if (await startButton.getText() !== beforeStartButtonText) {
                        return startButton
                    }
                } catch (e) {}
            })

            const startButtonText = await startButton.getText()
            await startButton.click()
            setTimeout(async function () {
                try {
                    const afterStartButton = await driver.findElement(By.className('binance-widget__action'))
                    expect(await afterStartButton.getText()).not.toEqual(startButtonText)
                    done()
                } catch (e) {
                    done(e)
                }
            }, 3000)
        })
    })
})