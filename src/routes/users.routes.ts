import { Router } from 'express'
import {
  accessTokenValidator,
  changePasswordValidator,
  emailVerifyTokenValidator,
  followValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  unfollowValidator,
  updateMeValidator,
  verifiedUserValidator,
  verifyForgotPasswordTokenValidator
} from '~/middlewares/users.middlewares'
import {
  changePasswordController,
  emailVerifyTokenController,
  followController,
  forgotPasswordController,
  getMeController,
  getProfileController,
  loginController,
  logoutController,
  refreshTokenController,
  registerController,
  resendEmailVerifyController,
  resetPasswordController,
  unfollowController,
  updateMeController,
  verifyForgotPasswordController
} from '~/controllers/users.controllers'
import { wrapAsync } from '~/utils/handlers'
import { verify } from 'crypto'
import { filterMiddleware } from '~/middlewares/common.middlewares'
import { UpdateMeReqBody } from '~/models/requests/User.request'

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
usersRouter.post('/login', loginValidator, wrapAsync(loginController))

//--------------------------
usersRouter.post('/register', registerValidator, wrapAsync(registerController))

//-------------------------
/*
mô tả thông tin của logout
des: đăng xuất
path: /users/logout
method: POST
Header{Authorization: 'Bear <access_token>'}
body: {refresh_token: string}

*/
usersRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wrapAsync(logoutController))

//----------------------------------------Buoi 30 ----------------------------------------------
/*
  des: verify email token
  khi người dùng đăng kí họ sẽ nhận được mai có link dạng
  http://localhost:3000/user/verify-email=<email_verify_token>
  nếu mà em nhấp vào link thi sẽ tạo ra req gửi email_verify_token lên server
  server kiểm tra email_verify_token có hợp lệ hay không?
  thì từ decoded_email_verify_token thành '' (kiểm tra xong rồi thì xóa) , verify = 1, update_at
  path: /users/verify-email
  method: POST
  body: {email_verify_token: string}
*/
usersRouter.post('/verify-email', emailVerifyTokenValidator, wrapAsync(emailVerifyTokenController))

/*
  des: resend emal verify tokn
  khi mail thất lạc hoặc email_verify_token hết hạn , thì gnuowif dùng có
  nhu cầu resend email_verify_token

  method: POST
  path: /users/resend-email-verify
  headers:{Authorization: "Bearer <access_token>"} // đăng nhập mới được resend
  body: {}
*/
usersRouter.post('/resend-email-verify', accessTokenValidator, wrapAsync(resendEmailVerifyController))

/*
  des: khi người dùng quên mật khẩu họ gửi email để xin mình tạo cho họ một forgot_password_token
  path: /users/forgot-password
  method: POST
  body: {email: string}

*/

usersRouter.post('/forgot-password', forgotPasswordValidator, wrapAsync(forgotPasswordController))

/*
  des: khi người dùng nhấp vào link trong email để reset password
  họ sẽ gửi 1 req kèm theo forgor_pasword_token lên server
  server sẽ kiểm tra forgor_pasword_token có hợp lê không
  sau đó chuyển hướng người dùng đến reset password
  path: /users/verify-forgot-password
  method: POST
  body: {forgor_pasword_token}
*/

usersRouter.post(
  '/verify-forgot-password',
  verifyForgotPasswordTokenValidator,
  wrapAsync(verifyForgotPasswordController)
)

//---------------------------------------------------buoi 31---------------------------------------------------
/*
des: reset password
path: '/reset-password'
method: POST
Header: không cần, vì  ngta quên mật khẩu rồi, thì sao mà đăng nhập để có authen đc
body: {forgot_password_token: string, password: string, confirm_password: string}
*/
usersRouter.post(
  '/reset-password',
  resetPasswordValidator,
  verifyForgotPasswordTokenValidator,
  wrapAsync(resetPasswordController)
)

/*
des: get profile của user
path: '/me'
method: get
Header: {Authorization: Bearer <access_token>}
body: {}
*/
usersRouter.get('/me', accessTokenValidator, wrapAsync(getMeController))

//patch là để cập nhật thông tin user
usersRouter.patch(
  '/me',
  accessTokenValidator,
  verifiedUserValidator,
  filterMiddleware<UpdateMeReqBody>([
    'name',
    'date_of_birth',
    'bio',
    'location',
    'website',
    'avatar',
    'username',
    'cover_photo'
  ]),
  updateMeValidator,
  wrapAsync(updateMeController)
)

/*
des: get profile của user khác bằng unsername
path: '/:username'
method: get
không cần header vì, chưa đăng nhập cũng có thể xem
*/
usersRouter.get('/:username', wrapAsync(getProfileController))
//chưa có controller getProfileController, nên bây giờ ta làm
//-------------------------------------------------Buoi 32-------------------------------------------------------------

/*
des: Follow someone
path: '/follow'
method: post
headers: {Authorization: Bearer <access_token>}
body: {followed_user_id: string}
*/
usersRouter.post('/follow', accessTokenValidator, verifiedUserValidator, followValidator, wrapAsync(followController))

//accessTokenValidator dùng dể kiểm tra xem ngta có đăng nhập hay chưa, và có đc user_id của người dùng từ req.decoded_authorization
//verifiedUserValidator dùng để kiễm tra xem ngta đã verify email hay chưa, rồi thì mới cho follow người khác
//trong req.body có followed_user_id  là mã của người mà ngta muốn follow
//followValidator: kiểm tra followed_user_id truyền lên có đúng định dạng objectId hay không
//  account đó có tồn tại hay không
//followController: tiến hành thao tác tạo document vào collection followers

/*
  user huy2003: 654cd951ea51438f6584128d
  user huy2004: 654cda18ea51438f65841292
*/

/*
    des: unfollow someone
    path: '/unfollow/:user_id'
    method: delete -> ko cho chuyền qua body
    headers: {Authorization: Bearer <access_token>}
  g}
    */
usersRouter.delete(
  '/unfollow/:user_id',
  accessTokenValidator,
  verifiedUserValidator,
  unfollowValidator,
  wrapAsync(unfollowController)
)

//unfollowValidator: kiểm tra user_id truyền qua params có hợp lệ hay k?
//change password
/*
  des: change password
  path: '/change-password'
  method: PUT
  headers: {Authorization: Bearer <access_token>}
  Body: {old_password: string, password: string, confirm_password: string}
g}
  */
usersRouter.put(
  '/change-password',
  accessTokenValidator,
  verifiedUserValidator,
  changePasswordValidator,
  wrapAsync(changePasswordController)
)
//changePasswordValidator kiểm tra các giá trị truyền lên trên body cớ valid k ?

/*
  des: refreshtoken
  path: '/refresh-token'
  method: POST
  Body: {refresh_token: string}
g}
  */
usersRouter.post('/refresh-token', refreshTokenValidator, wrapAsync(refreshTokenController))
//khỏi kiểm tra accesstoken, tại nó hết hạn rồi mà
//refreshController chưa làm

//-----------------------------------------------------------------------------------------------------------------
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
