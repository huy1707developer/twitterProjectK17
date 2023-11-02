import { Request, Response } from 'express'
import User from '~/models/schemas/User.schema'
import usersService from '~/services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import {
  LogoutReqBody,
  RegisterReqBody,
  ResetPasswordReqBody,
  TokenPayload,
  VerifyEmailReqBody
} from '~/models/requests/User.request'
import { ObjectId } from 'mongodb'
import { USERS_MESSAGES } from '~/constants/messages'
import databaseService from '~/services/database.services'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { Verify } from 'crypto'
import { UserVerifyStatus } from '~/constants/enums'

export const loginController = async (req: Request, res: Response) => {
  // lấy user_id từ user của req
  // const { user }: any = req // tại req ko biết user có tồn tại trong req nên định nghĩa lại để req biết
  //vì đã được declare bên type.d.ts nên ko cần
  const user = req.user as User
  const user_id = user._id as ObjectId //đây là object ID

  // dùng user_id tạo access_token và refesh_token
  const result = await usersService.login(user_id.toString())
  // tại nó là object -> chuyển thành string mới chuyển qua pram kia dc

  //response access_token và refesh_token cho client
  res.json({
    message: USERS_MESSAGES.LOGIN_SUCCESSFULLY,
    result
  })
}

export const registerController = async (req: Request<ParamsDictionary, any, RegisterReqBody>, res: Response) => {
  // định nghĩa rõ ràng cụ thể cho thằng request
  // const { email, password, name } = req.body
  // nhu cầu tạo nhiều hơn là 2 thuộc tính -> bỏ thẳng vô  register luôn
  // throw new Error('Lôi nè')

  const result = await usersService.register(req.body)
  res.json({
    message: USERS_MESSAGES.REGISTER_SUCCESSFULLY,
    result
  })
}

// thằng bắt lỗi ko nên nằm ở đây
// bắt buộc phải quăng lỗi về 1 chỗ error handler để xử lí chung

// res.status(400).json({
//   message: 'register failed',
//   error
// })

export const logoutController = async (req: Request<ParamsDictionary, any, LogoutReqBody>, res: Response) => {
  //lấy refresh_token từ body
  const refresh_token = req.body.refresh_token
  const result = await usersService.logout(refresh_token) //hàm trả ra chuỗi báo logout thành công
  return res.json(result)
}

// đã được định nghĩa là string trong LogoutReqBody nên ko cần as String
// gọi hàm logout, hàm nhận vào refresh_token -> tìm và xóa

export const emailVerifyTokenController = async (
  req: Request<ParamsDictionary, any, VerifyEmailReqBody>,
  res: Response
) => {
  // nếu mà code vào được đây thì nghĩa là email_verify_token đã hợp lệ
  // và mình đã lấy được decoded_email_verify_token
  const { user_id } = req.decoded_email_verify_token as TokenPayload
  //dựa vào user_id tìm user và xem thử nó đã verify chưa?
  const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
  if (user === null) {
    throw new ErrorWithStatus({
      message: USERS_MESSAGES.USER_NOT_FOUND,
      status: HTTP_STATUS.NOT_FOUND
    })
  }
  if (user.verify === UserVerifyStatus.Verified && user.email_verify_token === '') {
    return res.json({
      message: USERS_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE
    })
  }

  // nếu mà ko khớp email_verify_token
  if (user.email_verify_token !== (req.body.email_verify_token as string)) {
    throw new ErrorWithStatus({
      message: USERS_MESSAGES.EMAIL_VERIFY_TOKEN_IS_INCORECT,
      status: HTTP_STATUS.UNAUTHORIZED
    })
  }
  // nếu mà xuống được đây thì có nghĩa là user chưa verify
  // mình sẽ update lại user đó
  const result = await usersService.verifyEmail(user_id)
  return res.json({
    message: USERS_MESSAGES.VERIFY_EMAIL_SUCCESS,
    result
  })
}

export const resendEmailVerifyController = async (req: Request, res: Response) => {
  // nếu mà vào được đây thì có nghĩa là access_token hợp lệ
  // và mình đã lấy được decoded_authorization
  const { user_id } = req.decoded_authorization as TokenPayload

  const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
  if (user === null) {
    throw new ErrorWithStatus({
      message: USERS_MESSAGES.USER_NOT_FOUND,
      status: HTTP_STATUS.NOT_FOUND
    })
  }

  if (user.verify === UserVerifyStatus.Verified && user.email_verify_token === '') {
    return res.json({
      message: USERS_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE
    })
  }

  if (user.verify === UserVerifyStatus.Banned) {
    throw new ErrorWithStatus({
      message: USERS_MESSAGES.USER_BANNED,
      status: HTTP_STATUS.FORBIDDEN
    })
  }
  // user này thực sự chưa verify: mình sẽ tạo lại email_verify_token
  //cập nhật lại user
  const result = await usersService.resendEmailVerify(user_id)
  return res.json(result)
}

export const forgotPasswordController = async (req: Request, res: Response) => {
  //lấy user_id (_id) từ user req
  const { _id } = req.user as User
  //dùng _id tìm và cập nhật lại user thêm vào forgot_password_token
  const result = await usersService.forgotPassword((_id as ObjectId).toString())
  return res.json(result)
}

export const verifyForgotPasswordController = async (req: Request, res: Response) => {
  return res.json({
    message: USERS_MESSAGES.VERIFY_FORGOT_PASSWORD_TOKEN_SUCCESS
  })
}

export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordReqBody>,
  res: Response
) => {
  const { user_id } = req.decoded_forgot_password_token as TokenPayload
  const { password } = req.body // nếu có sử dụng tới body thì phải định nghĩa lại body nếu ko nó là any thì ko có hay
  //-> định nghĩa ngay phía parameter và user.request

  //dùng user_id tìm user và update lại password
  const result = await usersService.resetPassword({ user_id, password })
  return res.json(result)
}
