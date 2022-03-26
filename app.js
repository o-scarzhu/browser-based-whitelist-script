const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth/evasions/chrome.app');
const chalk = require('chalk');
const fs = require('fs');
const moment = require('moment');
const {machineIdSync} = require('node-machine-id');

var mysql = require("mysql");

global.version = `0.0.8`
global.data = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));

function updateApplicationTitle() {
    process.title = `Oscar's Whitelist Chat Script - Version: ${global.version} | Account: ${global.data.email}`;
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

function getRandInt(min, max) {
    return Math.round(Math.random() * (max - min) + min);
};
  
class Whitelist {
    constructor () {
        this.count = 0;
    }

    statusUpdate(msg, type) {
        let statusMsg = ((`[${moment().format("hh:mm:ss.SSS")}] ${msg}`))
        let color = chalk.white()
        switch (type.toLowerCase()) {
            case 'default':
                color = chalk.white(statusMsg)
                break
            case 'status':
                color = chalk.yellowBright(statusMsg)
                break
            case 'warn':
                color = chalk.redBright(statusMsg)
                break
        }
        return console.log(color);
    };

    checkTaskStatus() {
        if(this.taskStopped) return true;
        else return false;
    };

    getDelays() {
        this.data = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
        this.masterDelay = getRandInt(this.data.delay1, this.data.delay2)
    }

    async init(){
        this.statusUpdate(`Starting session`, "default");
        try {
            puppeteer.use(StealthPlugin());
            this.browser = await puppeteer.launch({
                executablePath: `./src/chrome-win/chrome.exe`,
                headless: false,
                ignoreHTTPSErrors: true,
                handleSIGINT: true,
                defaultViewport: null,
                args: [
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                    "--disable-web-security",
                    "--disable-features=site-per-process"
                ]
            })

            this.page = await this.browser.newPage();

        } catch (e) {
            console.log(e)
            fs.writeFileSync('./output.txt', e)
        }
    };
    
    findSentence () {
        this.textArr = (fs.readFileSync(`./src/buzzwords.txt`, 'utf-8')).split('\n')
        this.count++;
        if (this.count > this.textArr.length) {
            this.count = 0;
        }
        else if (this.count == this.textArr.length) {
            this.count = 0;
        }
        return this.textArr[this.count];
    };

    async login(){
        if (this.checkTaskStatus()) return;
        try {
            await this.page.goto('https://discord.com/login', { waitUntil: 'networkidle2' })
            await this.page.waitForXPath('//*[@id="app-mount"]/div[2]/div/div/div/div/form/div/div/div[1]/div[2]/div[1]/div/div[2]/input')
            
            let email_field = await this.page.$x(`//*[@id="app-mount"]/div[2]/div/div/div/div/form/div/div/div[1]/div[2]/div[1]/div/div[2]/input`)
            await email_field[0].type(global.data.email);
            
            let password_field = await this.page.$x('//*[@id="app-mount"]/div[2]/div/div/div/div/form/div/div/div[1]/div[2]/div[2]/div/input')
            await password_field[0].type(global.data.password);
            
            let submit_btn = await this.page.$x('//*[@id="app-mount"]/div[2]/div/div/div/div/form/div/div/div[1]/div[2]/button[2]')

            const [_, navigation] = await Promise.allSettled([
                await submit_btn[0].click(),
                await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 0})
            ]);
            
            if (navigation.status == 'fulfilled') return this.statusUpdate(`Logged into: ${global.data.email}`, "status")
            else throw `Failed to log into: ${global.data.email}`;

        }
        catch(e) {
            this.statusUpdate(`closing browser: ${e}`, "warn");
            await this.browser.close();
            return this.taskStopped = true;
        }
    };

    async gotoGuild(guild) {
        if (this.checkTaskStatus()) return;
        this.statusUpdate(`Redirecting to server channel`, "default")
        await this.page.goto(guild, { waitUntil: 'networkidle2', timeout: 0})
        await this.page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
          })
        return;
    };

    async normalTyping() {
        if (this.checkTaskStatus()) return;
        this.getDelays();
        try{
            this.message = this.findSentence().substring(0, this.findSentence().length - getRandInt(0,1))

            this.statusUpdate(`Typing...`, "default")

            await this.page.keyboard.type(this.message, {delay: getRandInt(250,500)})
            await this.page.keyboard.press('Enter');

            this.statusUpdate(`Message sent: ${this.textArr[this.count]}`, "default")
            this.statusUpdate(`Sleeping for ${this.masterDelay}ms`, "default")
            await sleep(this.masterDelay);
            return;
        }
        catch (e) {
            this.statusUpdate(`${e} - retrying`, "warn");
            return this.normalTyping();
        }
    };

    async editMessage() {
        if (this.checkTaskStatus()) return;
        this.getDelays();
        try{
            this.statusUpdate(`Editing previous message: ${this.message}`, "default")
            
            await this.page.keyboard.press('ArrowUp')

            await Promise.allSettled([
                this.page.keyboard.press('ControlLeft'),
                this.page.keyboard.press('KeyA')
            ])

            await this.page.keyboard.type(this.message, {delay: getRandInt(250,500)})
            await this.page.keyboard.press('Enter');

            this.statusUpdate(`Message edited: ${this.message}`, "default")
            this.statusUpdate(`Sleeping for ${this.masterDelay}ms`, "default")
            await sleep(this.masterDelay);
            return;
        }
        catch (e) {
            this.statusUpdate(`${e} - retrying`, "warn");
            return this.editMessage();
        }
    };

    async sendSticker() {
        if (!global.data.haveNitro) return;
        if (this.checkTaskStatus()) return;
        this.getDelays();
        try{
            this.statusUpdate(`Sending sticker...`, "default")

            await Promise.allSettled([
                this.page.keyboard.press('ControlLeft', {delay: 100}),
                this.page.keyboard.press('KeyS')
            ])

            await this.page.keyboard.press('ArrowRight', {count: getRandInt(0,10), delay: 100})
            await this.page.keyboard.press('Enter');

            this.statusUpdate(`Sticker sent`, "default")
            this.statusUpdate(`Sleeping for ${this.masterDelay}ms`, "default")
            await sleep(this.masterDelay);
            return;
        }
        catch (e) {
            this.statusUpdate(`${e} - retrying`, "warn");
            return this.sendSticker();
        }
    };

    async close(){
        this.statusUpdate(`Closing browser`, "warn")
        await this.page.close();
        await this.browser.close();
        return;
    };
}

