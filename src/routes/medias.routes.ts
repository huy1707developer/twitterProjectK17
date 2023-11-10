import { uploadSingleImageController } from '~/controllers/medias.controllers'
import { Router } from 'express'
import { wrapAsync } from '~/utils/handlers'
const mediasRouter = Router()

mediasRouter.post('/upload-image', wrapAsync(uploadSingleImageController))

export default mediasRouter

//uploadSingleImageController chưa làm
