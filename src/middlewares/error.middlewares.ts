import { NextFunction, Request, Response } from 'express'
import { omit } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'

export const defaultErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  //lỗi từ các nơi sẽ dồn về đây
  //nơi tập kết lỗi từ mọi nơi hệ thống về
  // res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json(omit(error, ['status']))
  //thay thế bằng:
  if (error instanceof ErrorWithStatus) {
    return res.status(error.status).json(omit(error, ['status']))
  }
  //còn nếu code mà chạy xuống được đây thì error sẽ là 1 lỗi mặc định
  //err{message, stack, name}
  //stack chứa tất cả những thông tin về lỗi: tên lỗi lỗi gì lỗi xuất hiện dòng nào...
  //tại thằng này lỗi thì cái enumerable: false (bộ cờ) -> xử lí bằng cách đi qua từng thằng thì setting lại
  Object.getOwnPropertyNames(error).forEach((key) => {
    Object.defineProperty(error, key, { enumerable: true })
  })

  //ném lỗi đó cho người dùng
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    message: error.message,
    errorInfor: omit(error, ['stack'])
  })
}

// nếu là lỗi ko xác định được thì là cố định lỗi 500
// HTTP_STATUS.INTERNAL_SERVER_ERROR = 500

//Kinh nghiệm xương máo của anh điệp
//lỗi từ các nơi đỗ về -> có khi sẽ ko có msg
//-> gửi msg thì sẽ ra (message: error.message) ->undefined (vì ko biết lỗi đó sẽ có gì)
//-> sử dụng lodash
