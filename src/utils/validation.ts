import express from 'express'
import { body, validationResult, ValidationChain } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/src/middlewares/schema'
// can be reused by many routes

// sequential processing, stops running validations chain if the previous one fails.
export const validate = (validations: RunnableValidationChains<ValidationChain>) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    await validations.run(req)
    // tai chỉ có 1 đối tượng nên chỉ cần dùng 1 lệnh
    // còn ban đầu là demo theo 1 cái mảng nên mới dùng dòng for

    const errors = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }

    res.status(400).json({ errors: errors.mapped() })
    //mapped() trả về lỗi đẹp hơn thằng array()
    // nó tường minh và dễ nhìn hơn
  }
}
