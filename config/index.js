const fileName = process.env.EVN_FILE_NAME || 'local'

module.exports = {
  client: Object.assign({}, require('./client/common'), require(`./client/${fileName}`)),
}
