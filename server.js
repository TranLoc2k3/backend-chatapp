const express = require('express')
const app = express()
const port = 8080
const connectDB = require('./configs/connectDB')
const initApiRoutes = require('./routes/apiRoutes')

connectDB()

initApiRoutes(app)

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})