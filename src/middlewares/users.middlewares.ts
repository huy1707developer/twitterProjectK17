import { validate } from './../utils/validation'
// giả xử đang làm route '/login'
// thì người dùng sẽ truyền email and password
//tạo 1 req có body là email và password
// làm 1 middleware kiểm tra email và password có

import { Request } from 'express'
import { checkSchema } from 'express-validator'
import { capitalize } from 'lodash'
import { USERS_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import databaseService from '~/services/database.services'
import usersService from '~/services/users.services'
import { hashPassword } from '~/utils/crypto'
import HTTP_STATUS from '~/constants/httpStatus'
import { verifyToken } from '~/utils/jwt'
import { JsonWebTokenError } from 'jsonwebtoken'
// nhớ import từ express để chạy
// được truyền lên hay không
export const loginValidator = validate(
  checkSchema(
    {
      email: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_REQUIRED
        },
        isEmail: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID
        },
        trim: true,
        custom: {
          options: async (value, { req }) => {
            // dựa vào email và password tìm đối tượng users tương ứng
            const user = await databaseService.users.findOne({
              email: value,
              password: hashPassword(req.body.password)
            })
            if (user === null) {
              throw new Error(USERS_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT)
            }
            // trong req ko có user
            //cái này đang bị hoisting nên mới dc tạo ra
            //mục tiêu đính kèm thằng user để gửi request lên (gửi ké)
            req.user = user
            return true
          }
        }
      },
      password: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.PASSWORD_IS_REQUIRED
        },
        isString: {
          errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_A_STRING
        },
        isLength: {
          options: {
            min: 8,
            max: 50
          },
          errorMessage: USERS_MESSAGES.PASSWORD_LENGTH_MUST_BE_FROM_8_TO_50
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
          },
          errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_STRONG
        }
      }
    },
    ['body']
  )
  // làm v thì check mỗi body thôi -> tăng hiệu năng
)

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
  checkSchema(
    {
      name: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.NAME_IS_REQUIRED
        },
        isString: {
          errorMessage: USERS_MESSAGES.NAME_MUST_BE_A_STRING
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 100
          },
          errorMessage: USERS_MESSAGES.NAME_LENGTH_MUST_BE_FROM_1_TO_100
        }
      },
      email: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_REQUIRED
        },
        isEmail: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID
        },
        trim: true,
        custom: {
          options: async (value, { req }) => {
            const isExistEmail = await usersService.checkEmailExist(value)
            if (isExistEmail) {
              throw new Error(USERS_MESSAGES.EMAIL_ALREADY_EXISTS)
            }
            return true
          }
        }
      },
      password: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.PASSWORD_IS_REQUIRED
        },
        isString: {
          errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_A_STRING
        },
        isLength: {
          options: {
            min: 8,
            max: 50
          },
          errorMessage: USERS_MESSAGES.PASSWORD_LENGTH_MUST_BE_FROM_8_TO_50
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
          },
          errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_STRONG
        }
      },
      confirm_password: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED
        },
        isString: {
          errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_A_STRING
        },
        isLength: {
          options: {
            min: 8,
            max: 50
          },
          errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_LENGTH_MUST_BE_FROM_8_TO_50
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
          },
          errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_STRONG
        },
        custom: {
          options: (value, { req }) => {
            if (value !== req.body.password) {
              throw new Error(USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_THE_SAME_AS_PASSWORD)
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
          },
          errorMessage: USERS_MESSAGES.DATE_OF_BIRTH_BE_ISO8601
        }
      }
    },
    ['body']
  )
  // làm v thì check mỗi body thôi -> tăng hiệu năng
)

export const accessTokenValidator = validate(
  checkSchema(
    {
      Authorization: {
        trim: true,
        notEmpty: {
          errorMessage: USERS_MESSAGES.ACCESS_TOKEN_IS_REQUIRED
        },
        custom: {
          options: async (value: string, { req }) => {
            const access_token = value.split(' ')[1] // băm nó ra lấy vị trí số 1
            if (!access_token) {
              throw new ErrorWithStatus({
                message: USERS_MESSAGES.ACCESS_TOKEN_IS_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED // 401
              })
            }
            try {
              //1. kiểm tra token (verify) có phải của server tạo ra không?
              const decoded_authorization = await verifyToken({ token: access_token })
              // lưu lại payload hay là decoded vào request
              ;(req as Request).decoded_authorization = decoded_authorization
              //------------ lưu ý phải có dấy ; -------------------------------------------
              //2. nếu mà của server tạo ra thì lưu lại payload
            } catch (error) {
              throw new ErrorWithStatus({
                // vì cái lỗi (error)tự phát sinh chưa chắc chắn  có message nên ko dùng error.message được
                message: capitalize((error as JsonWebTokenError).message), // mình biết là lỗi gì nên định nghĩa lỗi luôn
                //capitalize viết hoa chữ cái đầu
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
            return true
          }
        }
      }
    },
    ['headers']
  )
)
export const refreshTokenValidator = validate(
  checkSchema(
    {
      refresh_token: {
        trim: true,
        notEmpty: {
          errorMessage: USERS_MESSAGES.REFRESH_TOKEN_IS_REQUIRED
        },
        custom: {
          options: async (value: string, { req }) => {
            try {
              //1. kiểm tra refresh_token(value) (verify) có phải của server tạo ra không?
              const decoded_refresh_token = await verifyToken({ token: value })
              // ktra token còn trong database nữa ko

              const refresh_token = await databaseService.refreshTokens.findOne({ token: value })

              if (refresh_token === null) {
                //-------------------------lỗi 2----------------------
                throw new ErrorWithStatus({
                  message: USERS_MESSAGES.USED_REFRESH_TOKEN_OR_NOT_EXIST,
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              } // lỗi này đã setting rồi nên là cần quăng thẳng ra màn hình luôn
              // lưu lại payload hay là decoded vào request
              ;(req as Request).decoded_refresh_token = decoded_refresh_token

              //2. nếu mà của server tạo ra thì lưu lại payload
            } catch (error) {
              //nếu lỗi phát sinh trong quá trình verify thì mình tạo thành lỗi có status
              if (error instanceof JsonWebTokenError) {
                throw new ErrorWithStatus({
                  // vì cái lỗi (error)tự phát sinh chưa chắc chắn  có message nên ko dùng error.message được
                  message: USERS_MESSAGES.REFRESH_TOKEN_ISINVALID, // mình biết là lỗi gì nên định nghĩa lỗi luôn
                  //capitalize viết hoa chữ cái đầu
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }
              // (nếu lỗi ko phải dạng JsonWebTokenError)
              //nếu như mà ko phải lỗi của thằng verify -> chắc chắn là do lỗi của thẳng lỗi 2
              //-> ko cần xử lí mà throw quăng thẳng ra cho thằng validate bắt luôn
              // tại lỗi này do server tạo ra nên đã định nghĩa từ trước rồi
              // ko cần xử lí nữa nên cần quăng thẳng ra luôn
              // một phần tránh việc bị ghi đè bởi cái lỗi được set cái lỗi phái bên dưới
              throw error
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)
