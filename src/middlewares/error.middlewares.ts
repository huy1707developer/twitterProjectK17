import { NextFunction, Request, Response } from 'express'
import { omit } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus'

export const defaultErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  //lỗi từ các nơi sẽ dồn về đây
  res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json(omit(error, ['status']))
}

// nếu là lỗi ko xác định được thì là cố định lỗi 500
// HTTP_STATUS.INTERNAL_SERVER_ERROR = 500

//Kinh nghiệm xương máo của anh điệp
//lỗi từ các nơi đỗ về -> có khi sẽ ko có msg
//-> gửi msg thì sẽ ra (message: error.message) ->undefined (vì ko biết lỗi đó sẽ có gì)
//-> sử dụng lodash
