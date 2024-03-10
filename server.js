const express = require('express')
const cors = require('cors');
const bodyParser = require('body-parser');

const connectDB = require('./configs/connectDB')
const initApiRoutes = require('./routes/apiRoutes')
const authRoutes = require('./routes/auth'); 

const port = 8080

const app = express()
app.use(cors()); 
app.use(express.json()); 
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

connectDB()

initApiRoutes(app)

app.use('/auth', authRoutes);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})