async function taskRun () {
    var main = new Whitelist()
    updateApplicationTitle()
    await main.init()
    await main.login()
    let guildArr = (fs.readFileSync(`./src/url.txt`, 'utf-8')).split('\n')
    for (guild of guildArr)
        await main.gotoGuild(guild)
    while (true) {
        await main.normalTyping()
    }
}

(async () => {
    try{
        var pool = mysql.createPool({
            host: 'us-cdbr-east-05.cleardb.net',
            user: 'b84c27axxxx',
            password: 'bxxxx',
            database: 'heroku_0axxxxce'
        });
    
        pool.getConnection((err, con) => {
            console.log(chalk.blueBright('Connecting to auth server'))
            if (err) throw err;
        
            let keyArr = []
            let queries = [machineIdSync(), global.data.clientKey]
        
            con.query(`SELECT client_key FROM auth_table`, (err, res) => {
                if (err) throw err;
                for (keys of res) keyArr.push(keys.client_key);
                if (!keyArr.includes(global.data.clientKey)) {
                    con.release();
                    console.log(`Invalid key`);
                    setTimeout(process.exit(), 4000);
                }
            });
    
            con.query(`SELECT hwid FROM auth_table WHERE client_key = ?`, [queries[1]], (err, res) => {
                if (err) throw err;
                if (res[0].hwid == machineIdSync()) {
                    con.release()
                    console.log(chalk.greenBright(`Key validated!`))
                    taskRun()
                }
                else if (res[0].hwid == 0) {
                    console.log(chalk.blueBright('Logging HWID'))
        
                    let sql = "UPDATE auth_table SET hwid = ? WHERE client_key = ?";
        
                    con.query(sql, queries, function (err, res) {
                        if (err) throw err;
                        con.release()
                        console.log(chalk.blueBright('HWID logged'))
                        return;
                    })
                }
                else {
                    console.log(chalk.redBright(`Key is already binded to another device`))
                }
            });
    
        })
    }
    catch (e) {
        console.log(e)
        await sleep(4000)
        return;
    }
})();
