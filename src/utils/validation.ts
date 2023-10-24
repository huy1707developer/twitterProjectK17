import express from 'express'
import { body, validationResult, ValidationChain } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/src/middlewares/schema'
import { EntityError, ErrorWithStatus } from '~/models/Errors'
// can be reused by many routes

// sequential processing, stops running validations chain if the previous one fails.
export const validate = (validations: RunnableValidationChains<ValidationChain>) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    await validations.run(req)
    // tai chỉ có 1 đối tượng nên chỉ cần dùng 1 lệnh
    // còn ban đầu là demo theo 1 cái mảng nên mới dùng dòng for

    const errors = validationResult(req)
    //lấy lỗi ra từ request
    if (errors.isEmpty()) {
      return next()
    }
    const errorObject = errors.mapped()
    const entityError = new EntityError({ errors: {} })
    // xử lí errorObject
    for (const key in errorObject) {
      // lấy msg của từng cái lỗi
      const { msg } = errorObject[key]
      // nếu mà msg có dạng ErrorWithStatus và status  !== 422 thì ném cho
      // default error handler
      if (msg instanceof ErrorWithStatus && msg.status !== 422) {
        return next(msg)
        //nếu trong đống đó có lỗi khác 422 thì lập tức lụm lỗi đó
        // và ném ra cho thg error handler
      }

      //lưu các lỗi 422 từ errorObject vào entityError
      entityError.errors[key] = msg
    }
    //đưa cho thàng errordefaultHandler tổng hợp lỗi
    next(entityError)

    // res.status(422).json({ errors: errors.mapped() })

    //--------------------------------------
    // ở đ ây nó xử lí lỗi luôn chứ ko ném về error default handler (error tổng)
    //res.status(422).json({ errors: errors.mapped() })
    //mapped() trả về lỗi đẹp hơn thằng array()
    // nó tường minh và dễ nhìn hơn
  }
}
//// nhưng ở đây ta xài checkSchema,  checkSchema sẽ return ra RunnableValidationChains<ValidationChain>

// validate có tham số là gì?  -> là một checkSchema
// khi chạy validator có báo app lỗi ko ? -> ko báo lỗi mà nó kèm lỗi vào request
//
