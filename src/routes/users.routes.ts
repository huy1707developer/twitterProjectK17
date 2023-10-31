import { Router } from 'express'
import {
  accessTokenValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator
} from '~/middlewares/users.middlewares'
import { loginController, logoutController, registerController } from '~/controllers/users.controllers'
import { wrapAsync } from '~/utils/handlers'

const usersRouter = Router()

// usersRouter.use((req, res, next) => {
//   // đây là midleware
//   console.log('Time: ' + Date.now())
//   next() // nếu tắt next thì ko thể nào xuống dưới được
// })

// usersRouter.use(loginValidator) -> dùng cách này là lúc nào cũng chạy middleware này
//-> chạy bất cứ cái nào vd như chạy login ko thì chạy submit... thì sẽ chạy loginvalidator

//TypeError: Cannot destructure property 'email' of 'req.body' as it is undefined.
// tại thằng express ko biết mình đang dùng json để dịch
//gặp lỗi này cần dạy cho thằng express dùng json

/* MÔ TẢ login
des: đăng nhập
path: /users/login
method: POST
body: {email, password}
*/
usersRouter.get('/login', loginValidator, wrapAsync(loginController))

//--------------------------
usersRouter.post('/register', registerValidator, wrapAsync(registerController))

//-------------------------
usersRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wrapAsync(logoutController))

/*
mô tả thông tin của logout
des: đăng xuất
path: /users/logout
method: POST
Header{Authorization: 'Bear <access_token>'}
body: {refresh_token: string}

*/

//registerController
export default usersRouter

//-0--------------------
// vì lý do nếu 100 thằng thì cần bắt 100 thằng để bắt lỗi -> làm cách khác

//-------------------------------------------- thay thế vào thằng error handler phía trên

//usersRouter.post('/register', registerValidator, registerController,
// (req, res, next) => {
//     console.log('request handler1')
//     //next(new Error('Error from request handler1'))
//     /// khi mà dùng next ném lỗi thì nó sẽ next tới error handler gần nhất
//     // vì mấy thg dưới ko có error handler để chụp lại -> quảng lỗi ra màn hình

//     // thay cái trên bằng throw
//     // try {
//     //   throw new Error('Error from request handler1')
//     // } catch (error) {
//     //   next(error)
//     // }
//     // nhưng nó lại ko bắt được lỗi khi bất đồng bộ -> vì v phải dùng try catch để bắt lỗi lại rồi tiếp tục dùng next để ném lỗi
//     Promise.reject(new Error('Error from request handler1')).catch(next)
//     // một cách tà giáo khác để ném lỗi -> catch bắt loi0x ném xuống
//   },
//   (req, res, next) => {
//     console.log('request handler2')
//     next()
//   },
//   (req, res, next) => {
//     console.log('request handler3')
//     res.json({ message: 'register successfully' })
//   },(error, req, res, next) => {
//   //error handler
//   // bị lỗi vì ts bắt định nghĩa các thằng trên
//   // //-T ko dịch typescript
//   // sửa bẳng cách chạy vào thg typescript rồi thêm -T vào dòng cuối -> "exec": "npx ts-node -T ./src/index.ts"
//   // chỉ sửa để chạy tạm thời chứ thật sự cần phải fix
//   console.log('Error handler nè')
//   res.status(400).json({ message: error.message })
