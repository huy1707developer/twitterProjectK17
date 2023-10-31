import { Request, Response } from 'express'
import User from '~/models/schemas/User.schema'
import usersService from '~/services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import { LogoutReqBody, RegisterReqBody } from '~/models/requests/User.request'
import { ObjectId } from 'mongodb'
import { USERS_MESSAGES } from '~/constants/messages'

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
