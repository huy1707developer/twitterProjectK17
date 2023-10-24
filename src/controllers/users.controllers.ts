import { Request, Response } from 'express'
import User from '~/models/schemas/User.schema'
import databaseService from '~/services/database.services'
import usersService from '~/services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import { RegisterReqBody } from '~/models/requests/User.request'

export const loginController = async (req: Request, res: Response) => {
  // lấy user_id từ user của req
  const { user }: any = req
  const user_id = user._id //đây là object ID

  // dùng user_id tạo access_token và refesh_token
  const result = await usersService.login(user_id.toString())
  // tại nó là object -> chuyển thành string mới chuyển qua pram kia dc

  //response access_token và refesh_token cho client
  res.json({
    message: 'Login successfully',
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
    message: 'register successfully',
    result
  })
}

// thằng bắt lỗi ko nên nằm ở đây
// bắt buộc phải quăng lỗi về 1 chỗ error handler để xử lí chung

// res.status(400).json({
//   message: 'register failed',
//   error
// })
