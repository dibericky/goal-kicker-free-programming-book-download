const fs = require('fs')
const { join } = require('path')
const https = require('https')

async function fetchPage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, response => {
            if (response.statusCode >= 400) {
                reject(new Error('Error: ' + response.statusCode))
                return
            }
            if (response.statusCode > 300 && response.statusCode < 400) {
                // follow redirect
                fetchPage(response.headers.location)
                    .then(urlToDownload => resolve(urlToDownload))
                return
            }
            var body = '';
            response.on('data', function (chunk) {
                body += chunk;
            });
            response.on('end', function () {
                resolve(body)
            });
        })
    })
}

function getUrls(htmlPage) {
    return htmlPage.match(/http?s:\/\/books\.[\w\.\/]+\/[\w]+\//g);
}

function getPdfName(htmlPage) {
    return htmlPage.match(/[\w]+\.pdf/g);
}

async function getPdfs(urls) {
    const pdfs = [];
    for (const url of urls) {
        await sleep(500)
        const page = await fetchPage(url);
        pdfs.push(url + getPdfName(page)[0]);
    }
    return pdfs;
}

async function downloadFile(url, pathToSave) {
    return new Promise((resolve) => {
        console.log('Try to download ', url)
        var file = fs.createWriteStream(pathToSave);
        https.get(url, function (response) {
            response.pipe(file);
            file.on('finish', function () {
                file.close();
                console.log('Saved')
                resolve()
            });
        });
    })
}

async function sleep(time) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve()
        }, time)
    })
}

function unique(urls) {
    return Object.keys(urls.reduce((acc, url) => ({
        ...acc,
        [url]: 1
    }), {}))
}

const destinationFolder = join(__dirname, 'downloads')

async function downloadPdfs(urls) {
    for(const url of urls) {
        const pdfName = url.split('/').pop()
        const pathToSave = join(destinationFolder, pdfName)
        await sleep(500)
        await downloadFile(url, pathToSave)
    }
}



if (!fs.existsSync(destinationFolder)) {
    console.log('Create "download" folder')
    fs.mkdirSync(destinationFolder)
    console.log('Folder created.')
}

fetchPage("https://dev.to/brogrammer2018/free-programming-books-updated-4pdp")
    .then(getUrls)
    .then(unique)
    .then(getPdfs)
    .then(downloadPdfs)
    .catch(console.error)