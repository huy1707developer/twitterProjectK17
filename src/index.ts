import express, { NextFunction, Response, Request } from 'express'
import usersRouter from './routes/users.routes'
import databaseService from './services/database.services'
import { defaultErrorHandler } from './middlewares/error.middlewares'
const app = express()
app.use(express.json())
const PORT = 3000
databaseService.connect()
//route mặc định
app.get('/', (req, res) => {
  res.send('hello world')
})

app.use('/users', usersRouter)

//bắt lỗi tổng
app.use(defaultErrorHandler)
// app.use((error: any, req: Request, res: Response, next: NextFunction) => {
//   console.log('Error handler tổng nè')
//   res.status(error.status).json({ message: error.message })
// })
// khi có lỗi nó sẽ tìm error handler gần nhất
//-> thẳng ở app tổng này sẽ hứng hết tất cả các lỗi từ mọi thằng khắc
//-> đã chuyển qua error.middlewares.ts

app.listen(PORT, () => {
  console.log(`Sever đang mo tren port ${3000}`)
})

//http://localhost:3000/users/tweets
// để lấy data
