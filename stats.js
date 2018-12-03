/* global Promise */
const exec = require('child_process').exec
const fs = require('fs')
const zlib = require('zlib')

const FILE_PATH = './build'

new Promise((resolve, reject) => {
  exec('npm run build -- --env.stats', (error, stdout, stderr) => {
    if (error) reject(stderr)
    resolve()
  })
}).then(() => {
  exec(`open ${FILE_PATH}/statistics.html`)
}).then((result) => {
  return new Promise((resolve, reject) => {
    fs.readdir(FILE_PATH, (err, files) => {
      if (err) reject(err)
      resolve(files)
    })
  })
}).then((files) => {
  return files.filter((file) => {
    return /\.js$/.test(file)
  })
}).then((files) => {
  const promises = files.map((filename) => {
    return new Promise((resolve, reject) => {
      fs.readFile(`${FILE_PATH}/${filename}`, 'utf8', (err, data) => {
        if (err) reject(err)
        resolve({ filename, content: data })
      })
    })
  })
  return Promise.all(promises)
}).then((files) => {
  const promises = files.map((file) => {
    const { filename, content } = file
    return new Promise((resolve, reject) => {
      zlib.gzip(content, (err, buffer) => {
        if (err) reject(err)
        resolve({ filename, original: content.length, compressed: buffer.length })
      })
    })
  })
  return Promise.all(promises)
}).then((results) => {
  results.forEach((result) => {
    console.log(`${FILE_PATH}/${result.filename}`)
    console.log('original', result.original.toString().padStart(15))
    console.log('original gzip', result.compressed.toString().padStart(10))
    console.log('')
  })
}).catch((err) => {
  console.error(err)
})
