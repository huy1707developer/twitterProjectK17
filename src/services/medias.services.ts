import { isProduction } from '~/constants/config'
import { Request } from 'express'
import { MediaType } from '~/constants/enums'
import { Media } from '~/models/Other'
import { handleUploadSingleImage, handleUploadVideo } from '~/utils/file'
import { config } from 'dotenv'
import { UPLOAD_IMAGE_DIR } from '~/constants/dir'
config() //để xài đc biến môi trường
class MediasService {
  async uploadVideo(req: Request) {
    const files = await handleUploadVideo(req)

    const result: Media[] = await Promise.all(
      files.map(async (video) => {
        const { newFilename } = video
        return {
          url: isProduction
            ? `${process.env.HOST}/static/video-stream/${newFilename}`
            : `http://localhost:${process.env.PORT}/static/video-stream/${newFilename}`,
          type: MediaType.Video
        }
      })
    )
    return result
  }
}

const mediasService = new MediasService()

export default mediasService
