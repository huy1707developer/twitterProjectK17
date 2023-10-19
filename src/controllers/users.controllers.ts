import { Request, Response } from 'express'
import User from '~/models/schemas/User.schema'
import databaseService from '~/services/database.services'
import usersService from '~/services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import { RegisterReqBody } from '~/models/requests/User.request'

export const loginController = (req: Request, res: Response) => {
  // đây là controller
  const { email, password } = req.body

  if (email === 'test@gmail.com' && password === '123') {
    return res.json({
      data: [
        { fname: 'Điệp', yob: 1999 },
        { fname: 'Huy', yob: 2003 },
        { fname: 'Minh', yob: 2000 }
      ]
    })
  }
  return res.status(400).json({
    error: 'login failed'
  })
}

export const registerController = async (req: Request<ParamsDictionary, any, RegisterReqBody>, res: Response) => {
  // định nghĩa rõ ràng cụ thể cho thằng request
  // const { email, password, name } = req.body
  // nhu cầu tạo nhiều hơn là 2 thuộc tính -> bỏ thẳng vô  register luôn
  try {
    const result = await usersService.register(req.body)
    res.json({
      message: 'register successfully',
      result
    })
  } catch (error) {
    res.status(400).json({
      message: 'register failed',
      error
    })
  }
}
