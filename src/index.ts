import { connect } from 'http2'
import express from 'express'
import usersRouter from './routes/users.routes'
import databaseService from './services/database.services'
const app = express()
app.use(express.json())
const PORT = 3000
databaseService.connect()
//route mặc định
app.get('/', (req, res) => {
  res.send('hello world')
})

app.use('/users', usersRouter)

app.listen(PORT, () => {
  console.log(`Sever đang mo tren port ${3000}`)
})

//http://localhost:3000/users/tweets
// để lấy data
