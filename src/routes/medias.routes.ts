import { uploadImageController, uploadVideoController } from '~/controllers/medias.controllers'
import { Router } from 'express'
import { wrapAsync } from '~/utils/handlers'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'
const mediasRouter = Router()

mediasRouter.post('/upload-image', accessTokenValidator, verifiedUserValidator, wrapAsync(uploadImageController))

///--------------------------------------------Buôi 33-------------------------------------------
mediasRouter.post('/upload-video', accessTokenValidator, verifiedUserValidator, wrapAsync(uploadVideoController)) // uploadVideoController chưa làm

export default mediasRouter
