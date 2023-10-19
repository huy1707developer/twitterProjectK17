import { validate } from './../utils/validation'
// giả xử đang làm route '/login'
// thì người dùng sẽ truyền email and password
//tạo 1 req có body là email và password
// làm 1 middleware kiểm tra email và password có

import { Request, Response, NextFunction } from 'express'
import { checkSchema } from 'express-validator'
import usersService from '~/services/users.services'
// nhớ import từ express để chạy
// được truyền lên hay không
export const loginValidator = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({
      // 400 là lỗi chuẩn validator
      error: 'Missing email or password'
    })
  }
  next()
}

// khi register thì
// ta sẽ có 1 req.body gồm
//{
// name: string,
// email: string,
// password: string,
// confirm_password: string, -> trong mongoDB nó bắt buộc theo kiểu snake_case
// date_of_birth: ISO8601,
//}
export const registerValidator = validate(
  // validate để lưu lỗi và thông báo cho người dùng biết
  // cách để kiểm tra ceck schema
  // khi schema có lỗi
  // thì thằng validate sẽ lưu lỗi  trong req của thg validate
  // và mấy thg khác muốn lấy lỗi coi thì vô thằng validate.req mà coi lỗi
  checkSchema({
    name: {
      notEmpty: true,
      isString: true,
      trim: true,
      isLength: {
        options: {
          min: 1,
          max: 100
        }
      }
    },
    email: {
      notEmpty: true,
      isEmail: true,
      trim: true,
      custom: {
        options: async (value, { req }) => {
          const isExistEmail = await usersService.checkEmailExist(value)
          if (isExistEmail) {
            throw new Error('email already exists')
          }
          return true
        }
      }
    },
    password: {
      notEmpty: true,
      isString: true,
      isLength: {
        options: {
          min: 8,
          max: 50
        }
      },
      isStrongPassword: {
        options: {
          minLength: 8,
          minLowercase: 1,
          minUppercase: 1,
          minNumbers: 1,
          minSymbols: 1,
          returnScore: true
          // chấm điểm password mạnh yếu
        }
      },
      errorMessage:
        'password mus be at least 8 characters long and contain at least 1 lowercase letter, 1 uppercase letter, 1 number, and 1 symbol'
    },
    confirm_password: {
      notEmpty: true,
      isString: true,
      isLength: {
        options: {
          min: 8,
          max: 50
        }
      },
      isStrongPassword: {
        options: {
          minLength: 8,
          minLowercase: 1,
          minUppercase: 1,
          minNumbers: 1,
          minSymbols: 1,
          returnScore: true
          // chấm điểm password mạnh yếu
        }
      },
      errorMessage:
        'password mus be at least 8 characters long and contain at least 1 lowercase letter, 1 uppercase letter, 1 number, and 1 symbol',
      custom: {
        options: (value, { req }) => {
          if (value !== req.body.password) {
            throw new Error('confirm_password does not match password')
          }
          return true
        }
      }
    },
    date_of_birth: {
      isISO8601: {
        options: {
          strict: true,
          strictSeparator: true
        }
      }
    }
  })
)
