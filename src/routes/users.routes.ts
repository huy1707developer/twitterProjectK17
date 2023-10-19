import { Router } from 'express'
import { loginValidator, registerValidator } from '~/middlewares/users.middlewares'
import { loginController, registerController } from '~/controllers/users.controllers'
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
usersRouter.get('/login', loginValidator, loginController)
usersRouter.post('/register', registerValidator, registerController)

export default usersRouter
